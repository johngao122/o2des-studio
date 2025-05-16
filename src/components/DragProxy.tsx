import React, { useEffect, useRef, useLayoutEffect, useState } from "react";
import { useStore } from "@/store";
import { useReactFlow, getNodesBounds } from "reactflow";
import { Position, ViewportTransform } from "@/lib/utils/coordinates";
import { createPortal } from "react-dom";

/**
 * DragProxy Component
 *
 * Displays a lightweight visual representation when dragging multiple elements
 * instead of rendering all nodes/edges in real-time.
 *
 * Performance benefits:
 * 1. Prevents expensive re-rendering of complex nodes during drag
 * 2. Only updates actual node positions once at the end of the drag
 * 3. Uses a batched command for undo/redo operations
 *
 * The drag proxy activates when 3+ total components (nodes + edges) are selected.
 * All operations are batched into a single undo/redo stack entry.
 */
export const DragProxy = () => {
    const { dragProxy } = useStore();
    const reactFlowInstance = useReactFlow();
    const proxyRef = useRef<HTMLDivElement>(null);
    const [viewportElement, setViewportElement] = useState<HTMLElement | null>(
        null
    );

    if (
        !dragProxy.isActive ||
        !dragProxy.currentPosition ||
        !dragProxy.startPosition ||
        (dragProxy.nodesSnapshot?.length === 0 &&
            dragProxy.edgesSnapshot?.length === 0) ||
        !viewportElement
    ) {
        return null;
    }

    const nodesBounds = dragProxy.nodesSnapshot
        ? getNodesBounds(dragProxy.nodesSnapshot)
        : null;

    if (!nodesBounds) {
        console.warn("Could not calculate nodes bounds for drag proxy");
        return null;
    }

    const { width, height } = nodesBounds;
    if (
        typeof width !== "number" ||
        typeof height !== "number" ||
        Number.isNaN(width) ||
        Number.isNaN(height) ||
        width <= 0 ||
        height <= 0
    ) {
        console.warn("Invalid DragProxy dimensions, aborting render");
        return null;
    }

    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);

    const viewport = reactFlowInstance.getViewport();

    const deltaX = dragProxy.currentPosition.x - dragProxy.startPosition.x;
    const deltaY = dragProxy.currentPosition.y - dragProxy.startPosition.y;

    const topPosition = nodesBounds.y + deltaY;
    const leftPosition = nodesBounds.x + deltaX;

    const style: React.CSSProperties = {
        position: "absolute",
        pointerEvents: "none",

        top: topPosition,
        left: leftPosition,
        width: safeWidth,
        height: safeHeight,
        border: "2px dashed #0096ff",
        background: "rgba(0, 150, 255, 0.1)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        zIndex: 1000,
        borderRadius: "4px",
        transition: "none",
    };

    const selectionCount = dragProxy.nodesSnapshot?.length || 0;
    const edgesCount = dragProxy.edgesSnapshot?.length || 0;
    const totalCount = selectionCount + edgesCount;
    const nodesText = selectionCount !== 1 ? "nodes" : "node";
    const edgesText = edgesCount !== 1 ? "edges" : "edge";

    const content = (
        <div ref={proxyRef} className="react-flow__drag-proxy" style={style}>
            <div
                style={{
                    position: "absolute",
                    top: -28,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#0096ff",
                    color: "white",
                    padding: "3px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    userSelect: "none",
                }}
            >
                {totalCount} components ({selectionCount} {nodesText},{" "}
                {edgesCount} {edgesText})
                <span style={{ fontSize: "11px", opacity: 0.8 }}>
                    (Drag to move, Esc to cancel)
                </span>
            </div>
            <div
                style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    border: "1px solid rgba(0, 150, 255, 0.5)",
                    borderRadius: "3px",
                    backgroundImage:
                        "linear-gradient(45deg, rgba(0, 150, 255, 0.05) 25%, transparent 25%, transparent 50%, rgba(0, 150, 255, 0.05) 50%, rgba(0, 150, 255, 0.05) 75%, transparent 75%, transparent)",
                    backgroundSize: "16px 16px",
                }}
            />
            {/* Indicator showing exact mouse position at the center */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: "red",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                    boxShadow: "0 0 0 2px white",
                }}
            />
        </div>
    );

    return createPortal(content, viewportElement);
};
