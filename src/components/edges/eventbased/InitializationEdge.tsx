"use client";

import React, {
    memo,
    useState,
    useCallback,
    useRef,
    useEffect,
    useMemo,
} from "react";
import { EdgeProps, EdgeLabelRenderer } from "reactflow";
import ReactKatex from "@pkasila/react-katex";
import { CommandController } from "@/controllers/CommandController";
import BaseEdgeComponent, {
    BaseEdgeData,
    BaseEdgeProps,
    getDefaultBaseEdgeData,
} from "@/components/edges/BaseEdgeComponent";
import {
    parseTransformMatrix,
    clientToFlowPosition,
    throttle,
    calculateEdgePositions,
    getPointAndAngleOnPath,
} from "@/lib/utils/math";
import { ErrorTooltip } from "@/components/ui/ErrorTooltip";
import { useStore } from "@/store";

const commandController = CommandController.getInstance();

interface InitializationEdgeData extends BaseEdgeData {
    initialDelay?: string;
    delayPosition?: number;
    delayLabelOffset?: { x: number; y: number };
}

interface ExtendedEdgeProps extends BaseEdgeProps<InitializationEdgeData> {
    onClick?: () => void;
}

interface InitializationEdgeComponent
    extends React.NamedExoticComponent<ExtendedEdgeProps> {
    getDefaultData?: () => InitializationEdgeData;
    getGraphType?: () => string;
    displayName?: string;
}

