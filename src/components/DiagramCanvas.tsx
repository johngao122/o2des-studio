import React, {
    useCallback,
    DragEvent,
    useMemo,
    useEffect,
    useRef,
    useState,
} from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Panel,
    Viewport,
    NodeChange,
    ReactFlowProvider,
    ConnectionMode,
    Edge,
    useReactFlow,
    OnSelectionChangeParams,
    SelectionMode,
    Connection,
} from "reactflow";
import { useStore } from "@/store";
import { nodeTypes } from "@/components/nodes";
import { edgeTypes } from "@/components/edges";
import { NodeFactory } from "@/factories/NodeFactory";
import { ViewController } from "@/controllers/ViewController";
import { NodeController } from "@/controllers/NodeController";
import { CommandController } from "@/controllers/CommandController";
import { AutosaveService } from "@/services/AutosaveService";
import { DragProxy } from "./DragProxy";
import { screenToFlowPosition } from "@/lib/utils/coordinates";
import { GRID_SIZE } from "@/lib/utils/math";
import "./diagram-canvas.css";

const viewController = new ViewController();
const nodeFactory = new NodeFactory();
const nodeController = new NodeController();
const commandController = CommandController.getInstance();
const autosaveService = AutosaveService.getInstance();

const flowOptions = {
    nodeTypes,
    edgeTypes,
    nodesDraggable: true,
    nodesConnectable: true,
    elementsSelectable: true,
    connectOnClick: false,
    connectionMode: ConnectionMode.Loose,
    selectNodesOnDrag: true,
    selectionOnDrag: true,
    panOnScroll: true,
    panOnDrag: [2] as number[],
    elevateNodesOnSelect: false,
    elevateEdgesOnSelect: false,
    defaultViewport: { x: 0, y: 0, zoom: 1 },
    minZoom: 0.1,
    maxZoom: 4,
    snapToGrid: true,
    zoomOnScroll: true,
    zoomOnPinch: true,
    snapGrid: [GRID_SIZE, GRID_SIZE] as [number, number],
} as const;

