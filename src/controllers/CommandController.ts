import { useStore } from "../store";
import { BaseNode, BaseEdge } from "../types/base";
import {
    NodeChange,
    EdgeChange,
    Connection,
    Viewport,
    NodePositionChange,
    MarkerType,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
} from "reactflow";
import { nanoid } from "nanoid";
import { AutosaveService } from "../services/AutosaveService";
import { checkAllEdgeControlPointCollisions } from "../lib/utils/collision";
import { LayoutService, LayoutConfig } from "../services/LayoutService";

interface Command {
    execute: () => void;
    undo: () => void;
}

interface DragState {
    nodeId: string;
    startPosition: { x: number; y: number };
    originalPosition: { x: number; y: number };
}

export class CommandController {
    private static instance: CommandController;
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private dragState: Map<string, DragState> = new Map();
    private autosaveService: AutosaveService;
    private layoutService: LayoutService;

    private constructor() {
        this.autosaveService = AutosaveService.getInstance();
        this.layoutService = LayoutService.getInstance();
    }

    public static getInstance(): CommandController {
        if (!CommandController.instance) {
            CommandController.instance = new CommandController();
        }
        return CommandController.instance;
    }

    execute(command: Command) {
        const commandDesc = command.execute.toString().slice(0, 150) + "...";

        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];

        this.checkAndAdjustControlPointCollisions();

