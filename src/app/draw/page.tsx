"use client";

import React, {
    useCallback,
    ChangeEvent,
    useRef,
    useEffect,
    useState,
} from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    NodeTypes,
    ReactFlowInstance,
    Edge,
    MarkerType,
    Node,
    NodeChange,
    EdgeChange,
    Connection,
    SelectionMode,
    ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import "./reactflow.css";
import { saveAs } from "file-saver";
import { ComponentDrawer } from "@/components/ComponentDrawer";
import { NodeShape } from "@/components/ComponentManager";
import { nodeTypes } from "@/components/nodes/NodeRegistry";
import { Toolbar } from "@/components/Toolbar";
import { useFlowStore } from "@/lib/store/useFlowStore";
import { useUIStore } from "@/lib/store/useUIStore";
import { useProjectStore } from "@/lib/store/useProjectStore";
import exampleDiagram from "@/data/examplediagram.json";
import { Toaster, toast } from "sonner";
import { useHistoryStore } from "@/lib/store/useHistoryStore";
import { KeyboardShortcuts } from "@/lib/constants/shortcuts";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { PropertiesBar } from "@/components/PropertiesBar";
import { useEdgeStyleStore } from "@/lib/store/useEdgeStyleStore";
import { useNodeStyleStore } from "@/lib/store/useNodeStyleStore";

const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

