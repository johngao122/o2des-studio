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
    MarkerType,
} from "reactflow";
import { BaseNode, BaseEdge } from "../types/base";
import { nanoid } from "nanoid";
import superjson from "superjson";
import { CommandController } from "@/controllers/CommandController";
import { SerializationService } from "../services/SerializationService";
import { nodeTypes } from "@/components/nodes";
import {
    BoundingBox,
    Position,
    getBoundingBoxCenter,
    getBoundingBoxFromPositions,
} from "@/lib/utils/coordinates";
import { GRID_SIZE } from "@/lib/utils/math";
import { AutosaveService } from "../services/AutosaveService";
import { GraphValidationService } from "../services/GraphValidationService";
import { ValidationError, ModelValidationState } from "../types/validation";
import { getArrowheadColor } from "@/lib/utils/edgeUtils";

const commandController = CommandController.getInstance();
const serializationService = new SerializationService();
const autosaveService = AutosaveService.getInstance();
const graphValidationService = GraphValidationService.getInstance();

const DRAG_PROXY_THRESHOLD = 3;
const EMPTY_VALIDATION_ERRORS: ValidationError[] = [];

const buildValidationErrorMap = (
    errors: ValidationError[]
): Record<string, ValidationError[]> => {
    return errors.reduce<Record<string, ValidationError[]>>((acc, error) => {
        if (!acc[error.elementId]) {
            acc[error.elementId] = [];
        }

        acc[error.elementId].push(error);
        return acc;
    }, {});
};

const logValidationErrors = (context: string, errors: ValidationError[]) => {
    if (!errors || errors.length === 0) {
        console.info(`[Validation] ${context}: no errors`);
        return;
    }

    const counts = errors.reduce<
        Partial<Record<ValidationError["errorType"], number>>
    >((acc, error) => {
        acc[error.errorType] = (acc[error.errorType] ?? 0) + 1;
        return acc;
    }, {});

    console.info(
        `[Validation] ${context}: ${errors.length} error(s) detected`,
        counts
    );
};

interface DragProxyState {
    isActive: boolean;
    startPosition: Position | null;
    currentPosition: Position | null;
    nodesSnapshot: BaseNode[] | null;
    edgesSnapshot: BaseEdge[] | null;
    boundingBox: BoundingBox | null;
    centerOffset: Position | null;
}

interface ProjectMetadata {
    version: string;
    created: string;
    modified: string;
    projectName: string;
    description?: string;
    author?: string;
    tags?: string[];
}

type SelectedProperty = {
    key: string;
    value: string | number | boolean;
    type: "string" | "number" | "boolean";
    editable: boolean;
    isTextArea?: boolean;
    options?: string[];
};

export interface StoreState {
    projectName: string;
    nodes: BaseNode[];
    edges: BaseEdge[];
    metadata: ProjectMetadata;
    selectedElements: { nodes: string[]; edges: string[] };
    selectedProperties: SelectedProperty[];
    selectionInfo?: {
        nodes: number;
        edges: number;
    };
    viewportTransform: {
        x: number;
        y: number;
        zoom: number;
    };
    dragProxy: DragProxyState;
    clipboard: {
        nodes: BaseNode[];
        edges: BaseEdge[];
    };
    validation: ModelValidationState;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    getSerializedState: () => string;
    loadSerializedState: (serialized: string) => void;
    newProject: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
    updateSelectedProperties: (properties: SelectedProperty[]) => void;
    updateProjectName: (name: string) => void;
    updateMetadata: (metadata: Partial<ProjectMetadata>) => void;
    refreshEdgeMarkerColors: () => void;
    startDragProxy: (nodes: BaseNode[], edges: BaseEdge[]) => void;
    updateDragProxy: (
        position: { x: number; y: number },
        zoom?: number
    ) => void;
    endDragProxy: (applyChanges: boolean) => void;
    copySelectedElements: () => void;
    pasteElements: () => void;
    validateModel: () => void;
    validateElement: (elementId: string) => void;
    clearValidationErrors: () => void;
    getValidationErrors: (elementId?: string) => ValidationError[];
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
    dragProxy: {
        isActive: false,
        startPosition: null,
        currentPosition: null,
        nodesSnapshot: null,
        edgesSnapshot: null,
        boundingBox: null,
        centerOffset: null,
    },
    clipboard: {
        nodes: [],
        edges: [],
    },
    validation: {
        errors: [],
        errorMap: {},
        lastValidated: null,
        isValidating: false,
    },

