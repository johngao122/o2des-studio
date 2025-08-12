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
        const polylineRef = useRef<Array<{ x: number; y: number }>>([]);
        const currentControlPointsRef = useRef<Array<{ x: number; y: number }>>(
            []
        );

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
                    const t = data?.conditionPosition ?? 0.5;
                    const anchorPoint = getPointAtT(poly, t);
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
                    const adjusted = {
                        x: mousePosition.x + dragOffsetRef.current.x,
                        y: mousePosition.y + dragOffsetRef.current.y,
                    };
                    const proj = projectPointOntoPolyline(
                        polylineRef.current,
                        adjusted
                    );
                    tempConditionTRef.current = proj.t;
                    const dx = adjusted.x - proj.x;
                    const dy = adjusted.y - proj.y;
                    const len = Math.hypot(dx, dy);
                    const maxOffset = 30;
                    const s = len > maxOffset && len > 0 ? maxOffset / len : 1;
                    const newPos = { x: proj.x + dx * s, y: proj.y + dy * s };
                    setTempConditionPosition(newPos);
                }
            }, 16),
            [isConditionDragging]
        );

        const handleConditionDragEnd = useCallback(() => {
            if (isConditionDragging && tempConditionPosition) {
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
                const t =
                    tempConditionTRef.current != null
                        ? (tempConditionTRef.current as number)
                        : data?.conditionPosition ?? 0.5;
                const anchor = getPointAtT(poly, t);
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
                    isSimpleMode,
                    centerX,
                    centerY,
                    currentControlPoints,
                    selected,
                }: {
                    isSimpleMode: boolean;
                    centerX: number;
                    centerY: number;
                    currentControlPoints: { x: number; y: number }[];
                    selected: boolean;
                }) => {
                    currentControlPointsRef.current =
                        currentControlPoints || data?.controlPoints || [];

                    const poly = buildPolyline(
                        sourceX,
                        sourceY,
                        targetX,
                        targetY,
                        currentControlPointsRef.current
                    );

                    polylineRef.current = poly;
                    const t =
                        isConditionDragging && tempConditionTRef.current != null
                            ? (tempConditionTRef.current as number)
                            : data?.conditionPosition ?? 0.5;
                    const anchorPoint = getPointAtT(poly, t);
                    const conditionMarkerX = anchorPoint.x;
                    const conditionMarkerY = anchorPoint.y;
                    const conditionMarkerAngle = getAngleAtT(poly, t);

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
                            {/* Dotted connector from anchor to label */}
                            <svg
                                style={{
                                    position: "absolute",
                                    left:
                                        Math.min(
                                            conditionMarkerX,
                                            conditionLabelX
                                        ) - 20,
                                    top:
                                        Math.min(
                                            conditionMarkerY,
                                            conditionLabelY
                                        ) - 20,
                                    pointerEvents: "none",
                                    zIndex: 5,
                                }}
                                width={
                                    Math.abs(
                                        conditionLabelX - conditionMarkerX
                                    ) + 40
                                }
                                height={
                                    Math.abs(
                                        conditionLabelY - conditionMarkerY
                                    ) + 40
                                }
                            >
                                <line
                                    x1={
                                        conditionMarkerX -
                                        (Math.min(
                                            conditionMarkerX,
                                            conditionLabelX
                                        ) -
                                            20)
                                    }
                                    y1={
                                        conditionMarkerY -
                                        (Math.min(
                                            conditionMarkerY,
                                            conditionLabelY
                                        ) -
                                            20)
                                    }
                                    x2={
                                        conditionLabelX -
                                        (Math.min(
                                            conditionMarkerX,
                                            conditionLabelX
                                        ) -
                                            20)
                                    }
                                    y2={
                                        conditionLabelY -
                                        (Math.min(
                                            conditionMarkerY,
                                            conditionLabelY
                                        ) -
                                            20)
                                    }
                                    stroke="#6b7280"
                                    strokeWidth="1"
                                    strokeDasharray="3,3"
                                    opacity={0.7}
                                />
                            </svg>
                            {/* Draggable Condition Marker */}
                            {selected && (
                                <div
                                    style={{
                                        position: "absolute",
                                        transform: `translate(-50%, -50%) translate(${conditionMarkerX}px,${conditionMarkerY}px)`,
                                        pointerEvents: "all",
                                        cursor: isConditionDragging
                                            ? "grabbing"
                                            : "grab",
                                    }}
                                    className="nodrag nopan"
                                    onMouseDown={handleConditionDragStart}
                                >
                                    <div
                                        className={`w-3 h-3 rounded-full border-2 ${
                                            isConditionDragging
                                                ? "bg-blue-500 border-blue-600"
                                                : "bg-white border-blue-500"
                                        } shadow-md hover:scale-110 transition-transform`}
                                    />
                                </div>
                            )}

                            {/* Condition Marker */}
                            <div
                                style={{
                                    position: "absolute",
                                    transform: `translate(-50%, -50%) translate(${conditionMarkerX}px,${conditionMarkerY}px) rotate(${
                                        conditionMarkerAngle + 90
                                    }deg)`,
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
