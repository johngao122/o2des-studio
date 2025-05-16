import { useStore } from "../store";
import { BaseNode, BaseEdge } from "../types/base";
import {
    NodeChange,
    EdgeChange,
    Connection,
    Viewport,
    NodePositionChange,
    MarkerType,
} from "reactflow";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "reactflow";
import { nanoid } from "nanoid";
import { AutosaveService } from "../services/AutosaveService";

interface Command {
    execute: () => void;
    undo: () => void;
}

interface DragState {
    nodeId: string;
    startPosition: { x: number; y: number };
}

interface EdgeUpdateBatch {
    edgeId: string;
    updates: Partial<BaseEdge>;
    timestamp: number;
}

export class CommandController {
    private static instance: CommandController;
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private dragState: Map<string, DragState> = new Map();
    private autosaveService: AutosaveService;

    private edgeUpdateBatches: Map<string, EdgeUpdateBatch> = new Map();
    private edgeBatchTimer: NodeJS.Timeout | null = null;
    private batchTimeWindow = 100;

    private isBatching = false;
    private batchedCommands: Command[] = [];

    private constructor() {
        this.autosaveService = AutosaveService.getInstance();
    }

    public static getInstance(): CommandController {
        if (!CommandController.instance) {
            CommandController.instance = new CommandController();
        }
        return CommandController.instance;
    }

    execute(command: Command, options?: { silent?: boolean }) {
        const commandDesc = command.execute.toString().slice(0, 150) + "...";

        const stackTrace = new Error().stack || "";
        const callerMatch =
            stackTrace.split("\n")[2]?.trim() || "Unknown caller";

        command.execute();

        if (!options?.silent) {
            if (this.isBatching) {
                const commandCopy = {
                    execute: command.execute,
                    undo: command.undo,
                };
                this.batchedCommands.push(commandCopy);
            } else {
                this.undoStack.push(command);
                this.redoStack = [];
                this.autosaveService.autosave();
            }
        }
    }

    beginBatch() {
        this.isBatching = true;
        this.batchedCommands = [];
    }

    endBatch() {
        if (this.batchedCommands.length > 0) {
            const batchedCommandsCopy = [...this.batchedCommands];

            const compound: Command = {
                execute: () => {
                    batchedCommandsCopy.forEach((c) => c.execute());
                },
                undo: () => {
                    [...batchedCommandsCopy].reverse().forEach((c) => c.undo());
                },
            };

            this.undoStack.push(compound);
            this.redoStack = [];
        }
        this.isBatching = false;
        this.batchedCommands = [];
        this.autosaveService.autosave();
    }