export default function Draw() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        deleteNode,
        deleteEdge,
        updateNodeData,
        setNodes,
        setEdges,
        loadFlow,
        resetFlow,
    } = useFlowStore();

    const {
        addToHistory,
        undo,
        redo,
        canUndo,
        canRedo,
        clearHistory,
        debugHistory,
    } = useHistoryStore();

    const {
        snapToGrid,
        gridSize,
        miniMapVisible,
        controlsVisible,
        isSidebarOpen,
        setLastAction,
        lastAction,
        isDarkMode,
        toggleDarkMode,
        isShortcutsHelpOpen,
        toggleShortcutsHelp,
        setShortcutsHelpOpen,
    } = useUIStore();

    const {
        projectName,
        setProjectName,
        saveCurrentState,
        lastSaved,
        savedNodes,
        savedEdges,
        addRecentProject,
    } = useProjectStore();

    const { getEdgeStyle } = useEdgeStyleStore();
    const { getNodeStyle } = useNodeStyleStore();

    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
    const shouldCaptureHistory = useRef<boolean>(true);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialSetupComplete = useRef<boolean>(false);
    const hasInitialized = useRef<boolean>(false);

    const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
    const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);

    useEffect(() => {
        if (hasInitialized.current) {
            return;
        }

        console.log("Initializing session (first-time only)...");
        hasInitialized.current = true;

        const pastStates = useHistoryStore.getState().past;
        const hasPastStates = pastStates.length > 0;

        if (hasPastStates) {
            console.log("Found history states:", pastStates.length);
            debugHistory();

            const lastState = pastStates[pastStates.length - 1];
            console.log("Restoring latest state from history:", {
                nodes: lastState.nodes.length,
                edges: lastState.edges.length,
            });

            shouldCaptureHistory.current = false;
            loadFlow(lastState.nodes, lastState.edges);
            setLastAction("Restored from previous session");

            saveCurrentState(lastState.nodes, lastState.edges);

            setTimeout(() => {
                shouldCaptureHistory.current = true;
            }, 1500);
        } else if (savedNodes.length > 0 || savedEdges.length > 0) {
            console.log("No history found, loading from auto-save", {
                nodes: savedNodes.length,
                edges: savedEdges.length,
            });

            shouldCaptureHistory.current = false;

            const processedEdges = savedEdges.map((edge) => ({
                ...edge,
                markerEnd: edge.markerEnd || { type: MarkerType.Arrow },
                style: {
                    ...edge.style,
                    ...getEdgeStyle(edge.id),
                },
            }));

            loadFlow(savedNodes, processedEdges);
            setLastAction("Loaded from auto-save");

            setTimeout(() => {
                addToHistory(savedNodes, processedEdges);
                shouldCaptureHistory.current = true;
            }, 1000);
        } else {
            setTimeout(() => {
                shouldCaptureHistory.current = true;
            }, 1000);
        }
    }, []);

    const captureHistory = useCallback(
        debounce((nodes: Node[], edges: Edge[]) => {
            console.log("Debounced history capture", {
                nodes: nodes.length,
                edges: edges.length,
            });
            addToHistory(nodes, edges);
        }, 500),
        [addToHistory]
    );

    const saveStateToHistory = useCallback(() => {
        console.log("Explicitly saving state to history", {
            nodes: nodes.length,
            edges: edges.length,
        });
        addToHistory(nodes, edges);
    }, [nodes, edges, addToHistory]);

    useEffect(() => {
        if (
            shouldCaptureHistory.current &&
            (nodes.length > 0 || edges.length > 0)
        ) {
            console.log("State changed, scheduling history capture");
            captureHistory(nodes, edges);
        } else {
            console.log("Skipping history capture - change from undo/redo");
        }

        shouldCaptureHistory.current = true;
    }, [nodes, edges, captureHistory]);

    const handleUndo = useCallback(() => {
        console.log("Undo handler called");
        debugHistory();

        shouldCaptureHistory.current = false;

        const previous = undo();
        if (previous) {
            console.log("Applying previous state from undo:", {
                nodes: previous.nodes.length,
                edges: previous.edges.length,
            });

            loadFlow(previous.nodes, previous.edges);
            setLastAction("Undo");

            setTimeout(() => {
                debugHistory();
            }, 100);
        } else {
            console.log("No previous state to undo to");
        }
    }, [undo, loadFlow, setLastAction, debugHistory]);

    const handleRedo = useCallback(() => {
        console.log("Redo handler called");
        debugHistory();

        shouldCaptureHistory.current = false;

        const next = redo();
        if (next) {
            console.log("Applying next state from redo:", {
                nodes: next.nodes.length,
                edges: next.edges.length,
            });

            loadFlow(next.nodes, next.edges);
            setLastAction("Redo");

            setTimeout(() => {
                debugHistory();
            }, 100);
        } else {
            console.log("No next state to redo to");
        }
    }, [redo, loadFlow, setLastAction, debugHistory]);

    const shortcutActions = {
        SAVE: () => handleSave(),
        LOAD: () => handleLoadClick(),
        NEW: () => {
            if (
                window.confirm(
                    "Start a new diagram? Unsaved changes will be lost."
                )
            ) {
                resetFlow();
                clearHistory();
                setProjectName("Untitled Project");
                setLastAction("New diagram");
            }
        },
        UNDO: () => canUndo && handleUndo(),
        REDO: () => canRedo && handleRedo(),
        ZOOM_IN: () => handleZoomIn(),
        ZOOM_OUT: () => handleZoomOut(),
        FIT_VIEW: () => handleFitView(),
        TOGGLE_DARK_MODE: () => toggleDarkMode(),
        TOGGLE_SIDEBAR: () => useUIStore.getState().toggleSidebar(),
        TOGGLE_MINIMAP: () => useUIStore.getState().toggleMiniMap(),
        TOGGLE_CONTROLS: () => useUIStore.getState().toggleControls(),
        SHOW_SHORTCUTS: () => setShortcutsHelpOpen(true),
    };

    useKeyboardShortcuts(KeyboardShortcuts, shortcutActions);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    useEffect(() => {
        const syncTimer = setTimeout(() => {
            if (nodes.length > 0 || edges.length > 0) {
                console.log("Syncing project state with current flow", {
                    nodes: nodes.length,
                    edges: edges.length,
                });
                saveCurrentState(nodes, edges);
            }
        }, 1000);

        return () => clearTimeout(syncTimer);
    }, [nodes, edges, saveCurrentState]);

    useEffect(() => {
        const autoSaveTimer = setTimeout(() => {
            saveCurrentState(nodes, edges);
            setLastAction("Auto-saved");
        }, 10000);

        return () => clearTimeout(autoSaveTimer);
    }, [nodes, edges, saveCurrentState, setLastAction]);

    useEffect(() => {
        const handleLoadExample = () => {
            try {
                const loadedNodes = exampleDiagram.nodes.map((node: any) => ({
                    ...node,
                    draggable: true,
                    type: node.type || "rectangleNode",
                }));

                const loadedEdges = exampleDiagram.edges.map((edge: any) => ({
                    ...edge,
                    markerEnd: edge.markerEnd || { type: MarkerType.Arrow },
                }));

                loadFlow(loadedNodes, loadedEdges);
                saveCurrentState(loadedNodes, loadedEdges);

                if (reactFlowInstance.current) {
                    setTimeout(() => {
                        reactFlowInstance.current?.fitView({ padding: 0.2 });
                    }, 50);
                }

                setLastAction("Loaded example diagram");
            } catch (error) {
                console.error("Failed to load example diagram", error);
                setLastAction("Error: Failed to load example diagram");
            }
        };

        window.addEventListener("loadExampleDiagram", handleLoadExample);
        return () => {
            window.removeEventListener("loadExampleDiagram", handleLoadExample);
        };
    }, [loadFlow, saveCurrentState, setLastAction, reactFlowInstance]);

    const handleAddNode = (label: string, shape: NodeShape = "rectangle") => {
        addNode(label, shape);

        setTimeout(() => {
            const newlyAddedNode = nodes[nodes.length - 1];

            if (reactFlowInstance.current && newlyAddedNode) {
                reactFlowInstance.current.fitView({
                    padding: 0.5,
                    includeHiddenNodes: false,
                    duration: 400,
                    minZoom: 0.9,
                    maxZoom: 1.5,
                });
            }
            saveStateToHistory();
        }, 50);
        setLastAction(`Added ${shape} node: ${label}`);
    };

    const handleSave = () => {
        const nodesWithStyles = nodes.map((node) => ({
            ...node,
            style: undefined,
            storedStyle: getNodeStyle(node.id),
        }));

        const edgesWithStyles = edges.map((edge) => ({
            ...edge,
            style: undefined,
            storedStyle: getEdgeStyle(edge.id),
        }));

        const diagramData = JSON.stringify(
            {
                projectName,
                nodes: nodesWithStyles,
                edges: edgesWithStyles,
                defaultNodeStyle: useNodeStyleStore.getState().defaultStyle,
                defaultEdgeStyle: useEdgeStyleStore.getState().defaultStyle,
            },
            null,
            2
        );
        const blob = new Blob([diagramData], { type: "application/json" });
        saveAs(blob, `${projectName.replace(/\s+/g, "_")}.json`);
        saveCurrentState(nodes, edges);
        saveStateToHistory();
        addRecentProject(projectName);
        setLastAction(`Saved: ${projectName}`);
    };

    const handleLoad = (event: ChangeEvent<HTMLInputElement>) => {
        console.log("Starting file load process...");
        const fileReader = new FileReader();
        fileReader.onload = () => {
            console.log("File read complete");
            const content = fileReader.result;
            if (typeof content === "string") {
                try {
                    console.log("Parsing JSON data...");
                    const loadedData = JSON.parse(content);

                    if (
                        !loadedData.nodes ||
                        !Array.isArray(loadedData.nodes) ||
                        !loadedData.edges ||
                        !Array.isArray(loadedData.edges)
                    ) {
                        throw new Error(
                            "Invalid file format: Missing nodes or edges array"
                        );
                    }

                    if (loadedData.defaultNodeStyle) {
                        useNodeStyleStore
                            .getState()
                            .updateDefaultStyle(loadedData.defaultNodeStyle);
                    }
                    if (loadedData.defaultEdgeStyle) {
                        useEdgeStyleStore
                            .getState()
                            .updateDefaultStyle(loadedData.defaultEdgeStyle);
                    }

                    for (const node of loadedData.nodes) {
                        if (!node.id || !node.position || !node.data) {
                            throw new Error(
                                "Invalid node format: Missing required properties"
                            );
                        }

                        if (node.style) {
                            useNodeStyleStore
                                .getState()
                                .updateNodeStyle(node.id, node.style);
                        }
                    }

                    for (const edge of loadedData.edges) {
                        if (!edge.source || !edge.target) {
                            throw new Error(
                                "Invalid edge format: Missing source or target"
                            );
                        }

                        if (edge.style) {
                            const edgeId =
                                edge.id ||
                                `reactflow__edge-${edge.source}-${edge.target}`;
                            useEdgeStyleStore
                                .getState()
                                .updateEdgeStyle(edgeId, edge.style);
                        }
                    }

                    console.log("Loaded data:", loadedData);

                    console.log("Processing nodes...");
                    const loadedNodes = loadedData.nodes?.map((node: any) => {
                        const nodeType =
                            node.type === "ellipseNode"
                                ? "ellipseNode"
                                : "rectangleNode";

                        const processedNode = {
                            id: node.id,
                            type: nodeType,
                            position: node.position,
                            data: node.data || { label: "Node" },
                            draggable: true,
                            width: node.width || 150,
                            height: node.height || 40,
                            selected: false,
                            positionAbsolute: node.position,
                            style: {},
                        };

                        if (node.storedStyle) {
                            useNodeStyleStore
                                .getState()
                                .updateNodeStyle(node.id, node.storedStyle);
                        }

                        console.log(
                            `Processed node ${node.id}:`,
                            processedNode
                        );
                        return processedNode;
                    });

                    console.log("Processing edges...");
                    const loadedEdges = loadedData.edges?.map((edge: any) => {
                        console.log("Processing edge:", edge);
                        const edgeId =
                            edge.id ||
                            `reactflow__edge-${edge.source}-${edge.target}`;

                        const processedEdge = {
                            id: edgeId,
                            source: edge.source,
                            target: edge.target,
                            sourceHandle: edge.sourceHandle,
                            targetHandle: edge.targetHandle,
                            markerEnd: edge.markerEnd || {
                                type: MarkerType.Arrow,
                            },
                            style: {},
                            animated: edge.animated || false,
                        };

                        if (edge.storedStyle) {
                            useEdgeStyleStore
                                .getState()
                                .updateEdgeStyle(edgeId, edge.storedStyle);
                        }

                        console.log(
                            `Processed edge ${processedEdge.id}:`,
                            processedEdge
                        );
                        return processedEdge;
                    });

                    if (loadedData.projectName) {
                        console.log(
                            "Setting project name:",
                            loadedData.projectName
                        );
                        setProjectName(loadedData.projectName);
                        addRecentProject(loadedData.projectName);
                    }

                    console.log("Clearing existing nodes and edges...");
                    setNodes([]);
                    setEdges([]);

                    console.log("Starting load timeout...");
                    setTimeout(() => {
                        console.log("Loading nodes and edges into flow...");
                        console.log("Nodes to load:", loadedNodes);
                        console.log("Edges to load:", loadedEdges);
                        loadFlow(loadedNodes, loadedEdges);

                        console.log("Saving current state...");
                        saveCurrentState(loadedNodes, loadedEdges);

                        setTimeout(() => {
                            saveStateToHistory();
                        }, 100);

                        if (reactFlowInstance.current) {
                            console.log("Fitting view...");
                            reactFlowInstance.current.fitView({ padding: 0.2 });
                        }

                        console.log("Load process complete");
                        toast.success("Diagram loaded successfully");
                        setLastAction(
                            `Loaded: ${
                                loadedData.projectName || "Unnamed Project"
                            }`
                        );
                    }, 50);
                } catch (error: any) {
                    console.error("Failed to parse diagram file", error);
                    toast.error(
                        `Failed to load diagram: ${
                            error.message || "Unknown error"
                        }`
                    );
                    setLastAction("Error: Failed to load diagram");
                }
            }
        };

        fileReader.onerror = () => {
            toast.error("Failed to read file");
            setLastAction("Error: Failed to read file");
        };

        const files = event.target.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.type !== "application/json") {
                toast.error("Invalid file type. Please select a JSON file");
                return;
            }
            fileReader.readAsText(file);
        }
    };

    const handleLoadClick = () => {
        document.getElementById("load-file-input")?.click();
    };

    const handleZoomIn = () => {
        if (reactFlowInstance.current) {
            reactFlowInstance.current.zoomIn();
            setLastAction("Zoomed in");
        }
    };

    const handleZoomOut = () => {
        if (reactFlowInstance.current) {
            reactFlowInstance.current.zoomOut();
            setLastAction("Zoomed out");
        }
    };

    const handleFitView = () => {
        if (reactFlowInstance.current) {
            reactFlowInstance.current.fitView();
            setLastAction("Fitted view");
        }
    };

    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const significantChange = changes.some(
                (change) =>
                    change.type === "remove" ||
                    (change.type === "position" &&
                        change.position &&
                        change.dragging === false) ||
                    change.type === "select"
            );

            onNodesChange(changes);

            if (significantChange) {
                setTimeout(() => {
                    saveStateToHistory();
                    if (changes.some((change) => change.type === "select")) {
                        setLastAction("Selected node(s)");
                    } else {
                        console.log(
                            "Saved history after significant node change"
                        );
                    }
                }, 50);
            }
        },
        [onNodesChange, saveStateToHistory, setLastAction]
    );

    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            const significantChange = changes.some(
                (change) => change.type === "remove"
            );
            onEdgesChange(changes);

            if (significantChange) {
                setTimeout(() => {
                    saveStateToHistory();
                    console.log("Saved history after significant edge change");
                }, 50);
            }
        },
        [onEdgesChange, saveStateToHistory]
    );

    const handleConnect = useCallback(
        (params: Connection) => {
            console.log("Creating new connection:", params);
            const edgeStyle = getEdgeStyle(params.source + "-" + params.target);
            console.log("Applying edge style to new connection:", edgeStyle);
            onConnect({
                ...params,
                markerEnd: { type: MarkerType.Arrow },
                style: {
                    stroke: edgeStyle.stroke,
                    strokeWidth: edgeStyle.strokeWidth,
                    strokeDasharray:
                        edgeStyle.strokeStyle === "dashed"
                            ? "5,5"
                            : edgeStyle.strokeStyle === "dotted"
                            ? "1,5"
                            : undefined,
                    opacity: edgeStyle.opacity,
                },
                animated: edgeStyle.animated,
            } as any);
            setTimeout(() => {
                saveStateToHistory();
                console.log("Saved history after connection");
            }, 50);
        },
        [onConnect, saveStateToHistory, getEdgeStyle]
    );

    const handleDeleteNode = useCallback(
        (nodeId: string) => {
            deleteNode(nodeId);
            setTimeout(() => {
                saveStateToHistory();
                setLastAction(`Deleted node: ${nodeId}`);
            }, 50);
        },
        [deleteNode, saveStateToHistory, setLastAction]
    );

    const handleDeleteEdge = useCallback(
        (edgeId: string) => {
            deleteEdge(edgeId);
            setTimeout(() => {
                saveStateToHistory();
                setLastAction(`Deleted connection`);
            }, 50);
        },
        [deleteEdge, saveStateToHistory, setLastAction]
    );

    useEffect(() => {
        const handleBeforeUnload = () => {
            console.log("Before unload - saving final state");
            addToHistory(nodes, edges);
            saveCurrentState(nodes, edges);
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [nodes, edges, addToHistory, saveCurrentState]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (reactFlowInstance.current) {
                reactFlowInstance.current.fitView({
                    padding: 0.5,
                    duration: 200,
                    includeHiddenNodes: false,
                });

                if (nodes.length === 1) {
                    reactFlowInstance.current.setCenter(
                        nodes[0].position.x,
                        nodes[0].position.y,
                        { zoom: 1.2, duration: 300 }
                    );
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [reactFlowInstance.current]);

    useEffect(() => {
        console.log("Updating edge styles for all edges");
        if (edges.length === 0) return;

        const updatedEdges = edges.map((edge) => {
            const edgeStyle = getEdgeStyle(edge.id);
            console.log("Edge style for", edge.id, ":", edgeStyle);

            const isSelected = selectedEdges.some((e) => e.id === edge.id);

            return {
                ...edge,

                className: isSelected ? "selected-edge" : "",
                style: {
                    ...edge.style,
                    stroke: edgeStyle.stroke,
                    strokeWidth: isSelected
                        ? edgeStyle.strokeWidth + 2
                        : edgeStyle.strokeWidth,
                    strokeDasharray:
                        edgeStyle.strokeStyle === "dashed"
                            ? "5,5"
                            : edgeStyle.strokeStyle === "dotted"
                            ? "1,5"
                            : undefined,
                    opacity: edgeStyle.opacity,

                    filter: isSelected
                        ? "drop-shadow(0 0 5px #7c3aed)"
                        : undefined,
                },
                animated: edgeStyle.animated,
                markerEnd: edge.markerEnd || { type: MarkerType.Arrow },
            };
        });
        console.log("Updated edges with new styles:", updatedEdges);
        setEdges(updatedEdges);
    }, [getEdgeStyle, selectedEdges]);

    return (
        <div
            className={`h-screen w-full flex flex-col ${
                isDarkMode
                    ? "dark bg-gray-900 text-white"
                    : "bg-white text-black"
            }`}
        >
            <ReactFlowProvider>
                <Toaster richColors position="top-center" />
                <div className="flex flex-1 overflow-hidden">
                    <ComponentDrawer onAddNode={handleAddNode} />
                    <div className="flex-1 flex flex-col relative">
                        <Toolbar
                            onSave={handleSave}
                            onLoad={handleLoad}
                            onZoomIn={handleZoomIn}
                            onZoomOut={handleZoomOut}
                            onFitView={handleFitView}
                            onToggleDarkMode={toggleDarkMode}
                            isDarkMode={isDarkMode}
                            onUndo={canUndo ? handleUndo : undefined}
                            onRedo={canRedo ? handleRedo : undefined}
                            onShowShortcuts={() => setShortcutsHelpOpen(true)}
                            lastAction={lastAction}
                        />
                        <div className="flex-1 h-full relative">
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={handleNodesChange}
                                onEdgesChange={handleEdgesChange}
                                onConnect={handleConnect}
                                snapToGrid={snapToGrid}
                                snapGrid={[gridSize, gridSize]}
                                nodeTypes={nodeTypes}
                                nodesDraggable={true}
                                selectionMode={SelectionMode.Partial}
                                selectionOnDrag={true}
                                multiSelectionKeyCode={["Control", "Meta"]}
                                selectNodesOnDrag={true}
                                onSelectionChange={(params) => {
                                    console.log(
                                        "Selection changed from ReactFlow:",
                                        params
                                    );
                                    console.log(
                                        "Selected nodes:",
                                        params.nodes.length
                                    );
                                    console.log(
                                        "Selected edges:",
                                        params.edges.length
                                    );

                                    setSelectedNodes(params.nodes);
                                    setSelectedEdges(params.edges);
                                }}
                                panOnDrag={[2]}
                                defaultEdgeOptions={{
                                    markerEnd: { type: MarkerType.Arrow },
                                }}
                                fitView
                                fitViewOptions={{ padding: 0.2 }}
                                onInit={(instance) => {
                                    reactFlowInstance.current = instance;
                                }}
                                deleteKeyCode={["Backspace", "Delete"]}
                                className="w-full h-full"
                            >
                                {miniMapVisible && <MiniMap />}
                                {controlsVisible && <Controls />}
                                <Background
                                    variant={BackgroundVariant.Dots}
                                    gap={12}
                                    size={1}
                                    className={
                                        isDarkMode
                                            ? "bg-gray-800"
                                            : "bg-gray-100"
                                    }
                                />
                            </ReactFlow>
                        </div>
                        {/* Properties bar on the right side */}
                        <PropertiesBar
                            selectedNodes={selectedNodes}
                            selectedEdges={selectedEdges}
                        />
                    </div>
                </div>

                {/* Shortcuts help dialog */}
                <ShortcutsHelp
                    isOpen={isShortcutsHelpOpen}
                    onClose={() => setShortcutsHelpOpen(false)}
                />
            </ReactFlowProvider>
        </div>
    );
}
