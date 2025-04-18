import { create } from "zustand";
import {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    NodePositionChange,
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

// Define a type for the properties array
type SelectedProperty = {
    key: string;
    value: string | number;
    type: "string" | "number";
    editable: boolean;
    isTextArea?: boolean; // Optional for text area
};

interface StoreState {
    projectName: string;
    nodes: BaseNode[];
    edges: BaseEdge[];
    metadata: ProjectMetadata;
    selectedElements: { nodes: string[]; edges: string[] };
    selectedProperties: SelectedProperty[]; // Use the defined type
    selectionInfo?: {
        nodes: number;
        edges: number;
    };
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
    updateSelectedProperties: (properties: SelectedProperty[]) => void;
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
    selectionInfo: undefined,
    viewportTransform: { x: 0, y: 0, zoom: 1 },

    onNodesChange: (changes: NodeChange[]) => {
        const nodesBeforeChange = get().nodes;
        // Still calculate the potential outcome of all changes
        const newNodesPotentially = applyNodeChanges(
            changes,
            nodesBeforeChange
        ) as BaseNode[];

        // Separate changes
        const selectionChanges = changes.filter((c) => c.type === "select");
        const positionChanges = changes.filter(
            (c): c is NodePositionChange => c.type === "position"
        );
        const otherChanges = changes.filter(
            (c) => c.type !== "select" && c.type !== "position"
        );

        // --- Handle Selection Changes ---
        if (selectionChanges.length > 0) {
            // Apply selection changes and update state immediately
            const nodesWithSelectionApplied = applyNodeChanges(
                selectionChanges,
                nodesBeforeChange
            ) as BaseNode[];
            // ... (logic to update selectedElements, selectedProperties, selectionInfo) ...
            // [No change here, selection updates were already immediate]
            const selectedNodeIds = nodesWithSelectionApplied
                .filter((n) => n.selected)
                .map((n) => n.id);
            const selectedEdgeIds = get().selectedElements.edges;
            const multipleNodesSelected = selectedNodeIds.length > 1;
            const multipleEdgesSelected = selectedEdgeIds.length > 1;
            const mixedSelection =
                selectedNodeIds.length > 0 && selectedEdgeIds.length > 0;
            let updatedProperties: SelectedProperty[] = [];
            const selectionInfo = {
                nodes: selectedNodeIds.length,
                edges: selectedEdgeIds.length,
            };
            if (selectedNodeIds.length === 1 && selectedEdgeIds.length === 0) {
                const selectedNode = nodesWithSelectionApplied.find(
                    (n) => n.id === selectedNodeIds[0]
                );
                if (selectedNode) {
                    updatedProperties = [
                        /* ... generate properties ... */
                    ] as SelectedProperty[];
                }
            }
            set({
                nodes: nodesWithSelectionApplied,
                selectedElements: {
                    nodes: selectedNodeIds,
                    edges: selectedEdgeIds,
                },
                selectedProperties: updatedProperties,
                selectionInfo:
                    multipleNodesSelected ||
                    multipleEdgesSelected ||
                    mixedSelection
                        ? selectionInfo
                        : undefined,
            });
            return; // Stop processing
        }

        // --- Handle Position Changes (Drag) ---
        if (positionChanges.length > 0) {
            // Apply position changes to get the latest node positions
            const nodesAfterPositionChanges = applyNodeChanges(
                positionChanges,
                nodesBeforeChange
            ) as BaseNode[];

            // *** IMPORTANT: Update nodes state for ALL position changes (visual drag) ***
            set({ nodes: nodesAfterPositionChanges });

            // Check if any drag operation ended in this batch
            const dragEnded = positionChanges.some(
                (change) => change.dragging === false
            );

            if (dragEnded) {
                // --- Drag ENDED ---
                // State is already updated visually above

                // 1. Create and execute the command for undo/redo
                const command =
                    commandController.createNodesChangeCommand(positionChanges);
                if (command) {
                    commandController.execute(command);
                }

                // 2. Update properties bar with FINAL position
                const selectedNodeIds = get().selectedElements.nodes;
                if (selectedNodeIds.length === 1) {
                    const selectedNode = nodesAfterPositionChanges.find(
                        (n) => n.id === selectedNodeIds[0]
                    );
                    if (selectedNode) {
                        // Regenerate properties fully now that drag is done
                        const finalProperties: SelectedProperty[] = [
                            {
                                key: "id",
                                value: selectedNode.id,
                                type: "string",
                                editable: false,
                            },
                            {
                                key: "name",
                                value: selectedNode.name || selectedNode.id,
                                type: "string",
                                editable: true,
                            },
                            {
                                key: "type",
                                value: selectedNode.type,
                                type: "string",
                                editable: false,
                            },
                            {
                                key: "graphType",
                                value: selectedNode.graphType || "",
                                type: "string",
                                editable: false,
                            },
                            {
                                key: "x",
                                value: selectedNode.position.x,
                                type: "number",
                                editable: false,
                            },
                            {
                                key: "y",
                                value: selectedNode.position.y,
                                type: "number",
                                editable: false,
                            },
                            ...Object.entries(selectedNode.data)
                                .filter(([key]) => key !== "updateNodeData")
                                .map(([key, value]) => ({
                                    key,
                                    value: value as string | number,
                                    type: (typeof value === "number"
                                        ? "number"
                                        : "string") as "number" | "string",
                                    editable: true,
                                    isTextArea:
                                        key === "initializations" ||
                                        (Array.isArray(value) &&
                                            value.join().length > 50),
                                })),
                        ];
                        set({ selectedProperties: finalProperties }); // Update properties ONLY on drag end
                    }
                }

                // 3. Autosave
                const now = new Date().toISOString();
                set((state) => ({
                    metadata: { ...state.metadata, modified: now },
                }));
            } else {
                // --- ONGOING Drag ---
                // Nodes state is updated above for visuals.
                // **DO NOT** update selectedProperties here to improve performance.
                // The properties bar will lag during drag but update on drop.
            }
            return; // Stop processing
        }

        // --- Handle Other Changes ---
        if (otherChanges.length > 0) {
            const finalNodes = applyNodeChanges(
                otherChanges,
                nodesBeforeChange
            ) as BaseNode[];
            set({ nodes: finalNodes }); // Apply the changes visually
            // Potentially create commands
            const now = new Date().toISOString();
            set((state) => ({
                metadata: { ...state.metadata, modified: now },
            }));
        }
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

            const selectedNodeIds = get().selectedElements.nodes;
            const multipleNodesSelected = selectedNodeIds.length > 1;
            const multipleEdgesSelected = selectedEdgeIds.length > 1;
            const mixedSelection =
                selectedNodeIds.length > 0 && selectedEdgeIds.length > 0;

            let updatedProperties: SelectedProperty[] = [];
            const selectionInfo = {
                nodes: selectedNodeIds.length,
                edges: selectedEdgeIds.length,
            };

            if (selectedEdgeIds.length === 1 && selectedNodeIds.length === 0) {
                const selectedEdge = get().edges.find(
                    (e) => e.id === selectedEdgeIds[0]
                );
                if (selectedEdge) {
                    // Create explicit properties first
                    const explicitProps = [
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
                        {
                            key: "type",
                            value: selectedEdge.type || "",
                            type: "string",
                            editable: false,
                        },
                        {
                            key: "graphType",
                            value: selectedEdge.graphType || "",
                            type: "string",
                            editable: false,
                        },
                    ] as SelectedProperty[];

                    // List of keys we've already added explicitly
                    const excludedKeys = [
                        "id",
                        "source",
                        "sourceHandle",
                        "target",
                        "targetHandle",
                        "selected",
                        "type",
                        "graphType",
                    ];

                    // Add data properties if they exist
                    if (selectedEdge.data) {
                        const dataProps = Object.entries(selectedEdge.data).map(
                            ([key, value]) => ({
                                key,
                                value: value as string | number,
                                type: (typeof value === "number"
                                    ? "number"
                                    : "string") as "number" | "string",
                                editable: true,
                            })
                        );

                        updatedProperties = [...explicitProps, ...dataProps];
                    } else {
                        updatedProperties = explicitProps;
                    }
                }
            }

            set({
                edges: newEdges,
                selectedElements: {
                    nodes: selectedNodeIds,
                    edges: selectedEdgeIds,
                },
                selectedProperties: updatedProperties,
                selectionInfo:
                    multipleNodesSelected ||
                    multipleEdgesSelected ||
                    mixedSelection
                        ? selectionInfo
                        : undefined,
            });
            return;
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

    updateSelectedProperties: (properties: SelectedProperty[]) => {
        set({ selectedProperties: properties });

        const editableProperties = properties.filter((p) => p.editable);

        const { selectedElements, nodes, edges } = get();

        if (selectedElements.nodes.length === 1) {
            const nodeId = selectedElements.nodes[0];
            const node = nodes.find((n) => n.id === nodeId);
            if (node) {
                const newData = editableProperties.reduce((acc, prop) => {
                    if (prop.key === "name") {
                        return acc;
                    }
                    return {
                        ...acc,
                        [prop.key]:
                            prop.key === "initializations" &&
                            typeof prop.value === "string"
                                ? prop.value
                                      .split("\n")
                                      .filter((line) => line.trim() !== "")
                                : prop.value,
                    };
                }, {});

                const nameProperty = editableProperties.find(
                    (p) => p.key === "name"
                );
                const updateData: any = { data: { ...node.data, ...newData } };

                if (nameProperty) {
                    updateData.name = nameProperty.value as string;
                }

                const command = commandController.createUpdateNodeCommand(
                    nodeId,
                    updateData
                );
                commandController.execute(command);
            }
        } else if (selectedElements.edges.length === 1) {
            const edgeId = selectedElements.edges[0];
            const edge = edges.find((e) => e.id === edgeId);
            if (edge) {
                const newData = editableProperties.reduce((acc, prop) => {
                    return {
                        ...acc,
                        [prop.key]: prop.value,
                    };
                }, {});

                const command = commandController.createUpdateEdgeCommand(
                    edgeId,
                    { data: { ...edge.data, ...newData } }
                );
                commandController.execute(command);
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
