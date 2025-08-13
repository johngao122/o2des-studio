"use client";

import React, {
    memo,
    useState,
    useCallback,
    MouseEvent,
    useRef,
    useEffect,
} from "react";
import { EdgeProps, EdgeLabelRenderer } from "reactflow";
import ReactKatex from "@pkasila/react-katex";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import {
    parseTransformMatrix,
    clientToFlowPosition,
    throttle,
    calculateEdgePositions,
    getPointAndAngleOnPath,
} from "@/lib/utils/math";
import BaseEdgeComponent, {
    BaseEdgeData,
    EdgeTypeOption,
    getDefaultBaseEdgeData,
} from "@/components/edges/BaseEdgeComponent";

const commandController = CommandController.getInstance();

interface RCQEdgeData extends BaseEdgeData {
    condition?: string;
    conditionLabelOffset?: { x: number; y: number };
    conditionPosition?: number;
}

function buildPolyline(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    controlPoints: { x: number; y: number }[]
): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [
        { x: sourceX, y: sourceY },
        ...controlPoints,
        { x: targetX, y: targetY },
    ];
    return points;
}

function getPolylineCumulativeLengths(points: Array<{ x: number; y: number }>) {
    const lengths: number[] = [0];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const seg = Math.hypot(dx, dy);
        total += seg;
        lengths.push(total);
    }
    return { cumulative: lengths, total };
}

function clamp01(v: number) {
    return Math.max(0, Math.min(1, v));
}

function getPointAtT(
    points: Array<{ x: number; y: number }>,
    t: number
): { x: number; y: number } {
    const { cumulative, total } = getPolylineCumulativeLengths(points);
    if (total === 0) return points[0] || { x: 0, y: 0 };
    const target = clamp01(t) * total;
    let idx = 0;
    while (idx < cumulative.length - 1 && cumulative[idx + 1] < target) idx++;
    const segStart = points[idx];
    const segEnd = points[idx + 1] || segStart;
    const segLen = cumulative[idx + 1] - cumulative[idx] || 1;
    const localT = (target - cumulative[idx]) / segLen;
    return {
        x: segStart.x + (segEnd.x - segStart.x) * localT,
        y: segStart.y + (segEnd.y - segStart.y) * localT,
    };
}

function getAngleAtT(points: Array<{ x: number; y: number }>, t: number) {
    const { cumulative, total } = getPolylineCumulativeLengths(points);
    if (total === 0) return 0;
    const target = clamp01(t) * total;
    let idx = 0;
    while (idx < cumulative.length - 1 && cumulative[idx + 1] < target) idx++;
    const segStart = points[idx];
    const segEnd = points[idx + 1] || segStart;
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
}

function projectPointOntoPolyline(
    points: Array<{ x: number; y: number }>,
    p: { x: number; y: number }
): { x: number; y: number; t: number } {
    const { cumulative, total } = getPolylineCumulativeLengths(points);
    if (total === 0)
        return { x: points[0]?.x || 0, y: points[0]?.y || 0, t: 0 };
    let best = { x: points[0].x, y: points[0].y, t: 0 };
    let bestDist = Infinity;
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const abLen2 = abx * abx + aby * aby || 1;
        const apx = p.x - a.x;
        const apy = p.y - a.y;
        const u = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
        const qx = a.x + abx * u;
        const qy = a.y + aby * u;
        const dx = p.x - qx;
        const dy = p.y - qy;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < bestDist) {
            bestDist = dist2;
            const segLen = cumulative[i + 1] - cumulative[i];
            const t = (cumulative[i] + u * segLen) / total;
            best = { x: qx, y: qy, t };
        }
    }
    return best;
}

function makeSvgPath(pathD: string) {
    const ns = "http://www.w3.org/2000/svg";
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", pathD);
    return path as SVGPathElement;
}

function getPointOnPathAtT(pathD: string, t: number) {
    try {
        const path = makeSvgPath(pathD);
        const len = path.getTotalLength();
        const pos = path.getPointAtLength(clamp01(t) * len);
        return { x: pos.x, y: pos.y };
    } catch {
        return null;
    }
}

function getAngleOnPathAtT(pathD: string, t: number) {
    try {
        const path = makeSvgPath(pathD);
        const len = path.getTotalLength();
        const s = clamp01(t) * len;
        const p1 = path.getPointAtLength(Math.max(0, s - 0.5));
        const p2 = path.getPointAtLength(Math.min(len, s + 0.5));
        return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    } catch {
        return 0;
    }
}