function FlowCanvas() {
    const nodes = useStore((state) => state.nodes);
    const edges = useStore((state) => state.edges);
    const viewportTransform = useStore((state) => state.viewportTransform);
    const dragProxy = useStore((state) => state.dragProxy);
    const onEdgesChange = useStore.getState().onEdgesChange;
    const onConnect = useStore.getState().onConnect;
    const startDragProxy = useStore.getState().startDragProxy;
    const updateDragProxy = useStore.getState().updateDragProxy;
    const endDragProxy = useStore.getState().endDragProxy;
    const reactFlowInstance = useReactFlow();
    const dragTimeoutRef = useRef<number | null>(null);
    const mouseStartPositionRef = useRef<{ x: number; y: number } | null>(null);
    const [mouseCoordinates, setMouseCoordinates] = useState<{
        screen: { x: number; y: number };
        flow: { x: number; y: number };
    } | null>(null);

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

    const handleNodeDataUpdate = useCallback(
        (nodeId: string, newData: Record<string, unknown>) => {
            const node = nodeController.getNode(nodeId);
            if (node) {
                nodeController.updateNode(nodeId, {
                    ...node,
                    data: { ...node.data, ...newData },
                });
            }
        },
        []
    );

    const nodesWithData = useMemo(() => {
        const sortedNodes = [...nodes].sort((a, b) => {
            if (a.type === "moduleFrame" && b.type !== "moduleFrame") {
                return -1;
            }
            if (a.type !== "moduleFrame" && b.type === "moduleFrame") {
                return 1;
            }

            return 0;
        });

        return sortedNodes.map((node) => {
            const isSelected = useStore
                .getState()
                .selectedElements.nodes.includes(node.id);
            const isDragProxyActive = useStore.getState().dragProxy.isActive;

            const nodeProps =
                isDragProxyActive && isSelected ? { draggable: false } : {};

            return {
                ...node,
                ...nodeProps,
                data: {
                    ...node.data,
                    updateNodeData: handleNodeDataUpdate,
                },
            };
        });
    }, [nodes, handleNodeDataUpdate]);

    const handleConnect = useCallback(
        (params: Connection) => {
            const connection = {
                source: params.source,
                sourceHandle: params.sourceHandle,
                target: params.target,
                targetHandle: params.targetHandle,
            };

            if (!connection.sourceHandle || !connection.targetHandle) {
                console.warn("Connection missing handle IDs:", connection);
                return;
            }

            onConnect(connection);
        },
        [onConnect]
    );

    const onDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();

            const type = event.dataTransfer.getData("application/reactflow");
            const reactFlowBounds = event.currentTarget.getBoundingClientRect();

            const viewport = reactFlowInstance.getViewport();

            const screenPosition = {
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            };

            const flowPosition = screenToFlowPosition(screenPosition, viewport);

            const newNode = nodeFactory.createNode(type, flowPosition);
            const command = commandController.createAddNodeCommand(newNode);
            commandController.execute(command);
        },
        [reactFlowInstance]
    );

    const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onMoveEnd = useCallback(
        (event: MouseEvent | TouchEvent, viewport: Viewport) => {
            viewController.setViewport(viewport.x, viewport.y, viewport.zoom);

            autosaveService.autosave();
        },
        []
    );

    const handleEdgeClick = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            const { onEdgesChange } = useStore.getState();

            const isMultiSelect = event.shiftKey;

            if (isMultiSelect) {
                const currentEdges = useStore.getState().selectedElements.edges;
                const isSelected = currentEdges.includes(edge.id);

                onEdgesChange([
                    {
                        id: edge.id,
                        type: "select",
                        selected: !isSelected,
                    },
                ]);
            } else {
                const { onNodesChange } = useStore.getState();
                const selectedNodes =
                    useStore.getState().selectedElements.nodes;

                if (selectedNodes.length > 0) {
                    onNodesChange(
                        selectedNodes.map((nodeId) => ({
                            id: nodeId,
                            type: "select",
                            selected: false,
                        }))
                    );
                }

                onEdgesChange([
                    {
                        id: edge.id,
                        type: "select",
                        selected: true,
                    },
                ]);
            }

            autosaveService.autosave();
        },
        []
    );

    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const { onNodesChange } = useStore.getState();

            const selectionChanges = changes.filter(
                (change) => change.type === "select"
            );

            const positionChanges = changes.filter(
                (change) => change.type === "position"
            );

            const otherChanges = changes.filter(
                (change) =>
                    change.type !== "select" && change.type !== "position"
            );

            if (selectionChanges.length > 0) {
                const isDragOperation = changes.some(
                    (change) =>
                        change.type === "position" ||
                        (change.type === "select" && changes.length > 5)
                );

                if (!isDragOperation) {
                    const { onEdgesChange } = useStore.getState();
                    const selectedEdges =
                        useStore.getState().selectedElements.edges;

                    if (selectedEdges.length > 0) {
                        requestAnimationFrame(() => {
                            onEdgesChange(
                                selectedEdges.map((edgeId) => ({
                                    id: edgeId,
                                    type: "select" as const,
                                    selected: false,
                                }))
                            );
                        });
                    }
                }

                onNodesChange(selectionChanges);
            }

            if (positionChanges.length > 0) {
                const { nodes, edges } = useStore.getState();
                const selectedNodeIds =
                    useStore.getState().selectedElements.nodes;
                const selectedEdgeIds =
                    useStore.getState().selectedElements.edges;

                const DRAG_PROXY_THRESHOLD = 3;
                const shouldUseDragProxy =
                    selectedNodeIds.length >= DRAG_PROXY_THRESHOLD;

                const isDragProxyActive = dragProxy.isActive;

                const startingDrag = positionChanges.some(
                    (change) =>
                        change.type === "position" &&
                        change.dragging === true &&
                        selectedNodeIds.includes(change.id)
                );

                const selectedNodes = nodes.filter((node) =>
                    selectedNodeIds.includes(node.id)
                );

                if (isDragProxyActive) {
                    const firstChange = positionChanges[0];
                    if (
                        firstChange &&
                        "position" in firstChange &&
                        firstChange.position
                    ) {
                        updateDragProxy(firstChange.position);
                    }

                    const isDragEnd = positionChanges.some(
                        (change) =>
                            change.type === "position" &&
                            change.dragging === false
                    );

                    if (isDragEnd) {
                        endDragProxy(true);
                        mouseStartPositionRef.current = null;
                    }

                    return;
                } else if (
                    startingDrag &&
                    shouldUseDragProxy &&
                    !isDragProxyActive
                ) {
                    const firstChange = positionChanges[0];
                    if (
                        firstChange &&
                        "position" in firstChange &&
                        firstChange.position
                    ) {
                        mouseStartPositionRef.current = firstChange.position;
                    }

                    startDragProxy(
                        selectedNodes,
                        edges.filter((edge) =>
                            selectedEdgeIds.includes(edge.id)
                        )
                    );

                    return;
                } else {
                    onNodesChange(positionChanges);

                    if (dragTimeoutRef.current !== null) {
                        clearTimeout(dragTimeoutRef.current);
                        dragTimeoutRef.current = null;
                    }
                }
            }

            if (otherChanges.length > 0) {
                onNodesChange(otherChanges);
            }

            const isExplicitSelectionChange =
                selectionChanges.length > 0 &&
                !changes.some((change) => change.type === "position");

            if (isExplicitSelectionChange) {
                autosaveService.autosave();
            }
        },
        [startDragProxy, updateDragProxy, endDragProxy, dragProxy.isActive]
    );

    const handleSelectionChange = useCallback(
        ({ nodes, edges }: OnSelectionChangeParams) => {
            if (nodes.length > 0 || edges.length > 0) {
                const selectedEdgeIds = edges.map((e) => e.id);
                const { onEdgesChange } = useStore.getState();

                if (selectedEdgeIds.length > 0) {
                    requestAnimationFrame(() => {
                        onEdgesChange(
                            selectedEdgeIds.map((id) => ({
                                id,
                                type: "select" as const,
                                selected: true,
                            }))
                        );

                        autosaveService.autosave();
                    });
                } else {
                    autosaveService.autosave();
                }
            }
        },
        []
    );

    const handleMouseMove = useCallback(
        (event: React.MouseEvent) => {
            const reactFlowBounds = event.currentTarget.getBoundingClientRect();
            const viewport = reactFlowInstance.getViewport();

            const screenPosition = {
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            };

            const flowPosition = screenToFlowPosition(screenPosition, viewport);

            setMouseCoordinates({
                screen: screenPosition,
                flow: flowPosition,
            });
        },
        [reactFlowInstance]
    );

    useEffect(() => {
        return () => {
            if (dragTimeoutRef.current !== null) {
                clearTimeout(dragTimeoutRef.current);
                dragTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && dragProxy.isActive) {
                endDragProxy(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [dragProxy.isActive, endDragProxy]);

    return (
        <div
            className={`flex-1 h-full ${
                dragProxy.isActive ? "nodes-locked" : ""
            }`}
            onDrop={onDrop}
            onDragOver={onDragOver}
        >
            <ReactFlow
                nodes={nodesWithData}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={handleConnect}
                onSelectionChange={handleSelectionChange}
                onMoveEnd={onMoveEnd}
                onEdgeClick={handleEdgeClick}
                onMouseMove={handleMouseMove}
                {...flowOptions}
                nodesDraggable={!dragProxy.isActive}
                deleteKeyCode={["Backspace", "Delete"]}
                selectionMode={SelectionMode.Partial}
                connectionRadius={25}
                zoomOnDoubleClick={false}
                edgesFocusable={true}
                noDragClassName="nodrag"
            >
                <Background />
                <Controls />
                <MiniMap />
                <DragProxy />
                <Panel
                    position="top-left"
                    className="bg-white dark:bg-zinc-800 p-2 rounded shadow-lg"
                >
                    <h1 className="text-xl font-bold">O²DES Studio</h1>
                </Panel>
                <Panel
                    position="bottom-right"
                    className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded shadow-lg text-xs"
                >
                    <div className="text-gray-500 dark:text-gray-400">
                        <div>
                            Drag to select • Right-click to pan • Shift+click
                            for multi-select
                        </div>
                    </div>
                </Panel>
                <Panel
                    position="bottom-left"
                    className="bg-white/80 dark:bg-zinc-800/80 p-2 rounded shadow-lg text-xs font-mono"
                >
                    {mouseCoordinates ? (
                        <div className="text-gray-600 dark:text-gray-300 space-y-1">
                            <div>
                                Screen: ({mouseCoordinates.screen.x.toFixed(0)},{" "}
                                {mouseCoordinates.screen.y.toFixed(0)})
                            </div>
                            <div>
                                Flow: ({mouseCoordinates.flow.x.toFixed(1)},{" "}
                                {mouseCoordinates.flow.y.toFixed(1)})
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-400 dark:text-gray-500">
                            Move mouse to see coordinates
                        </div>
                    )}
                </Panel>
            </ReactFlow>
        </div>
    );
}

const MemoizedFlowCanvas = React.memo(FlowCanvas);

export function DiagramCanvas() {
    return (
        <ReactFlowProvider>
            <MemoizedFlowCanvas />
        </ReactFlowProvider>
    );
}
