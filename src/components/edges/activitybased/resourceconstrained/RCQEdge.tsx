"use client";

import React, {
    memo,
    useState,
    useCallback,
    MouseEvent,
    useRef,
    useEffect,
} from "react";
import {
    EdgeProps,
    BaseEdge,
    EdgeLabelRenderer,
    getStraightPath,
    getBezierPath,
    getSmoothStepPath,
    Position,
} from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import {
    parseTransformMatrix,
    clientToFlowPosition,
    throttle,
    snapToGrid,
} from "@/lib/utils/math";
import { calculateDefaultControlPoints } from "@/lib/utils/edge";

const commandController = CommandController.getInstance();

type EdgeTypeOption = "straight" | "bezier" | "smoothstep";

interface RCQEdgeData {
    edgeType?: EdgeTypeOption;
    controlPoint1?: { x: number; y: number };
    controlPoint2?: { x: number; y: number };
    controlPoint3?: { x: number; y: number };
    condition?: string;
    conditionLabelOffset?: { x: number; y: number };
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
        const [isDragging, setIsDragging] = useState<number | null>(null);
        const [isConditionDragging, setIsConditionDragging] = useState(false);
        const [tempControlPoints, setTempControlPoints] = useState<{
            cp1?: { x: number; y: number };
            cp2?: { x: number; y: number };
            cp3?: { x: number; y: number };
        }>({});
        const [tempConditionPosition, setTempConditionPosition] = useState<{
            x: number;
            y: number;
        } | null>(null);

        const flowPaneRef = useRef<Element | null>(null);
        const transformMatrixRef = useRef<ReturnType<
            typeof parseTransformMatrix
        > | null>(null);
        const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

        const edgeStyle = {
            strokeWidth: selected ? 3 : 2,
            stroke: selected ? "#3b82f6" : "#555",
            ...style,
        };

        const edgeType = data?.edgeType || "straight";

        const defaultControlPoints = calculateDefaultControlPoints(
            sourceX,
            sourceY,
            targetX,
            targetY
        );

        const controlPoint1 =
            isDragging === 1 && tempControlPoints.cp1
                ? tempControlPoints.cp1
                : data?.controlPoint1 || defaultControlPoints.cp1;

        const controlPoint2 =
            isDragging === 2 && tempControlPoints.cp2
                ? tempControlPoints.cp2
                : data?.controlPoint2 || defaultControlPoints.cp2;

        const controlPoint3 =
            isDragging === 3 && tempControlPoints.cp3
                ? tempControlPoints.cp3
                : data?.controlPoint3 || defaultControlPoints.cp3;

        let edgePath: string;
        let labelX: number, labelY: number;
        let conditionMarkerX: number, conditionMarkerY: number;
        let conditionMarkerAngle: number;

        labelX = controlPoint2.x;
        labelY = controlPoint2.y;

        conditionMarkerX = controlPoint2.x;
        conditionMarkerY = controlPoint2.y;

        if (edgeType === "straight") {
            conditionMarkerAngle =
                Math.atan2(
                    controlPoint3.y - controlPoint1.y,
                    controlPoint3.x - controlPoint1.x
                ) *
                (180 / Math.PI);
        } else {
            conditionMarkerAngle =
                Math.atan2(targetY - sourceY, targetX - sourceX) *
                (180 / Math.PI);
        }

        const hasCondition =
            data?.condition &&
            data.condition.trim() !== "" &&
            data.condition !== "True";
        const showConditionMarker = hasCondition;

        const defaultConditionLabelOffset = { x: 0, y: -30 };
        const conditionLabelOffset =
            isConditionDragging && tempConditionPosition
                ? {
                      x: tempConditionPosition.x - conditionMarkerX,
                      y: tempConditionPosition.y - conditionMarkerY,
                  }
                : data?.conditionLabelOffset || defaultConditionLabelOffset;

        const conditionLabelX = conditionMarkerX + conditionLabelOffset.x;
        const conditionLabelY = conditionMarkerY + conditionLabelOffset.y;

