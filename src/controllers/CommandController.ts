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

export class CommandController {
    private static instance: CommandController;
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private dragState: Map<string, DragState> = new Map();
    private autosaveService: AutosaveService;

    private constructor() {
        this.autosaveService = AutosaveService.getInstance();
    }

    public static getInstance(): CommandController {
        if (!CommandController.instance) {
            CommandController.instance = new CommandController();
        }
        return CommandController.instance;
    }

    execute(command: Command) {
        const commandDesc = command.execute.toString().slice(0, 150) + "...";
        console.log("Executing command:", commandDesc);

        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
        console.log(
            "Command executed - Undo Stack:",
            this.undoStack.length,
            "Redo Stack:",
            this.redoStack.length
        );

        this.autosaveService.autosave();
    }

    undo() {
        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
            console.log(
                "Undo performed - Undo Stack:",
                this.undoStack.length,
                "Redo Stack:",
                this.redoStack.length
            );

            this.autosaveService.autosave();
        }
    }

    redo() {
        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
            console.log(
                "Redo performed - Undo Stack:",
                this.undoStack.length,
                "Redo Stack:",
                this.redoStack.length
            );

            this.autosaveService.autosave();
        }
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    createAddNodeCommand(node: BaseNode): Command {
        console.log("Creating add node command for node:", {
            id: node.id,
            type: node.type,
            position: node.position,
        });
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
        console.log(
            "Creating nodes change command:",
            changes.map((c) => {
                const base = { type: c.type };
                if ("id" in c) {
                    return {
                        ...base,
                        id: c.id,
                        ...(c.type === "position" && "position" in c
                            ? { position: c.position }
                            : {}),
                    };
                }
                return base;
            })
        );

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

            for (const change of endedDrags) {
                const dragStart = this.dragState.get(change.id);
                if (!dragStart) continue;

                const node = currentNodes.find((n) => n.id === change.id);
                if (!node) continue;

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
                // Check if source is an initialization node
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

        console.log("Creating edge with connection:", {
            source: connection.source,
            sourceHandle: connection.sourceHandle,
            target: connection.target,
            targetHandle: connection.targetHandle,
        });

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

        console.log("Created edge:", edge);

        return {
            execute: () => {
                useStore.setState((state) => {
                    console.log("Adding edge to store:", edge);
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
}