    onNodesChange: (changes: NodeChange[]) => {
        const nodesBeforeChange = get().nodes;
        const newNodesPotentially = applyNodeChanges(
            changes,
            nodesBeforeChange
        ) as BaseNode[];

        const selectionChanges = changes.filter((c) => c.type === "select");
        const positionChanges = changes.filter(
            (c): c is NodePositionChange => c.type === "position"
        );
        const otherChanges = changes.filter(
            (c) => c.type !== "select" && c.type !== "position"
        );

        if (selectionChanges.length > 0) {
            const nodesWithSelectionApplied = applyNodeChanges(
                selectionChanges,
                nodesBeforeChange
            ) as BaseNode[];
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
                    updatedProperties = [] as SelectedProperty[];
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
            return;
        }

        if (positionChanges.length > 0) {
            const nodeIds = positionChanges.map((change) => change.id);
            commandController.captureOriginalPositions(nodeIds);

            const nodesAfterPositionChanges = applyNodeChanges(
                positionChanges,
                nodesBeforeChange
            ) as BaseNode[];

            set({ nodes: nodesAfterPositionChanges });

            const dragEnded = positionChanges.some(
                (change) => change.dragging === false
            );

            if (dragEnded) {
                const command = commandController.createNodesChangeCommand(
                    positionChanges,
                    nodesBeforeChange
                );

                if (command) {
                    commandController.execute(command);
                }

                const selectedNodeIds = get().selectedElements.nodes;
                if (selectedNodeIds.length === 1) {
                    const selectedNode = nodesAfterPositionChanges.find(
                        (n) => n.id === selectedNodeIds[0]
                    );
                    if (selectedNode) {
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
                                .filter(([key]) => {
                                    if (key === "updateNodeData") return false;

                                    const nodeComponent =
                                        nodeTypes[
                                            selectedNode.type as keyof typeof nodeTypes
                                        ];
                                    if (
                                        nodeComponent &&
                                        (nodeComponent as any).hiddenProperties
                                    ) {
                                        return !(
                                            nodeComponent as any
                                        ).hiddenProperties.includes(key);
                                    }

                                    return true;
                                })
                                .map(([key, value]) => ({
                                    key,
                                    value: value as string | number,
                                    type: (typeof value === "number"
                                        ? "number"
                                        : "string") as "number" | "string",
                                    editable: true,
                                    isTextArea:
                                        key === "initializations" ||
                                        key === "stateUpdate" ||
                                        (Array.isArray(value) &&
                                            value.join().length > 50),
                                })),
                        ];
                        set({ selectedProperties: finalProperties });
                    }
                }

                const now = new Date().toISOString();
                set((state) => ({
                    metadata: { ...state.metadata, modified: now },
                }));
            } else {
            }
            return;
        }