function projectPointToPath(pathD: string, p: { x: number; y: number }) {
    try {
        const path = makeSvgPath(pathD);
        const len = path.getTotalLength();
        let bestT = 0;
        let bestDist = Infinity;
        const sample = (steps: number, start: number, end: number) => {
            for (let i = 0; i <= steps; i++) {
                const s = start + ((end - start) * i) / steps;
                const pt = path.getPointAtLength(s);
                const dx = pt.x - p.x;
                const dy = pt.y - p.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < bestDist) {
                    bestDist = d2;
                    bestT = s / len;
                }
            }
        };
        sample(64, 0, len);
        const centerS = bestT * len;
        const half = Math.max(2, len * 0.02);
        sample(32, Math.max(0, centerS - half), Math.min(len, centerS + half));
        const anchor = path.getPointAtLength(bestT * len);
        return { x: anchor.x, y: anchor.y, t: clamp01(bestT) };
    } catch {
        return null;
    }
}

interface ExtendedEdgeProps extends EdgeProps<RCQEdgeData> {
    onClick?: () => void;
}

interface RCQEdgeComponent
    extends React.NamedExoticComponent<ExtendedEdgeProps> {
    getDefaultData?: () => RCQEdgeData;
    getGraphType?: () => string;
    displayName?: string;
}

