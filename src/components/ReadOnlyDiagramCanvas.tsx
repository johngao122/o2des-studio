import React, { useMemo } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    ConnectionMode,
    SelectionMode,
} from "reactflow";
import { nodeTypes } from "@/components/nodes";
import { edgeTypes } from "@/components/edges";
import { BaseNode, BaseEdge } from "@/types/base";
import { GRID_SIZE } from "@/lib/utils/math";
import "reactflow/dist/style.css";

interface ReadOnlyDiagramCanvasProps {
    nodes: BaseNode[];
    edges: BaseEdge[];
    className?: string;
}

const flowOptions = {
    nodeTypes,
    edgeTypes,
    nodesDraggable: false,
    nodesConnectable: false,
    elementsSelectable: false,
    connectOnClick: false,
    connectionMode: ConnectionMode.Loose,
    selectNodesOnDrag: false,
    selectionOnDrag: false,
    panOnScroll: true,
    panOnDrag: [1, 2] as number[],
    elevateNodesOnSelect: false,
    elevateEdgesOnSelect: false,
    defaultViewport: { x: 0, y: 0, zoom: 1 },
    minZoom: 0.1,
    maxZoom: 4,
    snapToGrid: true,
    zoomOnScroll: true,
    zoomOnPinch: true,
    snapGrid: [GRID_SIZE, GRID_SIZE] as [number, number],
    deleteKeyCode: null,
    selectionMode: SelectionMode.Partial,
    connectionRadius: 25,
    zoomOnDoubleClick: false,
    edgesFocusable: false,
    noDragClassName: "nodrag",
} as const;

function ReadOnlyFlowCanvas({
    nodes,
    edges,
    className,
}: ReadOnlyDiagramCanvasProps) {
    const sortedNodes = useMemo(() => {
        return [...nodes].sort((a, b) => {
            if (a.type === "moduleFrame" && b.type !== "moduleFrame") {
                return -1;
            }
            if (a.type !== "moduleFrame" && b.type === "moduleFrame") {
                return 1;
            }
            return 0;
        });
    }, [nodes]);

    const readOnlyNodes = useMemo(() => {
        return sortedNodes.map((node) => ({
            ...node,
            data: {
                ...node.data,

                updateNodeData: undefined,
            },
        }));
    }, [sortedNodes]);

    return (
        <div className={`h-full ${className || ""}`}>
            <ReactFlow
                nodes={readOnlyNodes}
                edges={edges}
                {...flowOptions}
                fitView
                fitViewOptions={{
                    padding: 0.2,
                    includeHiddenNodes: false,
                }}
            >
                <Background />
                <Controls />
                <MiniMap
                    nodeStrokeWidth={3}
                    nodeColor="#374151"
                    nodeBorderRadius={2}
                />
            </ReactFlow>
        </div>
    );
}

export function ReadOnlyDiagramCanvas({
    nodes,
    edges,
    className,
}: ReadOnlyDiagramCanvasProps) {
    return (
        <ReactFlowProvider>
            <ReadOnlyFlowCanvas
                nodes={nodes}
                edges={edges}
                className={className}
            />
        </ReactFlowProvider>
    );
}
