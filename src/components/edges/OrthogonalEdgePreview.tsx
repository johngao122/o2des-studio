"use client";

import React, { useMemo, useCallback } from "react";
import { ConnectionLineComponentProps, getStraightPath } from "reactflow";
import { OrthogonalRoutingEngine } from "@/lib/routing/OrthogonalRoutingEngine";
import { HandleSelectionService } from "@/lib/routing/HandleSelectionService";
import { RoutingFeedbackSystem } from "@/lib/routing/RoutingFeedbackSystem";
import { getAllNodeHandles } from "@/lib/utils/nodeHandles";
import { useStore } from "@/store";
import { HandleInfo, OrthogonalPath } from "@/lib/routing/types";

const orthogonalRoutingEngine = new OrthogonalRoutingEngine();
const handleSelectionService = new HandleSelectionService();
const routingFeedbackSystem = new RoutingFeedbackSystem();

/**
 * Find the closest handle to a given position on a node
 */
function findClosestHandle(
    nodeHandles: Array<{ id: string; coordinates: { x: number; y: number } }>,
    targetX: number,
    targetY: number
): { id: string; coordinates: { x: number; y: number } } | null {
    if (nodeHandles.length === 0) return null;

    let closestHandle = nodeHandles[0];
    let minDistance = Math.sqrt(
        Math.pow(closestHandle.coordinates.x - targetX, 2) +
            Math.pow(closestHandle.coordinates.y - targetY, 2)
    );

    for (let i = 1; i < nodeHandles.length; i++) {
        const handle = nodeHandles[i];
        const distance = Math.sqrt(
            Math.pow(handle.coordinates.x - targetX, 2) +
                Math.pow(handle.coordinates.y - targetY, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestHandle = handle;
        }
    }

    return closestHandle;
}

/**
 * OrthogonalEdgePreview component for real-time orthogonal path rendering during edge creation
 * Works with React Flow's actual ConnectionLineComponentProps
 */
export const OrthogonalEdgePreview: React.FC<ConnectionLineComponentProps> = ({
    fromX,
    fromY,
    toX,
    toY,
    fromHandle,
    fromNode,
}) => {
    const nodes = useStore((state) => state.nodes);

    console.log("OrthogonalEdgePreview props:", {
        fromX,
        fromY,
        toX,
        toY,
        fromHandle,
        fromNode,
    });

    /**
     * Calculate optimal handle selection based on current mouse position and available parameters
     */
    const calculateOptimalHandles = useCallback((): {
        sourceHandle: HandleInfo | null;
        targetHandle: HandleInfo | null;
    } => {
        console.log("Calculating optimal handles...");

        let sourceNode = fromNode || null;

        if (!sourceNode) {
            const threshold = 50;
            sourceNode =
                nodes.find((n) => {
                    const nodeX = n.position.x;
                    const nodeY = n.position.y;
                    const nodeWidth = n.width || 200;
                    const nodeHeight = n.height || 100;

                    return (
                        fromX >= nodeX - threshold &&
                        fromX <= nodeX + nodeWidth + threshold &&
                        fromY >= nodeY - threshold &&
                        fromY <= nodeY + nodeHeight + threshold
                    );
                }) || null;
        }

        if (!sourceNode) {
            console.log("No source node found, using virtual handles");

            const sourceHandle: HandleInfo = {
                id: "virtual-source",
                nodeId: "virtual",
                position: { x: fromX, y: fromY },
                side: "right",
                type: "source",
            };

            const targetHandle: HandleInfo = {
                id: "virtual-target",
                nodeId: "virtual",
                position: { x: toX, y: toY },
                side: "left",
                type: "target",
            };

            return { sourceHandle, targetHandle };
        }

        console.log("Found source node:", sourceNode.id);

        const sourceNodeHandles = getAllNodeHandles(sourceNode as any);
        console.log("Source node handles:", sourceNodeHandles.length);

        if (sourceNodeHandles.length === 0) {
            console.log("No handles found on source node");
            return { sourceHandle: null, targetHandle: null };
        }

        const closestSourceHandle = findClosestHandle(
            sourceNodeHandles,
            fromX,
            fromY
        );

        if (!closestSourceHandle) {
            console.log("Could not find closest source handle");
            return { sourceHandle: null, targetHandle: null };
        }

        console.log("Found closest source handle:", closestSourceHandle.id);

        const sourceHandle: HandleInfo = {
            id: closestSourceHandle.id,
            nodeId: sourceNode.id,
            position: closestSourceHandle.coordinates,
            side:
                sourceNodeHandles.find((h) => h.id === closestSourceHandle.id)
                    ?.side || "right",
            type: "source",
        };

        const targetHandle: HandleInfo = {
            id: "virtual-target",
            nodeId: "virtual",
            position: { x: toX, y: toY },
            side: "left",
            type: "target",
        };

        console.log("Using virtual target handle at:", toX, toY);
        return { sourceHandle, targetHandle };
    }, [fromNode, fromX, fromY, toX, toY, nodes]);

    /**
     * Calculate orthogonal path for preview
     */
    const orthogonalPath = useMemo((): OrthogonalPath | null => {
        console.log("Computing orthogonal path...");
        const { sourceHandle, targetHandle } = calculateOptimalHandles();

        if (!sourceHandle || !targetHandle) {
            console.log(
                "Missing handles - sourceHandle:",
                !!sourceHandle,
                "targetHandle:",
                !!targetHandle
            );
            return null;
        }

        console.log(
            "Computing path from:",
            sourceHandle.position,
            "to:",
            targetHandle.position
        );

        try {
            const path = orthogonalRoutingEngine.calculateOrthogonalPath(
                sourceHandle,
                targetHandle
            );

            console.log("Orthogonal path calculated:", {
                routingType: path.routingType,
                totalLength: path.totalLength,
                segments: path.segments.length,
            });

            const metrics = orthogonalRoutingEngine.calculateRoutingMetrics(
                path,
                sourceHandle,
                targetHandle
            );
            routingFeedbackSystem.logRoutingMetrics(metrics);

            routingFeedbackSystem.displayRoutingDecision({
                selectedPath: path,
                alternativePath: path,
                reason: `Preview: ${path.routingType} routing selected`,
                efficiency: path.efficiency,
                timestamp: Date.now(),
            });

            return path;
        } catch (error) {
            console.warn("Orthogonal preview routing failed:", error);
            return null;
        }
    }, [calculateOptimalHandles]);

    /**
     * Generate SVG path from orthogonal segments
     */
    const generateSVGPath = useCallback((path: OrthogonalPath): string => {
        if (path.segments.length === 0) {
            return "";
        }

        const pathSegments: string[] = [];
        const firstSegment = path.segments[0];
        pathSegments.push(`M ${firstSegment.start.x} ${firstSegment.start.y}`);

        for (const segment of path.segments) {
            pathSegments.push(`L ${segment.end.x} ${segment.end.y}`);
        }

        return pathSegments.join(" ");
    }, []);

    /**
     * Render orthogonal path or fallback to straight line
     */
    const renderPath = useMemo(() => {
        console.log(
            "Rendering path - orthogonalPath available:",
            !!orthogonalPath
        );

        if (orthogonalPath && orthogonalPath.segments.length > 0) {
            console.log(
                "Using orthogonal path with",
                orthogonalPath.segments.length,
                "segments"
            );
            const svgPath = generateSVGPath(orthogonalPath);
            console.log("Generated SVG path:", svgPath);
            return svgPath;
        }

        console.log("Falling back to straight line path");

        const [straightPath] = getStraightPath({
            sourceX: fromX,
            sourceY: fromY,
            targetX: toX,
            targetY: toY,
        });
        console.log("Straight path:", straightPath);
        return straightPath;
    }, [orthogonalPath, generateSVGPath, fromX, fromY, toX, toY]);

    /**
     * Render handle selection indicators
     */
    const renderHandleIndicators = useMemo(() => {
        const { sourceHandle, targetHandle } = calculateOptimalHandles();
        const indicators: React.ReactElement[] = [];

        if (sourceHandle) {
            indicators.push(
                <circle
                    key="source-indicator"
                    cx={sourceHandle.position.x}
                    cy={sourceHandle.position.y}
                    r={6}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    className="animate-pulse"
                />
            );
        }

        if (targetHandle && targetHandle.id !== "virtual-target") {
            indicators.push(
                <circle
                    key="target-indicator"
                    cx={targetHandle.position.x}
                    cy={targetHandle.position.y}
                    r={6}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2}
                    className="animate-pulse"
                />
            );
        }

        return indicators;
    }, [calculateOptimalHandles]);

    /**
     * Render routing feedback overlay
     */
    const renderRoutingFeedback = useMemo(() => {
        if (!orthogonalPath) return null;

        const midPoint =
            orthogonalPath.controlPoints.length > 0
                ? orthogonalPath.controlPoints[
                      Math.floor(orthogonalPath.controlPoints.length / 2)
                  ]
                : { x: (fromX + toX) / 2, y: (fromY + toY) / 2 };

        return (
            <g>
                {/* Routing type indicator */}
                <rect
                    x={midPoint.x - 40}
                    y={midPoint.y - 15}
                    width={80}
                    height={20}
                    fill="rgba(59, 130, 246, 0.9)"
                    rx={4}
                />
                <text
                    x={midPoint.x}
                    y={midPoint.y - 2}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontFamily="monospace"
                >
                    {orthogonalPath.routingType === "horizontal-first"
                        ? "H→V"
                        : "V→H"}
                </text>

                {/* Path length indicator */}
                <text
                    x={midPoint.x}
                    y={midPoint.y + 10}
                    textAnchor="middle"
                    fill="rgba(59, 130, 246, 0.8)"
                    fontSize="8"
                    fontFamily="monospace"
                >
                    {Math.round(orthogonalPath.totalLength)}px
                </text>
            </g>
        );
    }, [orthogonalPath, fromX, fromY, toX, toY]);

    return (
        <g>
            {/* Main orthogonal path */}
            <path
                d={renderPath}
                stroke="#3b82f6"
                strokeWidth={2}
                fill="none"
                strokeDasharray="5,5"
                className="animate-pulse"
            />

            {/* Handle selection indicators */}
            {renderHandleIndicators}

            {/* Routing feedback overlay */}
            {renderRoutingFeedback}

            {/* Control point indicators */}
            {orthogonalPath?.controlPoints.map((point, index) => (
                <circle
                    key={`control-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    fill="#3b82f6"
                    fillOpacity={0.6}
                />
            ))}
        </g>
    );
};

export default OrthogonalEdgePreview;