const RCQEdge = memo(
    ({
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        style = {},
        data = {} as RCQEdgeData,
        markerEnd,
        selected,
        onClick,
    }: ExtendedEdgeProps) => {
        const [isConditionDragging, setIsConditionDragging] = useState(false);
        const [tempConditionPosition, setTempConditionPosition] = useState<{
            x: number;
            y: number;
        } | null>(null);
        const tempConditionTRef = useRef<number | null>(null);
        const edgePathRef = useRef<string | null>(null);
        const polylineRef = useRef<Array<{ x: number; y: number }>>([]);
        const currentControlPointsRef = useRef<Array<{ x: number; y: number }>>(
            []
        );
        const pathStringRef = useRef<string>("");

        const conditionLabelRef = useRef<HTMLDivElement>(null);
        const flowPaneRef = useRef<Element | null>(null);
        const transformMatrixRef = useRef<ReturnType<
            typeof parseTransformMatrix
        > | null>(null);
        const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
        const anchorRef = useRef<{ x: number; y: number } | null>(null);

        const handleConditionDragStart = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();

            flowPaneRef.current = document.querySelector(
                ".react-flow__viewport"
            );

            if (flowPaneRef.current) {
                const computedStyle = window.getComputedStyle(
                    flowPaneRef.current
                );
                if (!computedStyle) {
                    return;
                }
                const transformStyle = computedStyle.transform;
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

                if (conditionLabelRef.current && transformMatrixRef.current) {
                    const defaultOffset = { x: 0, y: -30 };
                    const usedOffset =
                        data?.conditionLabelOffset || defaultOffset;

                    const t = data?.conditionPosition ?? 0.5;
                    let anchorPoint: { x: number; y: number };
                    const pathD = pathStringRef.current || edgePathRef.current;
                    if (pathD) {
                        anchorPoint = getPointOnPathAtT(pathD, t) || {
                            x: sourceX,
                            y: sourceY,
                        };
                    } else {
                        const controlPointsToUse =
                            currentControlPointsRef.current.length > 0
                                ? currentControlPointsRef.current
                                : data?.controlPoints || [];
                        const poly = buildPolyline(
                            sourceX,
                            sourceY,
                            targetX,
                            targetY,
                            controlPointsToUse
                        );
                        polylineRef.current = poly;
                        anchorPoint = getPointAtT(poly, t);
                    }
                    const labelFlowPos = {
                        x: anchorPoint.x + usedOffset.x,
                        y: anchorPoint.y + usedOffset.y,
                    };
                    const mouseFlowPos = clientToFlowPosition(
                        e.clientX,
                        e.clientY,
                        transformMatrixRef.current
                    );

                    const offsetX = labelFlowPos.x - mouseFlowPos.x;
                    const offsetY = labelFlowPos.y - mouseFlowPos.y;
                    dragOffsetRef.current = { x: offsetX, y: offsetY };
                    setTempConditionPosition(labelFlowPos);
                    anchorRef.current = anchorPoint;
                    tempConditionTRef.current = t;
                    setIsConditionDragging(true);
                    document.body.style.cursor = "grabbing";
                    return;
                }

                const controlPointsToUse =
                    currentControlPointsRef.current.length > 0
                        ? currentControlPointsRef.current
                        : data?.controlPoints || [];

                const poly = buildPolyline(
                    sourceX,
                    sourceY,
                    targetX,
                    targetY,
                    controlPointsToUse
                );

                const t = data?.conditionPosition ?? 0.5;
                const anchorPoint = getPointAtT(poly, t);
                const conditionMarkerX = anchorPoint.x;
                const conditionMarkerY = anchorPoint.y;

                const defaultConditionLabelOffset = { x: 0, y: -30 };
                const conditionLabelOffset =
                    data?.conditionLabelOffset || defaultConditionLabelOffset;
                const conditionLabelX =
                    conditionMarkerX + conditionLabelOffset.x;
                const conditionLabelY =
                    conditionMarkerY + conditionLabelOffset.y;

                const mousePosition = clientToFlowPosition(
                    e.clientX,
                    e.clientY,
                    transformMatrixRef.current || {
                        scale: 1,
                        offsetX: 0,
                        offsetY: 0,
                    }
                );

                if (
                    !mousePosition ||
                    !isFinite(mousePosition.x) ||
                    !isFinite(mousePosition.y) ||
                    !isFinite(conditionLabelX) ||
                    !isFinite(conditionLabelY)
                ) {
                    console.warn(
                        "RCQEdge: Invalid coordinates in fallback path",
                        {
                            mousePosition,
                            conditionLabelX,
                            conditionLabelY,
                            transformMatrix: transformMatrixRef.current,
                        }
                    );
                    return;
                }

                const offsetX = conditionLabelX - mousePosition.x;
                const offsetY = conditionLabelY - mousePosition.y;

                const offsetDistance = Math.hypot(offsetX, offsetY);
                if (offsetDistance > 100) {
                    console.warn(
                        "RCQEdge: Large drag offset detected in fallback path (possible coordinate mismatch)",
                        {
                            offsetX,
                            offsetY,
                            offsetDistance,
                            conditionLabelX,
                            conditionLabelY,
                            mousePosition,
                        }
                    );
                }

                if (process.env.NODE_ENV === "development") {
                    console.debug(
                        "RCQEdge: Fallback path calculation details",
                        {
                            anchorPoint: {
                                x: conditionMarkerX,
                                y: conditionMarkerY,
                            },
                            labelOffset: data?.conditionLabelOffset || {
                                x: 0,
                                y: -30,
                            },
                            calculatedLabel: {
                                x: conditionLabelX,
                                y: conditionLabelY,
                            },
                            mousePosition,
                            offset: { x: offsetX, y: offsetY },
                            offsetDistance,
                            controlPointsUsed: controlPointsToUse.length,
                            polylineLength: poly.length,
                        }
                    );
                }

                dragOffsetRef.current = { x: offsetX, y: offsetY };

                setTempConditionPosition({
                    x: conditionLabelX,
                    y: conditionLabelY,
                });
                setIsConditionDragging(true);
                document.body.style.cursor = "grabbing";
            }
        };

        const handleConditionDrag = useCallback(
            throttle((e: MouseEvent) => {
                if (!isConditionDragging || !dragOffsetRef.current) return;

                e.preventDefault();
                e.stopPropagation();

                if (!flowPaneRef.current) {
                    flowPaneRef.current = document.querySelector(
                        ".react-flow__viewport"
                    );
                }

                if (flowPaneRef.current) {
                    if (!transformMatrixRef.current) {
                        const computedStyle = window.getComputedStyle(
                            flowPaneRef.current
                        );
                        if (!computedStyle) {
                            return;
                        }
                        const transformStyle = computedStyle.transform;
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
                        x: mousePosition.x + dragOffsetRef.current.x,
                        y: mousePosition.y + dragOffsetRef.current.y,
                    };
                    let anchor = null as {
                        x: number;
                        y: number;
                        t: number;
                    } | null;
                    const pathD2 = pathStringRef.current || edgePathRef.current;
                    if (pathD2) {
                        anchor = projectPointToPath(pathD2, adjusted);
                    }
                    if (!anchor) {
                        if (polylineRef.current.length === 0) {
                            const controlPointsToUse =
                                currentControlPointsRef.current.length > 0
                                    ? currentControlPointsRef.current
                                    : data?.controlPoints || [];
                            polylineRef.current = buildPolyline(
                                sourceX,
                                sourceY,
                                targetX,
                                targetY,
                                controlPointsToUse
                            );
                        }
                        const proj = projectPointOntoPolyline(
                            polylineRef.current,
                            adjusted
                        );
                        anchor = proj;
                    }
                    tempConditionTRef.current = anchor.t;
                    const dx = adjusted.x - anchor.x;
                    const dy = adjusted.y - anchor.y;
                    const len = Math.hypot(dx, dy);
                    const maxOffset = 30;
                    const s = len > maxOffset && len > 0 ? maxOffset / len : 1;
                    const newPos = {
                        x: anchor.x + dx * s,
                        y: anchor.y + dy * s,
                    };
                    setTempConditionPosition(newPos);
                }
            }, 16),
            [isConditionDragging]
        );

        const handleConditionDragEnd = useCallback(() => {
            if (isConditionDragging && tempConditionPosition) {
                const t =
                    tempConditionTRef.current != null
                        ? (tempConditionTRef.current as number)
                        : data?.conditionPosition ?? 0.5;
                let anchor: { x: number; y: number };
                const pathD3 = pathStringRef.current || edgePathRef.current;
                if (pathD3) {
                    anchor = getPointOnPathAtT(pathD3, t) || {
                        x: sourceX,
                        y: sourceY,
                    };
                } else {
                    const poly =
                        polylineRef.current.length > 0
                            ? polylineRef.current
                            : buildPolyline(
                                  sourceX,
                                  sourceY,
                                  targetX,
                                  targetY,
                                  currentControlPointsRef.current.length > 0
                                      ? currentControlPointsRef.current
                                      : data?.controlPoints || []
                              );
                    anchor = getPointAtT(poly, t);
                }
                let newOffset = {
                    x: tempConditionPosition.x - anchor.x,
                    y: tempConditionPosition.y - anchor.y,
                };
                const len = Math.hypot(newOffset.x, newOffset.y);
                const maxOffset = 30;
                if (len > maxOffset && len > 0) {
                    const s = maxOffset / len;
                    newOffset = { x: newOffset.x * s, y: newOffset.y * s };
                }
                const updatedData: RCQEdgeData = {
                    ...data,
                    conditionPosition: t,
                    conditionLabelOffset: newOffset,
                };
                const command = commandController.createUpdateEdgeCommand(id, {
                    data: updatedData,
                });
                commandController.execute(command);
            }

            setIsConditionDragging(false);
            setTempConditionPosition(null);
            dragOffsetRef.current = null;
            document.body.style.cursor = "";
        }, [
            isConditionDragging,
            tempConditionPosition,
            data,
            id,
            sourceX,
            sourceY,
            targetX,
            targetY,
        ]);

        useEffect(() => {
            if (isConditionDragging) {
                window.addEventListener(
                    "mousemove",
                    handleConditionDrag as any
                );
                window.addEventListener("mouseup", handleConditionDragEnd);

                return () => {
                    window.removeEventListener(
                        "mousemove",
                        handleConditionDrag as any
                    );
                    window.removeEventListener(
                        "mouseup",
                        handleConditionDragEnd
                    );
                };
            }
        }, [isConditionDragging, handleConditionDrag, handleConditionDragEnd]);

        return (
            <BaseEdgeComponent
                id={id}
                sourceX={sourceX}
                sourceY={sourceY}
                targetX={targetX}
                targetY={targetY}
                sourcePosition={sourcePosition}
                targetPosition={targetPosition}
                style={style}
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
                    currentControlPoints,
                    selected,
                }: {
                    edgePath: string;
                    isSimpleMode: boolean;
                    centerX: number;
                    centerY: number;
                    currentControlPoints: { x: number; y: number }[];
                    selected: boolean;
                }) => {
                    currentControlPointsRef.current =
                        currentControlPoints || data?.controlPoints || [];
                    edgePathRef.current = edgePath || null;
                    pathStringRef.current = edgePath || "";

                    const conditionT = data?.conditionPosition ?? 0.5;
                    const { pathPoints } = calculateEdgePositions(
                        edgePath,
                        sourceX,
                        sourceY,
                        targetX,
                        targetY,
                        [conditionT],
                        isSimpleMode,
                        centerX,
                        centerY
                    );
                    const [cData] = pathPoints;
                    const baseAnchor = { x: cData.x, y: cData.y };
                    const live =
                        isConditionDragging && tempConditionTRef.current != null
                            ? getPointAndAngleOnPath(
                                  edgePath,
                                  tempConditionTRef.current,
                                  sourceX,
                                  sourceY,
                                  targetX,
                                  targetY
                              )
                            : {
                                  x: baseAnchor.x,
                                  y: baseAnchor.y,
                                  angle: cData.angle,
                              };
                    const conditionMarkerX = live.x;
                    const conditionMarkerY = live.y;
                    const conditionMarkerAngle = live.angle;

                    const hasCondition =
                        data?.condition &&
                        data.condition.trim() !== "" &&
                        data.condition !== "True";
                    const showConditionMarker = hasCondition;

                    const defaultConditionLabelOffset = { x: 0, y: -30 };
                    const conditionAnchor = {
                        x: conditionMarkerX,
                        y: conditionMarkerY,
                    };
                    anchorRef.current = conditionAnchor;
                    const conditionLabelOffset =
                        isConditionDragging && tempConditionPosition
                            ? {
                                  x:
                                      tempConditionPosition.x -
                                      conditionAnchor.x,
                                  y:
                                      tempConditionPosition.y -
                                      conditionAnchor.y,
                              }
                            : data?.conditionLabelOffset ||
                              defaultConditionLabelOffset;

                    const conditionLabelX =
                        conditionMarkerX + conditionLabelOffset.x;
                    const conditionLabelY =
                        conditionMarkerY + conditionLabelOffset.y;

                    return showConditionMarker ? (
                        <EdgeLabelRenderer>
                            <svg
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    pointerEvents: "none",
                                    zIndex: 5,
                                }}
                                width="100%"
                                height="100%"
                            >
                                <line
                                    x1={conditionMarkerX}
                                    y1={conditionMarkerY}
                                    x2={conditionLabelX}
                                    y2={conditionLabelY}
                                    stroke={selected ? "#3b82f6" : "#6b7280"}
                                    strokeWidth="1"
                                    strokeDasharray="3,3"
                                    opacity={0.7}
                                />
                            </svg>

                            {/* Condition Marker */}
                            <div
                                style={{
                                    position: "absolute",
                                    transform: `translate(-50%, -50%) translate(${conditionMarkerX}px,${conditionMarkerY}px) rotate(${conditionMarkerAngle}deg)`,
                                    pointerEvents: "none",
                                }}
                                className="nodrag nopan"
                            >
                                <svg
                                    width="24"
                                    height="16"
                                    viewBox="-6 -5 12 10"
                                    className={
                                        selected
                                            ? "stroke-blue-500"
                                            : "stroke-gray-600 dark:stroke-gray-400"
                                    }
                                >
                                    <path
                                        d="M -5 0 Q -2.5 -4 0 0 Q 2.5 4 5 0"
                                        strokeWidth="1.5"
                                        fill="none"
                                    />
                                </svg>
                            </div>

                            {/* Draggable Condition Label */}
                            <div
                                ref={conditionLabelRef}
                                style={{
                                    position: "absolute",
                                    transform: `translate(-50%, -50%) translate(${conditionLabelX}px,${conditionLabelY}px)`,
                                    pointerEvents: selected ? "all" : "none",
                                    cursor: isConditionDragging
                                        ? "grabbing"
                                        : selected
                                        ? "grab"
                                        : "default",
                                }}
                                className="nodrag nopan"
                                onMouseDown={
                                    selected
                                        ? handleConditionDragStart
                                        : undefined
                                }
                            >
                                <div
                                    className={`edge-label flex justify-center items-center ${
                                        selected
                                            ? "bg-blue-50 dark:bg-blue-900/50"
                                            : "bg-white/70 dark:bg-zinc-800/70"
                                    } p-1 rounded text-xs ${
                                        selected
                                            ? "shadow-md border border-blue-300 dark:border-blue-600"
                                            : "shadow"
                                    } ${
                                        isConditionDragging ? "opacity-70" : ""
                                    }`}
                                    style={{
                                        minWidth: "20px",
                                        backdropFilter: "blur(4px)",
                                    }}
                                >
                                    <ReactKatex>
                                        {data?.condition || "True"}
                                    </ReactKatex>
                                </div>
                            </div>
                        </EdgeLabelRenderer>
                    ) : null;
                }}
            </BaseEdgeComponent>
        );
    }
) as any;

RCQEdge.getDefaultData = (): RCQEdgeData => ({
    ...getDefaultBaseEdgeData(),
    condition: "True",
    conditionLabelOffset: { x: 0, y: -30 },
});

RCQEdge.getGraphType = (): string => "rcq";

RCQEdge.displayName = "RCQEdge";

export default RCQEdge;