        if (otherChanges.length > 0) {
            const finalNodes = applyNodeChanges(
                otherChanges,
                nodesBeforeChange
            ) as BaseNode[];

            const removeChanges = otherChanges.filter(
                (change) => change.type === "remove"
            );

            if (removeChanges.length > 0) {
                const nodeIdsToDelete = removeChanges.map(
                    (change) => change.id
                );
                commandController.handleCoordinatedDeletion(
                    nodeIdsToDelete,
                    []
                );

                const currentSelectedNodeIds = get().selectedElements.nodes;
                const removedSelectedNodeIds = nodeIdsToDelete.filter((id) =>
                    currentSelectedNodeIds.includes(id)
                );

                if (removedSelectedNodeIds.length > 0) {
                    const remainingSelectedNodeIds =
                        currentSelectedNodeIds.filter(
                            (id) => !removedSelectedNodeIds.includes(id)
                        );

                    set({
                        selectedElements: {
                            ...get().selectedElements,
                            nodes: remainingSelectedNodeIds,
                        },
                        selectedProperties:
                            remainingSelectedNodeIds.length === 0
                                ? []
                                : get().selectedProperties,
                        selectionInfo:
                            remainingSelectedNodeIds.length === 0 &&
                            get().selectedElements.edges.length === 0
                                ? undefined
                                : get().selectionInfo,
                    });
                }

                return;
            }

            set({ nodes: finalNodes });

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
                    if (
                        selectedEdge.data?.arrowheadStyle &&
                        !selectedEdge.markerEnd
                    ) {
                        const arrowheadStyle = selectedEdge.data.arrowheadStyle;
                        const markerEnd =
                            arrowheadStyle === "filled"
                                ? {
                                      type: MarkerType.ArrowClosed,
                                      color: "#ffffff",
                                      width: 25,
                                      height: 25,
                                  }
                                : arrowheadStyle === "open"
                                ? {
                                      type: MarkerType.Arrow,
                                      color: "#ffffff",
                                      width: 25,
                                      height: 25,
                                  }
                                : undefined;

                        const { edges } = get();
                        const updatedEdges = edges.map((e) =>
                            e.id === selectedEdge.id ? { ...e, markerEnd } : e
                        );
                        set({ edges: updatedEdges });
                    }
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

                    if (selectedEdge.data) {
                        const dataProps = Object.entries(selectedEdge.data)
                            .filter(([key]) => {
                                if (
                                    selectedEdge.type === "rcq" &&
                                    (key === "controlPoint1" ||
                                        key === "controlPoint2" ||
                                        key === "controlPoint3" ||
                                        key === "controlPoints" ||
                                        key === "conditionLabelOffset")
                                ) {
                                    return false;
                                }
                                if (
                                    selectedEdge.type === "initialization" &&
                                    (key === "delayPosition" ||
                                        key === "delayLabelOffset" ||
                                        key === "controlPoints" ||
                                        key === "parameter")
                                ) {
                                    return false;
                                }
                                if (
                                    selectedEdge.type === "eventGraph" &&
                                    (key === "conditionPosition" ||
                                        key === "delayPosition" ||
                                        key === "parameterPosition" ||
                                        key === "conditionLabelOffset" ||
                                        key === "delayLabelOffset" ||
                                        key === "parameterLabelOffset" ||
                                        key === "controlPoints")
                                ) {
                                    return false;
                                }
                                return true;
                            })
                            .map(([key, value]) => {
                                if (key === "edgeType") {
                                    return {
                                        key: "edgeType",
                                        value: value as string,
                                        type: "string" as const,
                                        editable: true,
                                        options: ["straight", "rounded"],
                                    };
                                }
                                if (key === "edgeRoutingType") {
                                    return {
                                        key: "edgeRoutingType",
                                        value: value as string,
                                        type: "string" as const,
                                        editable: true,
                                        options: [
                                            "orthogonal",
                                            "straight",
                                            "bezier",
                                        ],
                                    };
                                }
                                if (key === "arrowheadStyle") {
                                    return {
                                        key: "arrowheadStyle",
                                        value: value as string,
                                        type: "string" as const,
                                        editable: true,
                                        options: ["filled", "open"],
                                    };
                                }
                                return {
                                    key,
                                    value: value as string | number | boolean,
                                    type: (typeof value === "number"
                                        ? "number"
                                        : typeof value === "boolean"
                                        ? "boolean"
                                        : "string") as
                                        | "number"
                                        | "string"
                                        | "boolean",
                                    editable: true,
                                };
                            });

                        if (
                            selectedEdge.type === "rcq" &&
                            !selectedEdge.data.edgeType
                        ) {
                            dataProps.push({
                                key: "edgeType",
                                value: "straight",
                                type: "string" as const,
                                editable: true,
                                options: ["straight", "rounded"],
                            });
                        }

                        if (!selectedEdge.data.edgeRoutingType) {
                            dataProps.push({
                                key: "edgeRoutingType",
                                value: "orthogonal",
                                type: "string" as const,
                                editable: true,
                                options: ["orthogonal", "straight", "bezier"],
                            });
                        }

                        if (!selectedEdge.data.arrowheadStyle) {
                            dataProps.push({
                                key: "arrowheadStyle",
                                value: "filled",
                                type: "string" as const,
                                editable: true,
                                options: ["filled", "open"],
                            });
                        }

                        if (
                            selectedEdge.type === "rcq" &&
                            !selectedEdge.data.condition
                        ) {
                            dataProps.push({
                                key: "condition",
                                value: "True",
                                type: "string" as const,
                                editable: true,
                            });
                        }

                        if (
                            selectedEdge.type === "rcq" &&
                            selectedEdge.data.isDependency === undefined
                        ) {
                            dataProps.push({
                                key: "isDependency",
                                value: false,
                                type: "boolean" as const,
                                editable: true,
                            });
                        }

                        if (selectedEdge.type === "eventGraph") {
                            if (!dataProps.find((p) => p.key === "condition")) {
                                dataProps.push({
                                    key: "condition",
                                    value:
                                        selectedEdge.data.condition || "True",
                                    type: "string" as const,
                                    editable: true,
                                });
                            }
                            if (!dataProps.find((p) => p.key === "delay")) {
                                dataProps.push({
                                    key: "delay",
                                    value: selectedEdge.data.delay || "",
                                    type: "string" as const,
                                    editable: true,
                                });
                            }
                            if (!dataProps.find((p) => p.key === "parameter")) {
                                dataProps.push({
                                    key: "parameter",
                                    value: selectedEdge.data.parameter || "",
                                    type: "string" as const,
                                    editable: true,
                                });
                            }
                        } else if (selectedEdge.type === "initialization") {
                            if (
                                !dataProps.find((p) => p.key === "initialDelay")
                            ) {
                                dataProps.push({
                                    key: "initialDelay",
                                    value:
                                        selectedEdge.data.initialDelay || "0",
                                    type: "string" as const,
                                    editable: true,
                                });
                            }
                        }

                        updatedProperties = [
                            ...explicitProps,
                            ...dataProps,
                        ] as SelectedProperty[];
                    } else {
                        if (selectedEdge.type === "rcq") {
                            updatedProperties = [
                                ...explicitProps,
                                {
                                    key: "edgeType",
                                    value: "straight",
                                    type: "string" as const,
                                    editable: true,
                                    options: ["straight", "rounded"],
                                },
                                {
                                    key: "edgeRoutingType",
                                    value: "orthogonal",
                                    type: "string" as const,
                                    editable: true,
                                    options: [
                                        "orthogonal",
                                        "straight",
                                        "bezier",
                                    ],
                                },
                                {
                                    key: "condition",
                                    value: "True",
                                    type: "string" as const,
                                    editable: true,
                                },
                                {
                                    key: "isDependency",
                                    value: false,
                                    type: "boolean" as const,
                                    editable: true,
                                },
                            ] as SelectedProperty[];
                        } else if (selectedEdge.type === "eventGraph") {
                            updatedProperties = [
                                ...explicitProps,
                                {
                                    key: "edgeType",
                                    value: "straight",
                                    type: "string" as const,
                                    editable: true,
                                    options: ["straight", "rounded"],
                                },
                                {
                                    key: "edgeRoutingType",
                                    value: "orthogonal",
                                    type: "string" as const,
                                    editable: true,
                                    options: [
                                        "orthogonal",
                                        "straight",
                                        "bezier",
                                    ],
                                },
                                {
                                    key: "condition",
                                    value: "True",
                                    type: "string" as const,
                                    editable: true,
                                },
                                {
                                    key: "delay",
                                    value: "",
                                    type: "string" as const,
                                    editable: true,
                                },
                                {
                                    key: "parameter",
                                    value: "",
                                    type: "string" as const,
                                    editable: true,
                                },
                            ] as SelectedProperty[];
                        } else if (selectedEdge.type === "initialization") {
                            updatedProperties = [
                                ...explicitProps,
                                {
                                    key: "edgeType",
                                    value: "straight",
                                    type: "string" as const,
                                    editable: true,
                                    options: ["straight", "rounded"],
                                },
                                {
                                    key: "edgeRoutingType",
                                    value: "orthogonal",
                                    type: "string" as const,
                                    editable: true,
                                    options: [
                                        "orthogonal",
                                        "straight",
                                        "bezier",
                                    ],
                                },
                                {
                                    key: "initialDelay",
                                    value: "0",
                                    type: "string" as const,
                                    editable: true,
                                },
                            ] as SelectedProperty[];
                        } else {
                            updatedProperties = explicitProps;
                        }
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

        const removeChanges = changes.filter(
            (change) => change.type === "remove"
        );
        if (removeChanges.length > 0) {
            const edgeIdsToDelete = removeChanges.map((change) => change.id);
            commandController.handleCoordinatedDeletion([], edgeIdsToDelete);

            const currentSelectedEdgeIds = get().selectedElements.edges;
            const removedSelectedEdgeIds = edgeIdsToDelete.filter((id) =>
                currentSelectedEdgeIds.includes(id)
            );

            if (removedSelectedEdgeIds.length > 0) {
                const remainingSelectedEdgeIds = currentSelectedEdgeIds.filter(
                    (id) => !removedSelectedEdgeIds.includes(id)
                );

                set({
                    selectedElements: {
                        ...get().selectedElements,
                        edges: remainingSelectedEdgeIds,
                    },
                    selectedProperties:
                        remainingSelectedEdgeIds.length === 0 &&
                        get().selectedElements.nodes.length === 0
                            ? []
                            : get().selectedProperties,
                    selectionInfo:
                        remainingSelectedEdgeIds.length === 0 &&
                        get().selectedElements.nodes.length === 0
                            ? undefined
                            : get().selectionInfo,
                });
            }

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

    loadSerializedState: async (serialized: string) => {
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
                await serializationService.deserializeModel(parsed);

            const updatedMetadata = {
                ...metadata,
                modified: new Date().toISOString(),
            };

            const edgesWithMarkers = edges.map((edge) => {
                const arrowheadStyle = edge.data?.arrowheadStyle;
                if (arrowheadStyle) {
                    const markerEnd =
                        arrowheadStyle === "filled"
                            ? {
                                  type: MarkerType.ArrowClosed,
                                  color: getArrowheadColor(),
                                  width: 15,
                                  height: 15,
                              }
                            : arrowheadStyle === "open"
                            ? {
                                  type: MarkerType.Arrow,
                                  color: getArrowheadColor(),
                                  width: 15,
                                  height: 15,
                              }
                            : undefined;
                    console.log("[Store/loadProject] Syncing edge marker:", {
                        edgeId: edge.id,
                        arrowheadStyle,
                        oldMarkerEnd: edge.markerEnd,
                        newMarkerEnd: markerEnd,
                    });
                    return { ...edge, markerEnd };
                }
                return edge;
            });

            console.log("[Store/loadProject] Loaded edges with markers:", {
                totalEdges: edgesWithMarkers.length,
                edgesWithMarkerEnd: edgesWithMarkers.filter((e) => e.markerEnd)
                    .length,
            });

            set({
                nodes,
                edges: edgesWithMarkers,
                projectName: projectName || "Untitled Project",
                metadata: updatedMetadata,
            });

            setTimeout(() => {
                const currentEdges = get().edges;
                set({ edges: [...currentEdges] });
                console.log(
                    "[Store/loadProject] Forced edges refresh for React Flow"
                );
            }, 100);
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

    newProject: () => {
        commandController.clearHistory();
        autosaveService.clearSavedState();
        set({
            projectName: "Untitled Project",
            nodes: [],
            edges: [],
            metadata: createDefaultMetadata(),
            selectedElements: { nodes: [], edges: [] },
            selectedProperties: [],
            selectionInfo: undefined,
            viewportTransform: { x: 0, y: 0, zoom: 1 },
            dragProxy: {
                isActive: false,
                startPosition: null,
                currentPosition: null,
                nodesSnapshot: null,
                edgesSnapshot: null,
                boundingBox: null,
                centerOffset: null,
            },
            clipboard: {
                nodes: [],
                edges: [],
            },
        });
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

                // If durationValue or durationUnit changed, update the combined duration field
                const durationValueProp = editableProperties.find((p) => p.key === "durationValue");
                const durationUnitProp = editableProperties.find((p) => p.key === "durationUnit");

                if (durationValueProp || durationUnitProp) {
                    const currentDurationValue = durationValueProp
                        ? (durationValueProp.value as number)
                        : (node.data.durationValue ?? 0);
                    const currentDurationUnit = durationUnitProp
                        ? String(durationUnitProp.value)
                        : (node.data.durationUnit ?? "");

                    const combinedDuration = currentDurationUnit
                        ? `${currentDurationValue} ${currentDurationUnit}`
                        : currentDurationValue.toString();

                    (newData as any).duration = combinedDuration;
                }

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

                const changedFields = editableProperties.map((p) => p.key);
                const validationTriggerFields = [
                    "initializations",
                    "stateUpdate",
                ];
                const shouldValidate = changedFields.some((field) =>
                    validationTriggerFields.includes(field)
                );

                if (shouldValidate) {
                    setTimeout(() => {
                        const { validateElement } = get();
                        validateElement(nodeId);

                        if (changedFields.includes("initializations")) {
                            const { validateModel } = get();
                            validateModel();
                        }
                    }, 300);
                }
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

                if (
                    Object.prototype.hasOwnProperty.call(
                        newData,
                        "edgeRoutingType"
                    )
                ) {
                    const rt = (newData as any).edgeRoutingType as string;

                    (newData as any).useOrthogonalRouting = rt === "orthogonal";

                    if (rt === "straight" || rt === "bezier") {
                        (newData as any).controlPoints = undefined;
                        (newData as any).routingType = undefined;
                        (newData as any).routingMetrics = undefined;
                        (newData as any).selectedHandles = undefined;
                    }
                }

                const updateData: any = { data: { ...edge.data, ...newData } };

                if (
                    Object.prototype.hasOwnProperty.call(
                        newData,
                        "arrowheadStyle"
                    )
                ) {
                    const arrowheadStyle = (newData as any)
                        .arrowheadStyle as string;
                    updateData.markerEnd =
                        arrowheadStyle === "filled"
                            ? {
                                  type: MarkerType.ArrowClosed,
                                  color: getArrowheadColor(),
                                  width: 15,
                                  height: 15,
                              }
                            : arrowheadStyle === "open"
                            ? {
                                  type: MarkerType.Arrow,
                                  color: getArrowheadColor(),
                                  width: 15,
                                  height: 15,
                              }
                            : undefined;
                    console.log("[Store] Updating edge arrowhead:", {
                        edgeId,
                        arrowheadStyle,
                        markerEnd: updateData.markerEnd,
                        updateData,
                    });
                }

                const command = commandController.createUpdateEdgeCommand(
                    edgeId,
                    updateData
                );
                commandController.execute(command);

                if (
                    Object.prototype.hasOwnProperty.call(
                        newData,
                        "arrowheadStyle"
                    )
                ) {
                    setTimeout(() => {
                        const { edges } = get();
                        set({ edges: [...edges] });
                        console.log(
                            "[Store] Forced edges array update for React Flow re-render"
                        );
                    }, 10);
                }

                const changedFields = editableProperties.map((p) => p.key);
                const edgeValidationTriggerFields = [
                    "condition",
                    "delay",
                    "parameter",
                    "initialDelay",
                ];
                const shouldValidate = changedFields.some((field) =>
                    edgeValidationTriggerFields.includes(field)
                );

                if (shouldValidate) {
                    setTimeout(() => {
                        const { validateElement } = get();
                        validateElement(edgeId);
                    }, 300);
                }
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

    refreshEdgeMarkerColors: () => {
        const { edges } = get();
        const updatedEdges = edges.map((edge) => {
            if (edge.markerEnd && typeof edge.markerEnd === "object") {
                return {
                    ...edge,
                    markerEnd: {
                        ...edge.markerEnd,
                        color: getArrowheadColor(),
                    },
                };
            }
            return edge;
        });
        set({ edges: updatedEdges });
    },

    startDragProxy: (nodes: BaseNode[], edges: BaseEdge[]) => {
        if (nodes.length === 0) return;

        const originalNodes = [...nodes];

        const nodePositions = nodes
            .map((n) => {
                const width =
                    typeof n.style?.width === "number" ? n.style.width : 200;
                const height =
                    typeof n.style?.height === "number" ? n.style.height : 100;

                return [
                    { x: n.position.x, y: n.position.y },
                    { x: n.position.x + width, y: n.position.y },
                    { x: n.position.x, y: n.position.y + height },
                    { x: n.position.x + width, y: n.position.y + height },
                ];
            })
            .flat();

        const boundingBox = getBoundingBoxFromPositions(nodePositions);

        if (!boundingBox) {
            console.warn("Could not calculate bounding box for drag proxy");
            return;
        }

        const centerPosition = getBoundingBoxCenter(boundingBox);

        const storeNodes = get().nodes;
        const resetNodes = storeNodes.map((node) => {
            const originalNode = originalNodes.find((n) => n.id === node.id);
            if (originalNode) {
                return {
                    ...node,
                    position: { ...originalNode.position },
                };
            }
            return node;
        });

        const startPosition = centerPosition;

        set({
            nodes: resetNodes,
            dragProxy: {
                isActive: true,
                startPosition,
                currentPosition: startPosition,
                nodesSnapshot: originalNodes,
                edgesSnapshot: [...edges],
                boundingBox,
                centerOffset: {
                    x: 0,
                    y: 0,
                },
            },
        });
    },

    updateDragProxy: (position: { x: number; y: number }, zoom?: number) => {
        const dragProxy = get().dragProxy;
        if (!dragProxy.isActive || !dragProxy.startPosition) return;

        const snappedPosition = {
            x: Math.round(position.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(position.y / GRID_SIZE) * GRID_SIZE,
        };

        set({
            dragProxy: {
                ...dragProxy,
                currentPosition: snappedPosition,
            },
        });
    },

    endDragProxy: (applyChanges: boolean = true) => {
        const dragProxy = get().dragProxy;
        if (
            !dragProxy.isActive ||
            !dragProxy.startPosition ||
            !dragProxy.currentPosition ||
            !dragProxy.nodesSnapshot
        ) {
            set({ dragProxy: { ...dragProxy, isActive: false } });
            return;
        }

        if (applyChanges) {
            const deltaX =
                dragProxy.currentPosition.x - dragProxy.startPosition.x;
            const deltaY =
                dragProxy.currentPosition.y - dragProxy.startPosition.y;

            const batchOperations = dragProxy.nodesSnapshot.map((node) => {
                const newPosition = {
                    x: node.position.x + deltaX,
                    y: node.position.y + deltaY,
                };

                return {
                    type: "node",
                    id: node.id,
                    changes: {
                        position: newPosition,
                    },
                };
            });

            if (dragProxy.edgesSnapshot) {
                const edgeOperations = dragProxy.edgesSnapshot
                    .filter((edge) => {
                        return (
                            edge.data &&
                            edge.data.controlPoints &&
                            edge.data.controlPoints.length > 0
                        );
                    })
                    .map((edge) => {
                        const updatedData = { ...edge.data };

                        if (
                            edge.data?.controlPoints &&
                            edge.data.controlPoints.length > 0
                        ) {
                            updatedData.controlPoints =
                                edge.data.controlPoints.map(
                                    (cp: { x: number; y: number }) => ({
                                        x: cp.x + deltaX,
                                        y: cp.y + deltaY,
                                    })
                                );
                        }

                        return {
                            type: "edge",
                            id: edge.id,
                            changes: {
                                data: updatedData,
                            },
                        };
                    });

                batchOperations.push(...(edgeOperations as any));
            }

            const command =
                commandController.createBatchCommand(batchOperations);
            commandController.execute(command);
        }

        set({
            dragProxy: {
                isActive: false,
                startPosition: null,
                currentPosition: null,
                nodesSnapshot: null,
                edgesSnapshot: null,
                boundingBox: null,
                centerOffset: null,
            },
        });
    },

    copySelectedElements: () => {
        const { selectedElements, nodes, edges } = get();

        const selectedNodes = selectedElements.nodes
            .map((id) => nodes.find((n) => n.id === id))
            .filter((node): node is BaseNode => node !== undefined);

        const selectedEdges = selectedElements.edges
            .map((id) => edges.find((e) => e.id === id))
            .filter((edge): edge is BaseEdge => edge !== undefined);

        const clonedNodes = selectedNodes.map((node) => ({
            ...node,
            data: node.data ? { ...node.data } : undefined,
            style: node.style ? { ...node.style } : undefined,
            position: { ...node.position },
        }));

        const clonedEdges = selectedEdges.map((edge) => ({
            ...edge,
            data: edge.data ? { ...edge.data } : undefined,
            style: edge.style ? { ...edge.style } : undefined,
            markerEnd: edge.markerEnd,
            markerStart: edge.markerStart,
        }));

        set({
            clipboard: {
                nodes: clonedNodes,
                edges: clonedEdges,
            },
        });
    },

    pasteElements: () => {
        const { clipboard } = get();

        if (clipboard.nodes.length === 0 && clipboard.edges.length === 0) {
            return;
        }

        const nodeIdMap = new Map<string, string>();
        const newNodes = clipboard.nodes.map((node) => {
            const newId = nanoid();
            nodeIdMap.set(node.id, newId);

            return {
                ...node,
                id: newId,
                position: {
                    x: node.position.x + 20,
                    y: node.position.y + 20,
                },
                data: node.data ? { ...node.data } : undefined,
                style: node.style ? { ...node.style } : undefined,
            };
        });

        const validEdges = clipboard.edges
            .filter(
                (edge) =>
                    nodeIdMap.has(edge.source) && nodeIdMap.has(edge.target)
            )
            .map((edge) => {
                const newSourceId = nodeIdMap.get(edge.source)!;
                const newTargetId = nodeIdMap.get(edge.target)!;

                let newSourceHandle = edge.sourceHandle;
                let newTargetHandle = edge.targetHandle;

                if (
                    edge.sourceHandle &&
                    edge.sourceHandle.includes(edge.source)
                ) {
                    newSourceHandle = edge.sourceHandle.replace(
                        edge.source,
                        newSourceId
                    );
                }

                if (
                    edge.targetHandle &&
                    edge.targetHandle.includes(edge.target)
                ) {
                    newTargetHandle = edge.targetHandle.replace(
                        edge.target,
                        newTargetId
                    );
                }

                return {
                    ...edge,
                    id: nanoid(),
                    source: newSourceId,
                    target: newTargetId,
                    sourceHandle: newSourceHandle,
                    targetHandle: newTargetHandle,
                    data: edge.data ? { ...edge.data } : undefined,
                    style: edge.style ? { ...edge.style } : undefined,
                    markerEnd: edge.markerEnd,
                    markerStart: edge.markerStart,
                };
            });

        const batchOperations = [
            ...newNodes.map((node) => ({
                type: "addNode" as const,
                node,
            })),
            ...validEdges.map((edge) => ({
                type: "addEdge" as const,
                edge,
            })),
        ];

        if (batchOperations.length > 0) {
            const { selectedElements, onNodesChange, onEdgesChange } = get();

            if (selectedElements.nodes.length > 0) {
                onNodesChange(
                    selectedElements.nodes.map((nodeId) => ({
                        id: nodeId,
                        type: "select",
                        selected: false,
                    }))
                );
            }

            if (selectedElements.edges.length > 0) {
                onEdgesChange(
                    selectedElements.edges.map((edgeId) => ({
                        id: edgeId,
                        type: "select",
                        selected: false,
                    }))
                );
            }

            const command =
                commandController.createBatchAddCommand(batchOperations);
            commandController.execute(command);

            requestAnimationFrame(() => {
                const { onNodesChange, onEdgesChange } = get();

                if (newNodes.length > 0) {
                    onNodesChange(
                        newNodes.map((node) => ({
                            id: node.id,
                            type: "select",
                            selected: true,
                        }))
                    );
                }

                if (validEdges.length > 0) {
                    onEdgesChange(
                        validEdges.map((edge) => ({
                            id: edge.id,
                            type: "select",
                            selected: true,
                        }))
                    );
                }
            });
        }
    },

    validateModel: () => {
        const { nodes, edges } = get();
        set((state) => ({
            validation: { ...state.validation, isValidating: true },
        }));

        try {
            const result = graphValidationService.validateModel(nodes, edges);
            const groupedErrors = buildValidationErrorMap(result.errors);
            logValidationErrors("model validation", result.errors);
            set((state) => ({
                validation: {
                    errors: result.errors,
                    errorMap: groupedErrors,
                    lastValidated: new Date().toISOString(),
                    isValidating: false,
                },
            }));
        } catch (error) {
            console.error("Validation error:", error);
            set((state) => ({
                validation: { ...state.validation, isValidating: false },
            }));
        }
    },

    validateElement: (elementId: string) => {
        const { nodes, edges } = get();

        try {
            const elementErrors = graphValidationService.validateElement(
                elementId,
                nodes,
                edges
            );
            logValidationErrors(
                `element validation (${elementId})`,
                elementErrors
            );

            set((state) => {
                const remainingErrors = state.validation.errors.filter(
                    (error) => error.elementId !== elementId
                );
                const updatedErrors = [...remainingErrors, ...elementErrors];
                const updatedMap = { ...state.validation.errorMap };

                if (elementErrors.length > 0) {
                    updatedMap[elementId] = elementErrors;
                } else {
                    delete updatedMap[elementId];
                }

                return {
                    validation: {
                        ...state.validation,
                        errors: updatedErrors,
                        errorMap: updatedMap,
                        lastValidated: new Date().toISOString(),
                    },
                };
            });
        } catch (error) {
            console.error("Element validation error:", error);
        }
    },

    clearValidationErrors: () => {
        set((state) => ({
            validation: {
                ...state.validation,
                errors: [],
                errorMap: {},
            },
        }));
    },

    getValidationErrors: (elementId?: string) => {
        const { validation } = get();
        if (!elementId) {
            return validation.errors;
        }

        return validation.errorMap[elementId] ?? EMPTY_VALIDATION_ERRORS;
    },
}));