        switch (edgeType) {
            case "bezier":
                const [segment1] = getBezierPath({
                    sourceX,
                    sourceY,
                    sourcePosition: Position.Right,
                    targetX: controlPoint1.x,
                    targetY: controlPoint1.y,
                    targetPosition: Position.Left,
                });
                const [segment2] = getBezierPath({
                    sourceX: controlPoint1.x,
                    sourceY: controlPoint1.y,
                    sourcePosition: Position.Right,
                    targetX: controlPoint2.x,
                    targetY: controlPoint2.y,
                    targetPosition: Position.Left,
                });
                const [segment3] = getBezierPath({
                    sourceX: controlPoint2.x,
                    sourceY: controlPoint2.y,
                    sourcePosition: Position.Right,
                    targetX: controlPoint3.x,
                    targetY: controlPoint3.y,
                    targetPosition: Position.Left,
                });
                const [segment4] = getBezierPath({
                    sourceX: controlPoint3.x,
                    sourceY: controlPoint3.y,
                    sourcePosition: Position.Right,
                    targetX,
                    targetY,
                    targetPosition: Position.Left,
                });

                edgePath =
                    segment1 +
                    " " +
                    segment2.replace("M", "L") +
                    " " +
                    segment3.replace("M", "L") +
                    " " +
                    segment4.replace("M", "L");
                break;

            case "smoothstep":
                const [smoothSegment1] = getSmoothStepPath({
                    sourceX,
                    sourceY,
                    sourcePosition: Position.Right,
                    targetX: controlPoint1.x,
                    targetY: controlPoint1.y,
                    targetPosition: Position.Left,
                });
                const [smoothSegment2] = getSmoothStepPath({
                    sourceX: controlPoint1.x,
                    sourceY: controlPoint1.y,
                    sourcePosition: Position.Right,
                    targetX: controlPoint2.x,
                    targetY: controlPoint2.y,
                    targetPosition: Position.Left,
                });
                const [smoothSegment3] = getSmoothStepPath({
                    sourceX: controlPoint2.x,
                    sourceY: controlPoint2.y,
                    sourcePosition: Position.Right,
                    targetX: controlPoint3.x,
                    targetY: controlPoint3.y,
                    targetPosition: Position.Left,
                });
                const [smoothSegment4] = getSmoothStepPath({
                    sourceX: controlPoint3.x,
                    sourceY: controlPoint3.y,
                    sourcePosition: Position.Right,
                    targetX,
                    targetY,
                    targetPosition: Position.Left,
                });

                edgePath =
                    smoothSegment1 +
                    " " +
                    smoothSegment2.replace("M", "L") +
                    " " +
                    smoothSegment3.replace("M", "L") +
                    " " +
                    smoothSegment4.replace("M", "L");
                break;

            case "straight":
            default:
                const [straightSegment1] = getStraightPath({
                    sourceX,
                    sourceY,
                    targetX: controlPoint1.x,
                    targetY: controlPoint1.y,
                });
                const [straightSegment2] = getStraightPath({
                    sourceX: controlPoint1.x,
                    sourceY: controlPoint1.y,
                    targetX: controlPoint2.x,
                    targetY: controlPoint2.y,
                });
                const [straightSegment3] = getStraightPath({
                    sourceX: controlPoint2.x,
                    sourceY: controlPoint2.y,
                    targetX: controlPoint3.x,
                    targetY: controlPoint3.y,
                });
                const [straightSegment4] = getStraightPath({
                    sourceX: controlPoint3.x,
                    sourceY: controlPoint3.y,
                    targetX,
                    targetY,
                });

                edgePath =
                    straightSegment1 +
                    " " +
                    straightSegment2.replace("M", "L") +
                    " " +
                    straightSegment3.replace("M", "L") +
                    " " +
                    straightSegment4.replace("M", "L");
                break;
        }

        const handleConditionDragStart = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();

            flowPaneRef.current = document.querySelector(
                ".react-flow__viewport"
            );

            if (flowPaneRef.current) {
                const transformStyle = window.getComputedStyle(
                    flowPaneRef.current
                ).transform;
                transformMatrixRef.current =
                    parseTransformMatrix(transformStyle);

                const mousePosition = clientToFlowPosition(
                    e.clientX,
                    e.clientY,
                    transformMatrixRef.current
                );

                const offsetX = conditionLabelX - mousePosition.x;
                const offsetY = conditionLabelY - mousePosition.y;

                dragOffsetRef.current = { x: offsetX, y: offsetY };
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
                        const transformStyle = window.getComputedStyle(
                            flowPaneRef.current
                        ).transform;
                        transformMatrixRef.current =
                            parseTransformMatrix(transformStyle);
                    }

