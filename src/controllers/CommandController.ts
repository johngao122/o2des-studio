import { useStore } from "../store";
import { BaseNode, BaseEdge } from "../types/base";
import {
    NodeChange,
    EdgeChange,
    Connection,
    Viewport,
    NodePositionChange,
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
        // Create a descriptive string for the command
        const commandDesc = command.execute.toString().slice(0, 150) + "...";
        console.log("Executing command:", commandDesc);

        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack when new command is executed
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

    // Command factory methods
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
        const originalNode = useStore
            .getState()
            .nodes.find((n) => n.id === nodeId);
        if (!originalNode) throw new Error("Node not found");

        return {
            execute: () => {
                useStore.setState((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === nodeId ? { ...node, ...updates } : node
                    ),
                }));
            },
            undo: () => {
                useStore.setState((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === nodeId ? originalNode : node
                    ),
                }));
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

        // Only handle position changes - ignore all other types
        const positionChanges = changes.filter(
            (change): change is NodePositionChange =>
                change.type === "position" &&
                // Only handle position changes for existing nodes
                useStore.getState().nodes.some((n) => n.id === change.id)
        );

        if (positionChanges.length > 0) {
            return this.handleDragChanges(positionChanges);
        }

        return null;
    }

    private handleDragChanges(changes: NodePositionChange[]): Command | null {
        const currentNodes = useStore.getState().nodes;

        // Process each drag change
        for (const change of changes) {
            if (!change.dragging) continue;

            // If this is the start of a drag operation
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

        // Handle completed drags
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

        // For ongoing drags, just update the position without creating a command
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
        // Filter out selection changes
        const nonSelectionChanges = changes.filter(
            (change) => change.type !== "select"
        );

        // If there are no non-selection changes, return null
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

    createConnectCommand(connection: Connection): Command {
        if (!connection.source || !connection.target)
            throw new Error("Invalid connection");

        const edge: BaseEdge = {
            id: nanoid(),
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            conditions: [],
        };

        return {
            execute: () => {
                useStore.setState((state) => ({
                    edges: addEdge(edge, state.edges) as BaseEdge[],
                }));
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
