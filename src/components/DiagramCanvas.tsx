import React, { useCallback, DragEvent, useMemo, useEffect } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Panel,
    Node,
    Viewport,
    NodeChange,
    ReactFlowProvider,
    ConnectionMode,
    Edge,
    applyNodeChanges,
    useReactFlow,
} from "reactflow";
import { useStore } from "@/store";
import { nodeTypes } from "@/components/nodes";
import { NodeFactory } from "@/factories/NodeFactory";
import { ViewController } from "@/controllers/ViewController";
import { NodeController } from "@/controllers/NodeController";
import { CommandController } from "@/controllers/CommandController";
import { BaseNode } from "@/types/base";

// Define static instances and options outside component
const viewController = new ViewController();
const nodeFactory = new NodeFactory();
const nodeController = new NodeController();
const commandController = CommandController.getInstance();

// Define flow options statically
const flowOptions = {
    nodeTypes,
    nodesDraggable: true,
    nodesConnectable: true,
    elementsSelectable: true,
    connectOnClick: false,
    connectionMode: ConnectionMode.Loose,
} as const;

function FlowCanvas() {
    const { nodes, edges, onEdgesChange, onConnect, viewportTransform } =
        useStore();
    const reactFlowInstance = useReactFlow();

    const updateViewport = useCallback(
        (x: number, y: number, zoom: number) => {
            reactFlowInstance.setViewport({ x, y, zoom });
        },
        [reactFlowInstance]
    );

    useEffect(() => {
        viewController.setViewportUpdater(updateViewport);
    }, [updateViewport]);

    useEffect(() => {
        if (reactFlowInstance) {
            reactFlowInstance.setViewport(viewportTransform);
        }
    }, [reactFlowInstance, viewportTransform]);

    const handleNodeDataUpdate = useCallback((nodeId: string, newData: any) => {
        const node = nodeController.getNode(nodeId);
        if (node) {
            nodeController.updateNode(nodeId, {
                ...node,
                data: { ...node.data, ...newData },
            });
        }
    }, []);

    // Memoize the nodes with their data
    const nodesWithData = useMemo(
        () =>
            nodes.map((node) => ({
                ...node,
                data: {
                    ...node.data,
                    updateNodeData: handleNodeDataUpdate,
                },
            })),
        [nodes, handleNodeDataUpdate]
    );

    const handleConnect = useCallback(
        (params: any) => {
            // Type the params properly
            const connection = {
                source: params.source,
                sourceHandle: params.sourceHandle,
                target: params.target,
                targetHandle: params.targetHandle,
            };

            // Only create connection if we have valid handles
            if (!connection.sourceHandle || !connection.targetHandle) {
                console.warn("Connection missing handle IDs:", connection);
                return;
            }

            console.log("Creating connection:", connection);
            onConnect(connection);
        },
        [onConnect]
    );

    const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        const type = event.dataTransfer.getData("application/reactflow");
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        const position = {
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        };

        const newNode = nodeFactory.createNode(type, position);
        const command = commandController.createAddNodeCommand(newNode);
        commandController.execute(command);
    }, []);

    const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onMoveEnd = useCallback((event: any, viewport: Viewport) => {
        viewController.setViewport(viewport.x, viewport.y, viewport.zoom);
    }, []);

    const handleEdgeClick = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            console.log("Edge selected:", {
                id: edge.id,
                source: edge.source,
                sourceHandle: edge.sourceHandle,
                target: edge.target,
                targetHandle: edge.targetHandle,
            });
        },
        []
    );

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        // Handle selection changes directly through the store
        const selectionChanges = changes.filter(
            (change) => change.type === "select"
        );
        if (selectionChanges.length > 0) {
            useStore.setState((state) => ({
                nodes: applyNodeChanges(
                    selectionChanges,
                    state.nodes
                ) as BaseNode[],
            }));
        }

        // Handle other changes through command controller
        const command = commandController.createNodesChangeCommand(changes);
        if (command) {
            commandController.execute(command);
        }
    }, []);

    return (
        <ReactFlow
            nodes={nodesWithData}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onEdgeClick={handleEdgeClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onMoveEnd={onMoveEnd}
            {...flowOptions}
            className="bg-zinc-50 dark:bg-zinc-900"
        >
            <Background />
            <Controls />
            <MiniMap />
            <Panel
                position="top-left"
                className="bg-white dark:bg-zinc-800 p-2 rounded shadow-lg"
            >
                <h1 className="text-xl font-bold">O²DES Studio</h1>
            </Panel>
        </ReactFlow>
    );
}

const MemoizedFlowCanvas = React.memo(FlowCanvas);

export function DiagramCanvas() {
    return (
        <div className="flex-1">
            <ReactFlowProvider>
                <MemoizedFlowCanvas />
            </ReactFlowProvider>
        </div>
    );
}
