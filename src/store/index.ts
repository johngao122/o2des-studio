import { create } from "zustand";
import {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
} from "reactflow";
import { BaseNode, BaseEdge } from "../types/base";
import { nanoid } from "nanoid";
import superjson from "superjson";
import { CommandController } from "../controllers/CommandController";

const commandController = CommandController.getInstance();

interface StoreState {
    nodes: BaseNode[];
    edges: BaseEdge[];
    selectedElements: { nodes: string[]; edges: string[] };
    selectedProperties: {
        key: string;
        value: string | number;
        type: "string" | "number";
        editable: boolean;
    }[];
    viewportTransform: {
        x: number;
        y: number;
        zoom: number;
    };
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    getSerializedState: () => string;
    loadSerializedState: (serialized: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
    updateSelectedProperties: (
        properties: {
            key: string;
            value: string | number;
            type: "string" | "number";
            editable: boolean;
        }[]
    ) => void;
}

interface SerializedState {
    nodes: BaseNode[];
    edges: BaseEdge[];
}

export const useStore = create<StoreState>((set, get) => ({
    nodes: [],
    edges: [],
    selectedElements: { nodes: [], edges: [] },
    selectedProperties: [],
    viewportTransform: { x: 0, y: 0, zoom: 1 },

    onNodesChange: (changes: NodeChange[]) => {
        // First apply all changes
        const newNodes = applyNodeChanges(changes, get().nodes) as BaseNode[];

        // Get currently selected node if any
        const selectedNodeIds = get().selectedElements.nodes;
        const selectedNode =
            selectedNodeIds.length === 1
                ? newNodes.find((n) => n.id === selectedNodeIds[0])
                : null;

        // Update properties if we have a selected node
        const updatedProperties = selectedNode
            ? [
                  {
                      key: "id",
                      value: selectedNode.id,
                      type: "string" as const,
                      editable: false,
                  },
                  {
                      key: "type",
                      value: selectedNode.type,
                      type: "string" as const,
                      editable: false,
                  },
                  {
                      key: "x",
                      value: selectedNode.position.x,
                      type: "number" as const,
                      editable: false,
                  },
                  {
                      key: "y",
                      value: selectedNode.position.y,
                      type: "number" as const,
                      editable: false,
                  },
                  ...Object.entries(selectedNode.data)
                      .filter(([key]) => key !== "updateNodeData")
                      .map(([key, value]) => ({
                          key,
                          value: value as string | number,
                          type:
                              typeof value === "number"
                                  ? ("number" as const)
                                  : ("string" as const),
                          editable: true,
                      })),
              ]
            : [];

        // Handle selection changes
        const selectionChanges = changes.filter(
            (change) => change.type === "select"
        );
        if (selectionChanges.length > 0) {
            const newSelectedIds = newNodes
                .filter((n) => n.selected)
                .map((n) => n.id);
            set({
                nodes: newNodes,
                selectedElements: {
                    ...get().selectedElements,
                    nodes: newSelectedIds,
                },
                selectedProperties: updatedProperties,
            });
            return;
        }

        // Handle position changes
        const positionChanges = changes.filter(
            (change: NodeChange) =>
                change.type === "position" &&
                get().nodes.some((n) => n.id === change.id)
        );

        if (positionChanges.length > 0) {
            const command =
                commandController.createNodesChangeCommand(positionChanges);
            if (command) {
                commandController.execute(command);
            }
            // Update state with new positions and properties
            set({
                nodes: newNodes,
                selectedProperties: updatedProperties,
            });
            return;
        }

        // Handle any other changes
        set({
            nodes: newNodes,
            selectedProperties: updatedProperties,
        });
    },

    onEdgesChange: (changes: EdgeChange[]) => {
        const selectionChanges = changes.filter(
            (change) => change.type === "select"
        );
        if (selectionChanges.length > 0) {
            const newEdges = applyEdgeChanges(
                selectionChanges,
                get().edges
            ) as BaseEdge[];

            const selectedEdgeIds = newEdges
                .filter((e) => e.selected)
                .map((e) => e.id);
            const selectedEdge =
                selectedEdgeIds.length === 1
                    ? get().edges.find((e) => e.id === selectedEdgeIds[0])
                    : null;

            set({
                edges: newEdges,
                selectedElements: {
                    ...get().selectedElements,
                    edges: selectedEdgeIds,
                },
                selectedProperties: selectedEdge
                    ? [
                          {
                              key: "id",
                              value: selectedEdge.id,
                              type: "string",
                              editable: false,
                          },
                          {
                              key: "source",
                              value: selectedEdge.source,
                              type: "string",
                              editable: false,
                          },
                          {
                              key: "sourceHandle",
                              value: selectedEdge.sourceHandle || "",
                              type: "string",
                              editable: false,
                          },
                          {
                              key: "target",
                              value: selectedEdge.target,
                              type: "string",
                              editable: false,
                          },
                          {
                              key: "targetHandle",
                              value: selectedEdge.targetHandle || "",
                              type: "string",
                              editable: false,
                          },
                          ...Object.entries(selectedEdge)
                              .filter(
                                  ([key]) =>
                                      ![
                                          "id",
                                          "source",
                                          "sourceHandle",
                                          "target",
                                          "targetHandle",
                                          "selected",
                                      ].includes(key)
                              )
                              .map(([key, value]) => ({
                                  key,
                                  value: value as string | number,
                                  type:
                                      typeof value === "number"
                                          ? ("number" as const)
                                          : ("string" as const),
                                  editable: true,
                              })),
                      ]
                    : [],
            });
        }

        const command = commandController.createEdgesChangeCommand(changes);
        if (command) {
            commandController.execute(command);
        }
    },

    onConnect: (connection: Connection) => {
        if (!connection.source || !connection.target) return;
        const command = commandController.createConnectCommand(connection);
        commandController.execute(command);
    },

    getSerializedState: () => {
        const { nodes, edges } = get();
        return superjson.stringify({ nodes, edges });
    },

    loadSerializedState: (serialized: string) => {
        const state = superjson.parse<SerializedState>(serialized);
        set({ nodes: state.nodes, edges: state.edges });
    },

    undo: () => {
        commandController.undo();
    },

    redo: () => {
        commandController.redo();
    },

    canUndo: () => {
        return commandController.canUndo();
    },

    canRedo: () => {
        return commandController.canRedo();
    },

    updateSelectedProperties: (properties) => {
        set({ selectedProperties: properties });

        const editableProperties = properties.filter((p) => p.editable);

        const { selectedElements, nodes, edges } = get();

        if (selectedElements.nodes.length === 1) {
            const nodeId = selectedElements.nodes[0];
            const node = nodes.find((n) => n.id === nodeId);
            if (node) {
                const newData = editableProperties.reduce(
                    (acc, prop) => ({
                        ...acc,
                        [prop.key]: prop.value,
                    }),
                    {}
                );

                const command = commandController.createUpdateNodeCommand(
                    nodeId,
                    {
                        data: { ...node.data, ...newData },
                    }
                );
                commandController.execute(command);
            }
        } else if (selectedElements.edges.length === 1) {
            const edgeId = selectedElements.edges[0];
            const edge = edges.find((e) => e.id === edgeId);
            if (edge) {
                const newProps = editableProperties.reduce(
                    (acc, prop) => ({
                        ...acc,
                        [prop.key]: prop.value,
                    }),
                    {}
                );

                const command = commandController.createEdgesChangeCommand([
                    {
                        id: edgeId,
                        type: "select",
                        selected: true,
                        ...newProps,
                    },
                ]);
                if (command) commandController.execute(command);
            }
        }
    },
}));
