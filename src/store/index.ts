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
}

interface SerializedState {
    nodes: BaseNode[];
    edges: BaseEdge[];
}

export const useStore = create<StoreState>((set, get) => ({
    nodes: [],
    edges: [],
    selectedElements: { nodes: [], edges: [] },
    viewportTransform: { x: 0, y: 0, zoom: 1 },

    onNodesChange: (changes: NodeChange[]) => {
        // Handle selection changes directly
        const selectionChanges = changes.filter(
            (change) => change.type === "select"
        );
        if (selectionChanges.length > 0) {
            const newNodes = applyNodeChanges(
                selectionChanges,
                get().nodes
            ) as BaseNode[];
            set({ nodes: newNodes });
            return; // Exit early for selection changes
        }

        // Only handle position changes for existing nodes
        const positionChanges = changes.filter(
            (change) =>
                change.type === "position" &&
                get().nodes.some((n) => n.id === change.id)
        );

        if (positionChanges.length > 0) {
            const command =
                commandController.createNodesChangeCommand(positionChanges);
            if (command) {
                commandController.execute(command);
            }
        }
    },

    onEdgesChange: (changes: EdgeChange[]) => {
        // Handle selection changes directly
        const selectionChanges = changes.filter(
            (change) => change.type === "select"
        );
        if (selectionChanges.length > 0) {
            const newEdges = applyEdgeChanges(
                selectionChanges,
                get().edges
            ) as BaseEdge[];
            set({ edges: newEdges });
        }

        // Handle other changes through command pattern
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
}));