        this.autosaveService.autosave();
    }

    /**
     * Check all edge control points for collisions with nodes and adjust them
     * This runs after every command to maintain clean edge routing
     */
    private checkAndAdjustControlPointCollisions(
        distance: number = 50,
        maxIterations: number = 10
    ): void {
        const { edges, nodes } = useStore.getState();

        if (edges.length === 0) {
            return;
        }

        const collisionAdjustments = checkAllEdgeControlPointCollisions(
            edges,
            nodes,
            distance,
            maxIterations
        );

        if (collisionAdjustments.length > 0) {
            const adjustmentCommands: Command[] = [];

            for (const adjustment of collisionAdjustments) {
                const edge = edges.find((e) => e.id === adjustment.edgeId);
                if (edge) {
                    const updateCommand = this.createUpdateEdgeCommand(
                        adjustment.edgeId,
                        {
                            data: {
                                ...edge.data,
                                controlPoints: adjustment.newControlPoints,
                            },
                        }
                    );
                    adjustmentCommands.push(updateCommand);
                }
            }

            if (adjustmentCommands.length > 0) {
                this.executeBatchedAdjustments(adjustmentCommands);
            }
        }
    }

    /**
     * Execute control point adjustments without triggering collision checks
     * to prevent infinite recursion
     */
    private executeBatchedAdjustments(commands: Command[]): void {
        for (const command of commands) {
            command.execute();
        }
    }

    undo() {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);

            this.autosaveService.autosave();
        }
    }

    redo() {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);

            this.autosaveService.autosave();
        }
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    clearHistory(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.dragState.clear();
    }

    createAddNodeCommand(node: BaseNode): Command {
        return {
            execute: () => {
                useStore.setState((state) => ({
                    nodes: [...state.nodes, node],
                }));
            },
            undo: () => {
                useStore.setState((state) => ({
                    nodes: state.nodes.filter((n) => n.id !== node.id),
                }));
            },
        };
    }

    createAddEdgeCommand(edge: BaseEdge): Command {
        return {
            execute: () => {
                useStore.setState((state) => ({
                    edges: [...state.edges, edge],
                }));
            },
            undo: () => {
                useStore.setState((state) => ({
                    edges: state.edges.filter((e) => e.id !== edge.id),
                }));
            },
        };
    }

    createUpdateNodeCommand(
        nodeId: string,
        updates: Partial<BaseNode>
    ): Command {
        const { nodes } = useStore.getState();
        const node = nodes.find((n) => n.id === nodeId);

        if (!node) {
            throw new Error(`Node with id ${nodeId} not found`);
        }

        const originalNode: BaseNode = {
            ...node,
            data: { ...node.data },
            style: node.style ? { ...node.style } : undefined,
            position: { ...node.position },
        };

        return {
            execute: () => {
                useStore.setState((state) => ({
                    nodes: state.nodes.map((n) =>
                        n.id === nodeId ? { ...n, ...updates } : n
                    ),
                }));
                this.autosaveService.autosave();
            },
            undo: () => {
                useStore.setState((state) => ({
                    nodes: state.nodes.map((n) =>
                        n.id === nodeId ? originalNode : n
                    ),
                }));
                this.autosaveService.autosave();
            },
        };
    }

    createUpdateEdgeCommand(
        edgeId: string,
        updates: Partial<BaseEdge>
    ): Command {
        const { edges, nodes } = useStore.getState();
        const edge = edges.find((e) => e.id === edgeId);

        if (!edge) {
            throw new Error(`Edge with id ${edgeId} not found`);
        }

        let modifiedUpdates = { ...updates };
        if (
            updates.data?.edgeType &&
            updates.data.edgeType !== edge.data?.edgeType
        ) {
            const newEdgeType = updates.data.edgeType;
            const currentEdgeType = edge.data?.edgeType;
        }

        return {
            execute: () => {
                useStore.setState((state) => ({
                    edges: state.edges.map((e) =>
                        e.id === edgeId ? { ...e, ...modifiedUpdates } : e
                    ),
                }));
                this.autosaveService.autosave();
            },
            undo: () => {
                useStore.setState((state) => ({
                    edges: state.edges.map((e) => (e.id === edgeId ? edge : e)),
                }));
                this.autosaveService.autosave();
            },
        };
    }

    createNodesChangeCommand(
        changes: NodeChange[],
        originalNodes?: BaseNode[]
    ): Command | null {
        const positionChanges = changes.filter(
            (change): change is NodePositionChange =>
                change.type === "position" &&
                (originalNodes || useStore.getState().nodes).some(
                    (n) => n.id === change.id
                )
        );

        if (positionChanges.length > 0) {
            return this.handleDragChanges(positionChanges, originalNodes);
        }

        return null;
    }

    private handleDragChanges(
        changes: NodePositionChange[],
        originalNodes?: BaseNode[]
    ): Command | null {
        const currentNodes = originalNodes || useStore.getState().nodes;

        for (const change of changes) {
            if (!change.dragging) continue;

            if (!this.dragState.has(change.id)) {
                console.warn(
                    "Drag state missing for node:",
                    change.id,
                    "- this indicates a timing issue"
                );
                const node = currentNodes.find((n) => n.id === change.id);
                if (!node) continue;

                this.dragState.set(change.id, {
                    nodeId: change.id,
                    startPosition: { ...node.position },
                    originalPosition: { ...node.position },
                });
            }
        }

        const endedDrags = changes.filter((change) => !change.dragging);
        const ongoingDrags = changes.filter((change) => change.dragging);

        if (endedDrags.length > 0) {
            const commands: Command[] = [];

            const nodesAfterChanges = applyNodeChanges(
                changes,
                currentNodes
            ) as BaseNode[];

            for (const change of endedDrags) {
                const dragStart = this.dragState.get(change.id);

                if (!dragStart) {
                    continue;
                }

                const finalNode = nodesAfterChanges.find(
                    (n) => n.id === change.id
                );
                const endPosition = finalNode ? finalNode.position : null;

                if (!endPosition) {
                    continue;
                }

                const startPos = dragStart.originalPosition;
                const endPos = endPosition;

                if (startPos.x === endPos.x && startPos.y === endPos.y) {
                    this.dragState.delete(change.id);
                    continue;
                }

                commands.push({
                    execute: () => {
                        useStore.setState((state) => ({
                            nodes: state.nodes.map((n) =>
                                n.id === change.id
                                    ? {
                                          ...n,
                                          position: {
                                              x: endPos.x,
                                              y: endPos.y,
                                          },
                                      }
                                    : n
                            ),
                        }));
                    },
                    undo: () => {
                        useStore.setState((state) => ({
                            nodes: state.nodes.map((n) =>
                                n.id === change.id
                                    ? {
                                          ...n,
                                          position: startPos,
                                      }
                                    : n
                            ),
                        }));
                    },
                });

                this.dragState.delete(change.id);
            }

            if (commands.length > 0) {
                return {
                    execute: () => commands.forEach((cmd) => cmd.execute()),
                    undo: () => commands.forEach((cmd) => cmd.undo()),
                };
            }
        }

        if (ongoingDrags.length > 0) {
            const storeNodes = useStore.getState().nodes;
            const newNodes = applyNodeChanges(
                ongoingDrags,
                storeNodes
            ) as BaseNode[];
            useStore.setState({ nodes: newNodes });
        }

        return null;
    }

    createEdgesChangeCommand(changes: EdgeChange[]): Command | null {
        const nonSelectionChanges = changes.filter(
            (change) => change.type !== "select"
        );

        if (nonSelectionChanges.length === 0) return null;

        const currentEdges = useStore.getState().edges;
        const newEdges = applyEdgeChanges(
            nonSelectionChanges,
            currentEdges
        ) as BaseEdge[];

        return {
            execute: () => {
                useStore.setState({ edges: newEdges });
            },
            undo: () => {
                useStore.setState({ edges: currentEdges });
            },
        };
    }

    private determineEdgeType(
        sourceNode: BaseNode | undefined,
        targetNode: BaseNode | undefined
    ): string | undefined {
        if (!sourceNode || !targetNode) {
            return undefined;
        }

        const sourceGraphType = sourceNode.graphType;
        const targetGraphType = targetNode.graphType;
        const sourceType = sourceNode.type;
        const targetType = targetNode.type;

        switch (true) {
            case sourceGraphType === "eventBased" &&
                targetGraphType === "eventBased":
                if (sourceType === "initialization") {
                    return "initialization";
                }
                return "eventGraph";

            case sourceGraphType === "rcq" && targetGraphType === "rcq":
                return "rcq";

            default:
                return undefined;
        }
    }

    createConnectCommand(connection: Connection): Command {
        if (!connection.source || !connection.target)
            throw new Error("Invalid connection");

        const { nodes } = useStore.getState();
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);

        const edgeType = this.determineEdgeType(sourceNode, targetNode);

        let defaultData = {};
        if (edgeType === "eventGraph") {
            defaultData = {
                condition: "True",
                edgeType: "straight",
            };
        } else if (edgeType === "initialization") {
            defaultData = {
                parameter: "1",
                edgeType: "straight",
            };
        } else if (edgeType === "rcq") {
            defaultData = {
                edgeType: "straight",
            };
        }

        let graphType: string | undefined = undefined;
        if (edgeType === "eventGraph" || edgeType === "initialization") {
            graphType = "eventBased";
        } else if (edgeType === "rcq") {
            graphType = "rcq";
        }

        const edge: BaseEdge = {
            id: nanoid(),
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            type: edgeType,
            graphType,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
            },
            conditions: [],
            data: defaultData,
        };

        return {
            execute: () => {
                useStore.setState((state) => {
                    return {
                        edges: addEdge(edge, state.edges) as BaseEdge[],
                    };
                });
            },
            undo: () => {
                useStore.setState((state) => ({
                    edges: state.edges.filter((e) => e.id !== edge.id),
                }));
            },
        };
    }

    createViewportChangeCommand(viewport: Viewport): Command {
        const currentViewport = useStore.getState().viewportTransform;

        return {
            execute: () => {
                useStore.setState({
                    viewportTransform: {
                        x: viewport.x,
                        y: viewport.y,
                        zoom: viewport.zoom,
                    },
                });
            },
            undo: () => {
                useStore.setState({ viewportTransform: currentViewport });
            },
        };
    }

    createBatchCommand(
        operations: { type: string; id: string; changes: any }[]
    ): Command {
        const state = useStore.getState();
        const originalNodes = [...state.nodes];
        const originalEdges = [...state.edges];

        const nodeOperations = operations.filter((op) => op.type === "node");
        const edgeOperations = operations.filter((op) => op.type === "edge");
        const nodeIds = [...new Set(nodeOperations.map((op) => op.id))];
        const edgeIds = [...new Set(edgeOperations.map((op) => op.id))];

        const originalNodePositions = new Map<
            string,
            { x: number; y: number }
        >();
        nodeIds.forEach((id) => {
            const node = originalNodes.find((n) => n.id === id);
            if (node) {
                originalNodePositions.set(id, { ...node.position });
            }
        });

        return {
            execute: () => {
                if (nodeOperations.length > 0) {
                    useStore.setState((state) => {
                        const updatedNodes = state.nodes.map((node) => {
                            const operation = nodeOperations.find(
                                (op) => op.id === node.id
                            );
                            if (operation && operation.changes.position) {
                                return {
                                    ...node,
                                    position: operation.changes.position,
                                };
                            }
                            return node;
                        });

                        return { nodes: updatedNodes };
                    });
                }

                if (edgeOperations.length > 0) {
                }

                this.autosaveService.autosave();
            },
            undo: () => {
                if (nodeIds.length > 0) {
                    useStore.setState((state) => {
                        const restoredNodes = state.nodes.map((node) => {
                            const originalPosition = originalNodePositions.get(
                                node.id
                            );
                            if (originalPosition) {
                                return {
                                    ...node,
                                    position: originalPosition,
                                };
                            }
                            return node;
                        });

                        return { nodes: restoredNodes };
                    });
                }

                if (edgeIds.length > 0) {
                }

                this.autosaveService.autosave();
            },
        };
    }

    createBatchAddCommand(
        operations: Array<
            | { type: "addNode"; node: BaseNode }
            | { type: "addEdge"; edge: BaseEdge }
        >
    ): Command {
        const nodesToAdd = operations
            .filter(
                (op): op is { type: "addNode"; node: BaseNode } =>
                    op.type === "addNode"
            )
            .map((op) => op.node);

        const edgesToAdd = operations
            .filter(
                (op): op is { type: "addEdge"; edge: BaseEdge } =>
                    op.type === "addEdge"
            )
            .map((op) => op.edge);

        return {
            execute: () => {
                useStore.setState((state) => ({
                    nodes: [...state.nodes, ...nodesToAdd],
                    edges: [...state.edges, ...edgesToAdd],
                }));
                this.autosaveService.autosave();
            },
            undo: () => {
                const nodeIdsToRemove = nodesToAdd.map((n) => n.id);
                const edgeIdsToRemove = edgesToAdd.map((e) => e.id);

                useStore.setState((state) => ({
                    nodes: state.nodes.filter(
                        (n) => !nodeIdsToRemove.includes(n.id)
                    ),
                    edges: state.edges.filter(
                        (e) => !edgeIdsToRemove.includes(e.id)
                    ),
                }));
                this.autosaveService.autosave();
            },
        };
    }

    public captureOriginalPositions(nodeIds: string[]): void {
        const currentNodes = useStore.getState().nodes;

        for (const nodeId of nodeIds) {
            if (!this.dragState.has(nodeId)) {
                const node = currentNodes.find((n) => n.id === nodeId);
                if (node) {
                    this.dragState.set(nodeId, {
                        nodeId,
                        startPosition: { ...node.position },
                        originalPosition: { ...node.position },
                    });
                }
            }
        }
    }

    /**
     * Manually trigger collision detection and adjustment for all edge control points
     */
    public adjustAllControlPointCollisions(
        distance: number = 50,
        maxIterations: number = 10
    ): void {
        this.checkAndAdjustControlPointCollisions(distance, maxIterations);
    }

    /**
     * Create a command to apply automatic layout to nodes and straighten edges
     */
    createLayoutCommand(
        selectedNodeIds: string[] = [],
        config: Partial<LayoutConfig> = {}
    ): Command {
        const { nodes, edges } = useStore.getState();

        const originalPositions = new Map<string, { x: number; y: number }>();
        const originalEdges = new Map<string, BaseEdge>();

        nodes.forEach((node) => {
            originalPositions.set(node.id, { ...node.position });
        });

        edges.forEach((edge) => {
            originalEdges.set(edge.id, {
                ...edge,
                data: { ...edge.data },
            });
        });

        const layoutResult = this.layoutService.autoLayout(
            nodes,
            edges,
            selectedNodeIds,
            config
        );

        return {
            execute: () => {
                useStore.setState((state) => ({
                    nodes: state.nodes.map((node) => {
                        const layoutedNode = layoutResult.nodes.find(
                            (n) => n.id === node.id
                        );
                        return layoutedNode || node;
                    }),
                    edges: state.edges.map((edge) => {
                        const layoutedEdge = layoutResult.edges.find(
                            (e) => e.id === edge.id
                        );
                        return layoutedEdge || edge;
                    }),
                }));
                this.autosaveService.autosave();
            },
            undo: () => {
                useStore.setState((state) => ({
                    nodes: state.nodes.map((node) => {
                        const originalPosition = originalPositions.get(node.id);
                        return originalPosition
                            ? { ...node, position: originalPosition }
                            : node;
                    }),
                    edges: state.edges.map((edge) => {
                        const originalEdge = originalEdges.get(edge.id);
                        return originalEdge || edge;
                    }),
                }));
                this.autosaveService.autosave();
            },
        };
    }

    /**
     * Apply automatic layout to selected nodes or all nodes
     */
    applyLayout(
        selectedNodeIds: string[] = [],
        config: Partial<LayoutConfig> = {}
    ): void {
        const command = this.createLayoutCommand(selectedNodeIds, config);
        this.execute(command);
    }
}
