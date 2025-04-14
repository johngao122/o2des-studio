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
import { SerializationService } from "../services/SerializationService";

const commandController = CommandController.getInstance();
const serializationService = new SerializationService();

interface ProjectMetadata {
    version: string;
    created: string;
    modified: string;
    projectName: string;
    description?: string;
    author?: string;
    tags?: string[];
}

interface StoreState {
    projectName: string;
    nodes: BaseNode[];
    edges: BaseEdge[];
    metadata: ProjectMetadata;
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
    updateProjectName: (name: string) => void;
    updateMetadata: (metadata: Partial<ProjectMetadata>) => void;
}

interface SerializedState {
    projectName: string;
    nodes: BaseNode[];
    edges: BaseEdge[];
    metadata: ProjectMetadata;
}

const createDefaultMetadata = (): ProjectMetadata => {
    const now = new Date().toISOString();
    return {
        version: "1.0.0",
        created: now,
        modified: now,
        projectName: "Untitled Project",
        description: "",
        author: "",
        tags: [],
    };
};

export const useStore = create<StoreState>((set, get) => ({
    projectName: "Untitled Project",
    nodes: [],
    edges: [],
    metadata: createDefaultMetadata(),
    selectedElements: { nodes: [], edges: [] },
    selectedProperties: [],
    viewportTransform: { x: 0, y: 0, zoom: 1 },

    onNodesChange: (changes: NodeChange[]) => {
        const newNodes = applyNodeChanges(changes, get().nodes) as BaseNode[];

        const selectedNodeIds = get().selectedElements.nodes;
        const selectedNode =
            selectedNodeIds.length === 1
                ? newNodes.find((n) => n.id === selectedNodeIds[0])
                : null;

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

            set({
                nodes: newNodes,
                selectedProperties: updatedProperties,
            });

            const now = new Date().toISOString();
            set((state) => ({
                metadata: { ...state.metadata, modified: now },
            }));

            return;
        }

        set({
            nodes: newNodes,
            selectedProperties: updatedProperties,
        });

        const now = new Date().toISOString();
        set((state) => ({
            metadata: { ...state.metadata, modified: now },
        }));
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
        const { nodes, edges, projectName, metadata } = get();

        const serializedModel = serializationService.serializeModel(
            nodes,
            edges,
            projectName,
            metadata
        );

        return superjson.stringify(serializedModel);
    },

    loadSerializedState: (serialized: string) => {
        if (!serialized || typeof serialized !== "string") {
            throw new Error("Invalid serialized data: empty or not a string");
        }

        let parsed: SerializedState;

        try {
            parsed = superjson.parse<SerializedState>(serialized);
        } catch (parseError) {
            console.error(
                "SuperJSON parsing error:",
                parseError instanceof Error
                    ? parseError.message
                    : "Unknown parse error"
            );

            throw new Error(
                "Failed to parse project: Invalid format or structure"
            );
        }

        if (!parsed || typeof parsed !== "object") {
            throw new Error(
                "Invalid project format: Not a valid project object"
            );
        }

        if (!Array.isArray(parsed.nodes)) {
            throw new Error("Invalid project format: Missing nodes array");
        }

        if (!Array.isArray(parsed.edges)) {
            throw new Error("Invalid project format: Missing edges array");
        }

        if (!parsed.metadata || typeof parsed.metadata !== "object") {
            console.warn(
                "Missing or invalid metadata, creating default metadata"
            );
            parsed.metadata = createDefaultMetadata();
        }

        try {
            const { nodes, edges, projectName, metadata } =
                serializationService.deserializeModel(parsed);

            const updatedMetadata = {
                ...metadata,
                modified: new Date().toISOString(),
            };

            set({
                nodes,
                edges,
                projectName: projectName || "Untitled Project",
                metadata: updatedMetadata,
            });
        } catch (deserializeError) {
            console.error(
                "Deserialization error:",
                deserializeError instanceof Error
                    ? deserializeError.message
                    : "Unknown deserialization error"
            );

            throw new Error(
                "Failed to load project: Unable to process project structure"
            );
        }
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

    updateProjectName: (name: string) => {
        set({
            projectName: name,
            metadata: {
                ...get().metadata,
                projectName: name,
                modified: new Date().toISOString(),
            },
        });
    },

    updateMetadata: (metadata: Partial<ProjectMetadata>) => {
        set((state) => ({
            metadata: {
                ...state.metadata,
                ...metadata,
                modified: new Date().toISOString(),
            },
        }));
    },
}));