                    const mousePosition = clientToFlowPosition(
                        e.clientX,
                        e.clientY,
                        transformMatrixRef.current
                    );

                    const rawPosition = {
                        x: mousePosition.x + dragOffsetRef.current.x,
                        y: mousePosition.y + dragOffsetRef.current.y,
                    };

                    const snappedPosition = {
                        x: snapToGrid(rawPosition.x),
                        y: snapToGrid(rawPosition.y),
                    };

                    setTempConditionPosition(snappedPosition);
                }
            }, 16),
            [isConditionDragging]
        );

        const handleConditionDragEnd = useCallback(() => {
            if (isConditionDragging && tempConditionPosition) {
                const newOffset = {
                    x: tempConditionPosition.x - conditionMarkerX,
                    y: tempConditionPosition.y - conditionMarkerY,
                };

                const updatedData = {
                    ...data,
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
            conditionMarkerX,
            conditionMarkerY,
        ]);

        const handleDragStart =
            (controlPointIndex: number) => (e: MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();

                flowPaneRef.current = document.querySelector(
                    ".react-flow__viewport"
                );

                if (flowPaneRef.current) {
                    const transformStyle = window.getComputedStyle(
                        flowPaneRef.current
                    ).transform;
                    transformMatrixRef.current =
                        parseTransformMatrix(transformStyle);

                    const currentControlPoint =
                        controlPointIndex === 1
                            ? controlPoint1
                            : controlPointIndex === 2
                            ? controlPoint2
                            : controlPoint3;

                    const mousePosition = clientToFlowPosition(
                        e.clientX,
                        e.clientY,
                        transformMatrixRef.current
                    );

                    const offsetX = currentControlPoint.x - mousePosition.x;
                    const offsetY = currentControlPoint.y - mousePosition.y;

                    dragOffsetRef.current = { x: offsetX, y: offsetY };
                    setIsDragging(controlPointIndex);
                    document.body.style.cursor = "grabbing";
                }
            };

        const handleDrag = useCallback(
            throttle((e: MouseEvent) => {
                if (isDragging === null || !dragOffsetRef.current) return;

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
                        transformMatrixRef.current =
                            parseTransformMatrix(transformStyle);
                    }

                    const mousePosition = clientToFlowPosition(
                        e.clientX,
                        e.clientY,
                        transformMatrixRef.current
                    );

                    const rawPosition = {
                        x: mousePosition.x + dragOffsetRef.current.x,
                        y: mousePosition.y + dragOffsetRef.current.y,
                    };

                    const snappedPosition = {
                        x: snapToGrid(rawPosition.x),
                        y: snapToGrid(rawPosition.y),
                    };

                    setTempControlPoints((prev) => ({
                        ...prev,
                        [`cp${isDragging}`]: snappedPosition,
                    }));
                }
            }, 16),
            [isDragging]
        );

        const handleDragEnd = useCallback(() => {
            if (
                isDragging !== null &&
                tempControlPoints[
                    `cp${isDragging}` as keyof typeof tempControlPoints
                ]
            ) {
                const updatedData = {
                    ...data,
                    [`controlPoint${isDragging}`]:
                        tempControlPoints[
                            `cp${isDragging}` as keyof typeof tempControlPoints
                        ],
                };

                const command = commandController.createUpdateEdgeCommand(id, {
                    data: updatedData,
                });
                commandController.execute(command);
            }

            setIsDragging(null);
            setTempControlPoints({});
            dragOffsetRef.current = null;
            document.body.style.cursor = "";
        }, [isDragging, tempControlPoints, data, id]);

        useEffect(() => {
            if (isDragging !== null) {
                window.addEventListener("mousemove", handleDrag as any);
                window.addEventListener("mouseup", handleDragEnd);

                return () => {
                    window.removeEventListener("mousemove", handleDrag as any);
                    window.removeEventListener("mouseup", handleDragEnd);
                };
            }
        }, [isDragging, handleDrag, handleDragEnd]);

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
            <>
                {/* Selected Outline */}
                {selected && (
                    <path
                        d={edgePath}
                        style={{
                            stroke: "#93c5fd",
                            strokeWidth: 6,
                            strokeOpacity: 0.5,
                            fill: "none",
                        }}
                    />
                )}

                {/* Main Edge Path */}
                <BaseEdge
                    id={id}
                    path={edgePath}
                    markerEnd={markerEnd}
                    style={edgeStyle}
                />

                {/* Control Points */}
                {selected && (
                    <EdgeLabelRenderer>
                        {/* Control Point 1 */}
                        <div
                            style={{
                                position: "absolute",
                                transform: `translate(-50%, -50%) translate(${controlPoint1.x}px,${controlPoint1.y}px)`,
                                pointerEvents: "all",
                                cursor: isDragging === 1 ? "grabbing" : "grab",
                            }}
                            className="nodrag nopan"
                            onMouseDown={handleDragStart(1)}
                        >
                            <div
                                className={`w-3 h-3 rounded-full border-2 ${
                                    isDragging === 1
                                        ? "bg-blue-500 border-blue-600"
                                        : "bg-white border-blue-500"
                                } shadow-md hover:scale-110 transition-transform`}
                            />
                        </div>

                        {/* Control Point 2 */}
                        <div
                            style={{
                                position: "absolute",
                                transform: `translate(-50%, -50%) translate(${controlPoint2.x}px,${controlPoint2.y}px)`,
                                pointerEvents: "all",
                                cursor: isDragging === 2 ? "grabbing" : "grab",
                            }}
                            className="nodrag nopan"
                            onMouseDown={handleDragStart(2)}
                        >
                            {!showConditionMarker && (
                                <div
                                    className={`w-3 h-3 rounded-full border-2 ${
                                        isDragging === 2
                                            ? "bg-blue-500 border-blue-600"
                                            : "bg-white border-blue-500"
                                    } shadow-md hover:scale-110 transition-transform`}
                                />
                            )}
                        </div>

                        {/* Control Point 3 */}
                        <div
                            style={{
                                position: "absolute",
                                transform: `translate(-50%, -50%) translate(${controlPoint3.x}px,${controlPoint3.y}px)`,
                                pointerEvents: "all",
                                cursor: isDragging === 3 ? "grabbing" : "grab",
                            }}
                            className="nodrag nopan"
                            onMouseDown={handleDragStart(3)}
                        >
                            <div
                                className={`w-3 h-3 rounded-full border-2 ${
                                    isDragging === 3
                                        ? "bg-blue-500 border-blue-600"
                                        : "bg-white border-blue-500"
                                } shadow-md hover:scale-110 transition-transform`}
                            />
                        </div>
                    </EdgeLabelRenderer>
                )}

                {/* Conditional Marker and Label */}
                {showConditionMarker && (
                    <EdgeLabelRenderer>
                        {/* Draggable Condition Marker */}
                        {selected && (
                            <div
                                style={{
                                    position: "absolute",
                                    transform: `translate(-50%, -50%) translate(${conditionMarkerX}px,${conditionMarkerY}px)`,
                                    pointerEvents: "all",
                                    cursor:
                                        isDragging === 2 ? "grabbing" : "grab",
                                }}
                                className="nodrag nopan"
                                onMouseDown={handleDragStart(2)}
                            >
                                <div
                                    className={`w-3 h-3 rounded-full border-2 ${
                                        isDragging === 2
                                            ? "bg-blue-500 border-blue-600"
                                            : "bg-white border-blue-500"
                                    } shadow-md hover:scale-110 transition-transform`}
                                />
                            </div>
                        )}

                        {/* Condition Squiggle Marker */}
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
                                selected ? handleConditionDragStart : undefined
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
                                } ${isConditionDragging ? "opacity-70" : ""}`}
                                style={{
                                    minWidth: "20px",
                                    backdropFilter: "blur(4px)",
                                }}
                            >
                                <MathJax>{data?.condition || "True"}</MathJax>
                            </div>
                        </div>
                    </EdgeLabelRenderer>
                )}
            </>
        );
    }
) as any;

RCQEdge.getDefaultData = (): RCQEdgeData => ({
    edgeType: "straight",
    condition: "True",
    conditionLabelOffset: { x: 0, y: -30 },
});

RCQEdge.getGraphType = (): string => "rcq";

RCQEdge.displayName = "RCQEdge";

export default RCQEdge;