    undo() {
        const command = this.undoStack.pop();
        if (command) {
            const isBatchCommand = command.execute
                .toString()
                .includes("batchedCommandsCopy");

            try {
                command.undo();
            } catch (error) {
                console.error("Error during undo operation:", error);
            }

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

    startEdgeDrag(edgeId: string, initialState: any) {
        this.dragState.set(edgeId, {
            nodeId: edgeId,
            startPosition: initialState,
        });
    }

    updateEdgeDuringDrag(edgeId: string, updates: Partial<BaseEdge>) {
        useStore.setState((state) => ({
            edges: state.edges.map((e) =>
                e.id === edgeId ? { ...e, ...updates } : e
            ),
        }));
    }

    endEdgeDrag(edgeId: string, finalState: any) {
        const dragStart = this.dragState.get(edgeId);
        if (!dragStart) return;

        const { edges } = useStore.getState();
        const edge = edges.find((e) => e.id === edgeId);

        if (!edge) {
            this.dragState.delete(edgeId);
            return;
        }

        const command = this.createUpdateEdgeCommand(edgeId, {
            data: { ...edge.data, ...finalState },
        });

        this.execute(command);
        this.dragState.delete(edgeId);
    }

    updateEdgeControlPoint(
        edgeId: string,
        controlPoint: { x: number; y: number }
    ) {
        const { edges } = useStore.getState();
        const edge = edges.find((e) => e.id === edgeId);

        if (!edge) return;

        const isDragging = useStore.getState().dragProxy.isActive;

        if (isDragging) {
            return;
        }

        const command = this.createUpdateEdgeCommand(edgeId, {
            data: {
                ...edge.data,
                controlPoint,
            },
        });

        this.execute(command);
    }

    updateEdgeDelayPosition(edgeId: string, delayPosition: number) {
        const { edges } = useStore.getState();
        const edge = edges.find((e) => e.id === edgeId);

        if (!edge) return;

        const isDragging = useStore.getState().dragProxy.isActive;

        if (isDragging) {
            return;
        }

        const command = this.createUpdateEdgeCommand(edgeId, {
            data: {
                ...edge.data,
                delayPosition,
            },
        });

        this.execute(command);
    }

    updateEdgeParameterPosition(edgeId: string, parameterPosition: number) {
        const { edges } = useStore.getState();
        const edge = edges.find((e) => e.id === edgeId);

        if (!edge) return;

        const isDragging = useStore.getState().dragProxy.isActive;

        if (isDragging) {
            return;
        }

        const command = this.createUpdateEdgeCommand(edgeId, {
            data: {
                ...edge.data,
                parameterPosition,
            },
        });

        this.execute(command);
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
                    nodes: state.nodes.map((n) => (n.id === nodeId ? node : n)),
                }));
                this.autosaveService.autosave();
            },
        };
    }

    createUpdateEdgeCommand(
        edgeId: string,
        updates: Partial<BaseEdge>
    ): Command {
        const { edges } = useStore.getState();
        const edge = edges.find((e) => e.id === edgeId);

        if (!edge) {
            throw new Error(`Edge with id ${edgeId} not found`);
        }

        return {
            execute: () => {
                useStore.setState((state) => ({
                    edges: state.edges.map((e) =>
                        e.id === edgeId ? { ...e, ...updates } : e
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

    createNodesChangeCommand(changes: NodeChange[]): Command | null {
        const positionChanges = changes.filter(
            (change): change is NodePositionChange =>
                change.type === "position" &&
                useStore.getState().nodes.some((n) => n.id === change.id)
        );

        if (positionChanges.length > 0) {
            return this.handleDragChanges(positionChanges);
        }

        return null;
    }

    private handleDragChanges(changes: NodePositionChange[]): Command | null {
        const currentNodes = useStore.getState().nodes;

        for (const change of changes) {
            if (!change.dragging) continue;

            if (!this.dragState.has(change.id)) {
                const node = currentNodes.find((n) => n.id === change.id);
                if (!node) continue;

                this.dragState.set(change.id, {
                    nodeId: change.id,
                    startPosition: { ...node.position },
                });
            }
        }

        const endedDrags = changes.filter((change) => !change.dragging);
        const ongoingDrags = changes.filter((change) => change.dragging);

        if (endedDrags.length > 0) {
            const commands: Command[] = [];
            const draggedNodeIds = new Set<string>();

            for (const change of endedDrags) {
                const dragStart = this.dragState.get(change.id);
                if (!dragStart) continue;

                const node = currentNodes.find((n) => n.id === change.id);
                if (!node) continue;

                draggedNodeIds.add(change.id);

                commands.push({
                    execute: () => {
                        const pos = change.position;
                        if (!pos?.x || !pos?.y) return;
                        useStore.setState((state) => ({
                            nodes: state.nodes.map((n) =>
                                n.id === change.id
                                    ? { ...n, position: { x: pos.x, y: pos.y } }
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
                                          position: dragStart.startPosition,
                                      }
                                    : n
                            ),
                        }));
                    },
                });

                this.dragState.delete(change.id);
            }

            if (draggedNodeIds.size > 0) {
                const { edges } = useStore.getState();

                const affectedEdges = edges.filter((edge) => {
                    if (
                        edge.data?.edgeType !== "bezier" ||
                        !edge.data?.controlPoint
                    ) {
                        return false;
                    }

                    return (
                        draggedNodeIds.has(edge.source) ||
                        draggedNodeIds.has(edge.target)
                    );
                });

                affectedEdges.forEach((edge) => {
                    const sourceNode = currentNodes.find(
                        (n) => n.id === edge.source
                    );
                    const targetNode = currentNodes.find(
                        (n) => n.id === edge.target
                    );

                    if (!sourceNode || !targetNode || !edge.data?.controlPoint)
                        return;

                    const sourceNodeDragged = draggedNodeIds.has(sourceNode.id);
                    const targetNodeDragged = draggedNodeIds.has(targetNode.id);

                    if (!sourceNodeDragged && !targetNodeDragged) return;

                    const controlPoint = edge.data.controlPoint;
                    const newControlPoint = { ...controlPoint };

                    let sourceDeltaX = 0,
                        sourceDeltaY = 0;
                    let targetDeltaX = 0,
                        targetDeltaY = 0;

                    for (const change of endedDrags) {
                        const dragStart = this.dragState.get(change.id);
                        if (!dragStart) continue;

                        if (change.id === sourceNode.id && change.position) {
                            sourceDeltaX =
                                change.position.x - dragStart.startPosition.x;
                            sourceDeltaY =
                                change.position.y - dragStart.startPosition.y;
                        }

                        if (change.id === targetNode.id && change.position) {
                            targetDeltaX =
                                change.position.x - dragStart.startPosition.x;
                            targetDeltaY =
                                change.position.y - dragStart.startPosition.y;
                        }
                    }

                    const tWeight = 0.5;
                    let deltaX = 0,
                        deltaY = 0;

                    if (sourceNodeDragged && targetNodeDragged) {
                        deltaX =
                            sourceDeltaX * (1 - tWeight) +
                            targetDeltaX * tWeight;
                        deltaY =
                            sourceDeltaY * (1 - tWeight) +
                            targetDeltaY * tWeight;
                    } else if (sourceNodeDragged) {
                        deltaX = sourceDeltaX * (1 - tWeight);
                        deltaY = sourceDeltaY * (1 - tWeight);
                    } else if (targetNodeDragged) {
                        deltaX = targetDeltaX * tWeight;
                        deltaY = targetDeltaY * tWeight;
                    }

                    newControlPoint.x += deltaX;
                    newControlPoint.y += deltaY;

                    commands.push({
                        execute: () => {
                            useStore.setState((state) => ({
                                edges: state.edges.map((e) =>
                                    e.id === edge.id
                                        ? {
                                              ...e,
                                              data: {
                                                  ...e.data,
                                                  controlPoint: newControlPoint,
                                              },
                                          }
                                        : e
                                ),
                            }));
                        },
                        undo: () => {
                            useStore.setState((state) => ({
                                edges: state.edges.map((e) =>
                                    e.id === edge.id
                                        ? {
                                              ...e,
                                              data: {
                                                  ...e.data,
                                                  controlPoint: controlPoint,
                                              },
                                          }
                                        : e
                                ),
                            }));
                        },
                    });
                });
            }

            if (commands.length > 0) {
                return {
                    execute: () => commands.forEach((cmd) => cmd.execute()),
                    undo: () => commands.forEach((cmd) => cmd.undo()),
                };
            }
        }

        if (ongoingDrags.length > 0) {
            const newNodes = applyNodeChanges(
                ongoingDrags,
                currentNodes
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
        }

        let graphType: string | undefined = undefined;
        if (edgeType === "eventGraph" || edgeType === "initialization") {
            graphType = "eventBased";
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

        const originalEdgeStates = new Map<string, BaseEdge>();
        edgeIds.forEach((id) => {
            const edge = originalEdges.find((e) => e.id === id);
            if (edge) {
                originalEdgeStates.set(id, JSON.parse(JSON.stringify(edge)));
            }
        });

        const connectedEdgeIds = new Set<string>();
        nodeIds.forEach((nodeId) => {
            originalEdges.forEach((edge) => {
                if (edge.source === nodeId || edge.target === nodeId) {
                    connectedEdgeIds.add(edge.id);
                    if (!originalEdgeStates.has(edge.id)) {
                        originalEdgeStates.set(
                            edge.id,
                            JSON.parse(JSON.stringify(edge))
                        );
                    }
                }
            });
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
                    useStore.setState((state) => {
                        const updatedEdges = state.edges.map((edge) => {
                            const operation = edgeOperations.find(
                                (op) => op.id === edge.id
                            );
                            if (operation) {
                                return {
                                    ...edge,
                                    ...operation.changes,

                                    data: {
                                        ...edge.data,
                                        ...(operation.changes.data || {}),
                                    },
                                };
                            }
                            return edge;
                        });

                        return { edges: updatedEdges };
                    });
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

                const allAffectedEdgeIds = new Set([
                    ...edgeIds,
                    ...connectedEdgeIds,
                ]);

                if (allAffectedEdgeIds.size > 0) {
                    useStore.setState((state) => {
                        const restoredEdges = state.edges.map((edge) => {
                            const originalEdge = originalEdgeStates.get(
                                edge.id
                            );
                            if (originalEdge) {
                                return originalEdge;
                            }
                            return edge;
                        });

                        return { edges: restoredEdges };
                    });
                }

                this.autosaveService.autosave();
            },
        };
    }
}