const InitializationEdge = memo(
    ({
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        style = {},
        data = {} as InitializationEdgeData,
        markerEnd,
        selected,
        onClick,
    }: ExtendedEdgeProps) => {
        // Get validation errors for this edge
        const validationErrors = useStore((state) =>
            state.getValidationErrors(id)
        );

        const [isDelayDragging, setIsDelayDragging] = useState(false);
        const [tempDelayPosition, setTempDelayPosition] = useState<{
            x: number;
            y: number;
        } | null>(null);

        const delayLabelRef = useRef<HTMLDivElement>(null);
        const flowPaneRef = useRef<Element | null>(null);
        const transformMatrixRef = useRef<ReturnType<
            typeof parseTransformMatrix
        > | null>(null);
        const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
        const anchorRef = useRef<{ delay?: { x: number; y: number } }>({});
        const pathStringRef = useRef<string>("");
        const tempDelayTRef = useRef<number | null>(null);

        const projectPointOntoPath = (
            pathD: string,
            p: { x: number; y: number }
        ): { x: number; y: number; t: number } => {
            try {
                const svg = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "svg"
                );
                const path = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "path"
                );
                path.setAttribute("d", pathD);
                svg.appendChild(path);
                document.body.appendChild(svg);
                const total = path.getTotalLength();
                let bestT = 0;
                let bestDist = Infinity;
                const samples = 50;
                for (let i = 0; i <= samples; i++) {
                    const t = i / samples;
                    const pt = path.getPointAtLength(total * t);
                    const dx = p.x - pt.x;
                    const dy = p.y - pt.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < bestDist) {
                        bestDist = d2;
                        bestT = t;
                    }
                }
                const refineRange = 0.04;
                const lower = Math.max(0, bestT - refineRange);
                const upper = Math.min(1, bestT + refineRange);
                const steps = 20;
                bestDist = Infinity;
                for (let i = 0; i <= steps; i++) {
                    const t = lower + (i / steps) * (upper - lower);
                    const pt = path.getPointAtLength(total * t);
                    const dx = p.x - pt.x;
                    const dy = p.y - pt.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < bestDist) {
                        bestDist = d2;
                        bestT = t;
                    }
                }
                const bestPt = path.getPointAtLength(total * bestT);
                document.body.removeChild(svg);
                return { x: bestPt.x, y: bestPt.y, t: bestT };
            } catch (e) {
                return { x: p.x, y: p.y, t: 0.25 };
            }
        };

        const hasInitialDelay =
            data?.initialDelay && data.initialDelay.trim() !== "";

        const handleDelayDragStart = (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();

            flowPaneRef.current = document.querySelector(
                ".react-flow__viewport"
            );

            if (flowPaneRef.current) {
                const transformStyle = window.getComputedStyle(
                    flowPaneRef.current
                ).transform;
                try {
                    transformMatrixRef.current =
                        parseTransformMatrix(transformStyle);
                } catch (error) {
                    console.warn("Failed to parse transform matrix:", error);
                    transformMatrixRef.current = {
                        scale: 1,
                        offsetX: 0,
                        offsetY: 0,
                    };
                }

                const defaultDelayLabelOffset = { x: 0, y: -30 };
                const usedOffset =
                    data?.delayLabelOffset || defaultDelayLabelOffset;

                const mousePosition = clientToFlowPosition(
                    e.clientX,
                    e.clientY,
                    transformMatrixRef.current || {
                        scale: 1,
                        offsetX: 0,
                        offsetY: 0,
                    }
                );

                const anchorPoint =
                    anchorRef.current.delay ||
                    ({
                        x: (sourceX + targetX) / 2,
                        y: (sourceY + targetY) / 2,
                    } as const);

                const labelFlowPos = {
                    x: anchorPoint.x + usedOffset.x,
                    y: anchorPoint.y + usedOffset.y,
                };

                dragOffsetRef.current = {
                    x: labelFlowPos.x - mousePosition.x,
                    y: labelFlowPos.y - mousePosition.y,
                };

                tempDelayTRef.current = data?.delayPosition ?? 0.25;
                setTempDelayPosition(labelFlowPos);
                setIsDelayDragging(true);
                document.body.style.cursor = "grabbing";
            }
        };

        const handleDelayDrag = useCallback(
            throttle((e: MouseEvent) => {
                if (!isDelayDragging || !dragOffsetRef.current) return;

                e.preventDefault();
                e.stopPropagation();

                if (!flowPaneRef.current) {
                    flowPaneRef.current = document.querySelector(
                        ".react-flow__viewport"
                    );
                }

                if (flowPaneRef.current) {
                    if (!transformMatrixRef.current) {
                        const transformStyle = window.getComputedStyle(
                            flowPaneRef.current
                        ).transform;
                        try {
                            transformMatrixRef.current =
                                parseTransformMatrix(transformStyle);
                        } catch (error) {
                            console.warn(
                                "Failed to parse transform matrix during drag:",
                                error
                            );
                            transformMatrixRef.current = {
                                scale: 1,
                                offsetX: 0,
                                offsetY: 0,
                            };
                        }
                    }

                    const mousePosition = clientToFlowPosition(
                        e.clientX,
                        e.clientY,
                        transformMatrixRef.current || {
                            scale: 1,
                            offsetX: 0,
                            offsetY: 0,
                        }
                    );

                    const adjusted = {
                        x: mousePosition.x + (dragOffsetRef.current?.x || 0),
                        y: mousePosition.y + (dragOffsetRef.current?.y || 0),
                    };

                    const pathD = pathStringRef.current;
                    if (pathD) {
                        const proj = projectPointOntoPath(pathD, adjusted);
                        tempDelayTRef.current = proj.t;
                        const dx = adjusted.x - proj.x;
                        const dy = adjusted.y - proj.y;
                        const len = Math.hypot(dx, dy);
                        const maxOffset = 30;
                        const s =
                            len > maxOffset && len > 0 ? maxOffset / len : 1;
                        setTempDelayPosition({
                            x: proj.x + dx * s,
                            y: proj.y + dy * s,
                        });
                    } else {
                        const anchor = anchorRef.current.delay;
                        if (anchor) {
                            const dx = adjusted.x - anchor.x;
                            const dy = adjusted.y - anchor.y;
                            const len = Math.hypot(dx, dy);
                            const maxOffset = 30;
                            const scale =
                                len > maxOffset && len > 0
                                    ? maxOffset / len
                                    : 1;
                            setTempDelayPosition({
                                x: anchor.x + dx * scale,
                                y: anchor.y + dy * scale,
                            });
                        } else {
                            setTempDelayPosition(adjusted);
                        }
                    }
                }
            }, 16),
            [isDelayDragging]
        );

        const handleDelayDragEnd = useCallback(() => {
            if (isDelayDragging && tempDelayPosition) {
                const pathD = pathStringRef.current;
                let finalAnchor = anchorRef.current.delay;
                if (pathD) {
                    const t = tempDelayTRef.current;
                    if (t != null) {
                        const pt = getPointAndAngleOnPath(
                            pathD,
                            t,
                            sourceX,
                            sourceY,
                            targetX,
                            targetY
                        );
                        finalAnchor = { x: pt.x, y: pt.y };
                    }
                }

                if (!finalAnchor) {
                    const centerX = (sourceX + targetX) / 2;
                    const centerY = (sourceY + targetY) / 2;
                    finalAnchor = { x: centerX, y: centerY };
                }

                let offset = {
                    x: tempDelayPosition.x - finalAnchor.x,
                    y: tempDelayPosition.y - finalAnchor.y,
                };
                const len = Math.hypot(offset.x, offset.y);
                const maxOffset = 30;
                if (len > maxOffset && len > 0) {
                    const s = maxOffset / len;
                    offset = { x: offset.x * s, y: offset.y * s };
                }

                const nextData: any = {
                    ...data,
                    delayLabelOffset: offset,
                };
                if (tempDelayTRef.current != null) {
                    nextData.delayPosition = tempDelayTRef.current;
                }

                const command = commandController.createUpdateEdgeCommand(id, {
                    data: nextData,
                });
                commandController.execute(command);
            }

            setIsDelayDragging(false);
            setTempDelayPosition(null);
            dragOffsetRef.current = null;
            document.body.style.cursor = "";
        }, [
            isDelayDragging,
            tempDelayPosition,
            data,
            id,
            sourceX,
            sourceY,
            targetX,
            targetY,
        ]);

        useEffect(() => {
            if (isDelayDragging) {
                window.addEventListener("mousemove", handleDelayDrag);
                window.addEventListener("mouseup", handleDelayDragEnd);

                return () => {
                    window.removeEventListener("mousemove", handleDelayDrag);
                    window.removeEventListener("mouseup", handleDelayDragEnd);
                };
            }
        }, [isDelayDragging, handleDelayDrag, handleDelayDragEnd]);

        const hasErrors = validationErrors.length > 0;

        const edgeStyle = useMemo(() => {
            const mergedStyle = { ...style };

            if (hasErrors) {
                const width = mergedStyle.strokeWidth;
                const numericWidth =
                    typeof width === "number"
                        ? Math.max(width, 3)
                        : width ?? 3;

                return {
                    ...mergedStyle,
                    stroke: "#ef4444",
                    strokeWidth: numericWidth,
                };
            }

            if (selected) {
                const { stroke: _stroke, strokeWidth: _strokeWidth, ...rest } =
                    mergedStyle;
                return rest;
            }

            return {
                stroke: mergedStyle.stroke ?? "#6b7280",
                strokeWidth: mergedStyle.strokeWidth ?? 2,
                ...mergedStyle,
            };
        }, [style, hasErrors, selected]);

        return (
            <ErrorTooltip
                errors={validationErrors}
                wrapperElement="g"
            >
                <BaseEdgeComponent
                    id={id}
                    sourceX={sourceX}
                    sourceY={sourceY}
                    targetX={targetX}
                    targetY={targetY}
                    sourcePosition={sourcePosition}
                    targetPosition={targetPosition}
                    style={edgeStyle}
                    data={data}
                    markerEnd={markerEnd}
                    selected={selected}
                    onClick={onClick}
                >
                {({
                    edgePath,
                    isSimpleMode,
                    centerX,
                    centerY,
                }: {
                    edgePath: string;
                    isSimpleMode: boolean;
                    centerX: number;
                    centerY: number;
                }) => {
                    pathStringRef.current = edgePath;
                    const delayPosition = data?.delayPosition ?? 0.25;

                    const { pathPoints, edgePoints } = calculateEdgePositions(
                        edgePath,
                        sourceX,
                        sourceY,
                        targetX,
                        targetY,
                        [delayPosition],
                        isSimpleMode,
                        centerX,
                        centerY
                    );

                    const [delayData] = pathPoints;

                    const delayPoint = {
                        x: delayData.x,
                        y: delayData.y,
                        angle: delayData.angle ?? 0,
                    };

                    const liveDelay =
                        isDelayDragging && tempDelayTRef.current != null
                            ? getPointAndAngleOnPath(
                                  edgePath,
                                  tempDelayTRef.current,
                                  sourceX,
                                  sourceY,
                                  targetX,
                                  targetY
                              )
                            : {
                                  x: delayPoint.x,
                                  y: delayPoint.y,
                                  angle: delayPoint.angle,
                              };

                    anchorRef.current.delay = {
                        x: liveDelay.x,
                        y: liveDelay.y,
                    };

                    const defaultDelayLabelOffset = { x: 0, y: -30 };
                    const interactiveOffset =
                        isDelayDragging && tempDelayPosition
                            ? {
                                  x: tempDelayPosition.x - liveDelay.x,
                                  y: tempDelayPosition.y - liveDelay.y,
                              }
                            : undefined;

                    const unclampedOffset =
                        interactiveOffset ||
                        data?.delayLabelOffset ||
                        defaultDelayLabelOffset;

                    const dx = unclampedOffset.x;
                    const dy = unclampedOffset.y;
                    const len = Math.hypot(dx, dy);
                    const maxOffset = 30;
                    const scale =
                        len > maxOffset && len > 0 ? maxOffset / len : 1;
                    const delayLabelOffset = { x: dx * scale, y: dy * scale };

                    const delayLabelX = liveDelay.x + delayLabelOffset.x;
                    const delayLabelY = liveDelay.y + delayLabelOffset.y;

                    const markerColor = selected ? "#f59e0b" : "#6b7280";

                    const allX = [liveDelay.x, delayLabelX];
                    const allY = [liveDelay.y, delayLabelY];
                    const padding = 40;
                    const minX = Math.min(...allX) - padding;
                    const maxX = Math.max(...allX) + padding;
                    const minY = Math.min(...allY) - padding;
                    const maxY = Math.max(...allY) + padding;
                    const svgWidth = Math.max(1, maxX - minX);
                    const svgHeight = Math.max(1, maxY - minY);

                    return (
                        <EdgeLabelRenderer>
                            {/* Connection line from edge to label */}
                            <svg
                                style={{
                                    position: "absolute",
                                    left: minX,
                                    top: minY,
                                    pointerEvents: "none",
                                    zIndex: 5,
                                }}
                                width={svgWidth}
                                height={svgHeight}
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                            >
                                <g
                                    transform={`translate(${
                                        liveDelay.x - minX
                                    }, ${liveDelay.y - minY}) rotate(${
                                        liveDelay.angle
                                    })`}
                                >
                                    <line
                                        x1={-8}
                                        y1={-2}
                                        x2={8}
                                        y2={-2}
                                        stroke={markerColor}
                                        strokeWidth="2"
                                    />
                                    <line
                                        x1={-8}
                                        y1={2}
                                        x2={8}
                                        y2={2}
                                        stroke={markerColor}
                                        strokeWidth="2"
                                    />
                                </g>
                                <line
                                    x1={liveDelay.x - minX}
                                    y1={liveDelay.y - minY}
                                    x2={delayLabelX - minX}
                                    y2={delayLabelY - minY}
                                    stroke={markerColor}
                                    strokeWidth="1"
                                    strokeDasharray="3,3"
                                    opacity={0.7}
                                />
                            </svg>

                            {/* Draggable Initial Delay Label */}
                            <div
                                style={{
                                    position: "absolute",
                                    transform: `translate(-50%, -50%) translate(${
                                        isDelayDragging && tempDelayPosition
                                            ? tempDelayPosition.x
                                            : delayLabelX
                                    }px,${
                                        isDelayDragging && tempDelayPosition
                                            ? tempDelayPosition.y
                                            : delayLabelY
                                    }px)`,
                                    pointerEvents: "all",
                                    zIndex: 10,
                                }}
                                className="nodrag nopan"
                            >
                                <div
                                    ref={delayLabelRef}
                                    onMouseDown={handleDelayDragStart}
                                    className={`edge-label-delay flex justify-center items-center ${
                                        selected
                                            ? "bg-orange-50 dark:bg-orange-900/50"
                                            : "bg-white/90 dark:bg-zinc-800/90"
                                    } px-2 py-1 rounded text-xs ${
                                        selected
                                            ? "shadow-md border border-orange-300 dark:border-orange-600"
                                            : "shadow border border-gray-200 dark:border-gray-700"
                                    } cursor-grab ${
                                        isDelayDragging
                                            ? "cursor-grabbing opacity-70"
                                            : ""
                                    }`}
                                    style={{
                                        boxShadow: selected
                                            ? "0 2px 4px rgba(251, 146, 60, 0.3)"
                                            : "0 1px 3px rgba(0, 0, 0, 0.1)",
                                        minWidth: "30px",
                                        backdropFilter: "blur(4px)",
                                    }}
                                >
                                    {isDelayDragging ? (
                                        <span>
                                            {hasInitialDelay
                                                ? data.initialDelay
                                                : "0"}
                                        </span>
                                    ) : (
                                        <ReactKatex>
                                            {hasInitialDelay
                                                ? data.initialDelay
                                                : "0"}
                                        </ReactKatex>
                                    )}
                                </div>
                            </div>
                        </EdgeLabelRenderer>
                    );
                }}
            </BaseEdgeComponent>
            </ErrorTooltip>
        );
    }
) as InitializationEdgeComponent;

InitializationEdge.getDefaultData = (): InitializationEdgeData => ({
    ...getDefaultBaseEdgeData(),
    initialDelay: "0",
    delayPosition: 0.25,
    delayLabelOffset: { x: 0, y: -30 },
});

InitializationEdge.getGraphType = (): string => "eventBased";

InitializationEdge.displayName = "InitializationEdge";

export default InitializationEdge;
