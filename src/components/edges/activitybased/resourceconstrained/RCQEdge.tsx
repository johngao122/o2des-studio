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
    snapToGrid,
} from "@/lib/utils/math";
import BaseEdgeComponent, {
    BaseEdgeData,
    EdgeTypeOption,
} from "@/components/edges/BaseEdgeComponent";

const commandController = CommandController.getInstance();

interface RCQEdgeData extends BaseEdgeData {
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
        const [isConditionDragging, setIsConditionDragging] = useState(false);
        const [tempConditionPosition, setTempConditionPosition] = useState<{
            x: number;
            y: number;
        } | null>(null);

        const flowPaneRef = useRef<Element | null>(null);
        const transformMatrixRef = useRef<ReturnType<
            typeof parseTransformMatrix
        > | null>(null);
        const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

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

                const edgeType = data?.edgeType || "straight";
                const hasCustomControlPoints =
                    data?.controlPoints && data.controlPoints.length > 0;
                const isSimpleMode =
                    edgeType === "straight" && !hasCustomControlPoints;

                let conditionMarkerX: number, conditionMarkerY: number;

                if (isSimpleMode) {
                    conditionMarkerX = (sourceX + targetX) / 2;
                    conditionMarkerY = (sourceY + targetY) / 2;
                } else {
                    const controlPoints = data?.controlPoints || [];
                    const middleIndex = Math.floor(controlPoints.length / 2);
                    const middlePoint = controlPoints[middleIndex];
                    if (middlePoint) {
                        conditionMarkerX = middlePoint.x;
                        conditionMarkerY = middlePoint.y;
                    } else {
                        conditionMarkerX = (sourceX + targetX) / 2;
                        conditionMarkerY = (sourceY + targetY) / 2;
                    }
                }

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
                const edgeType = data?.edgeType || "straight";
                const hasCustomControlPoints =
                    data?.controlPoints && data.controlPoints.length > 0;
                const isSimpleMode =
                    edgeType === "straight" && !hasCustomControlPoints;

                let conditionMarkerX: number, conditionMarkerY: number;

                if (isSimpleMode) {
                    conditionMarkerX = (sourceX + targetX) / 2;
                    conditionMarkerY = (sourceY + targetY) / 2;
                } else {
                    const controlPoints = data?.controlPoints || [];
                    const middleIndex = Math.floor(controlPoints.length / 2);
                    const middlePoint = controlPoints[middleIndex];
                    if (middlePoint) {
                        conditionMarkerX = middlePoint.x;
                        conditionMarkerY = middlePoint.y;
                    } else {
                        conditionMarkerX = (sourceX + targetX) / 2;
                        conditionMarkerY = (sourceY + targetY) / 2;
                    }
                }

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
                    const edgeType = data?.edgeType || "straight";

                    let conditionMarkerX: number, conditionMarkerY: number;
                    let conditionMarkerAngle: number;

                    if (isSimpleMode) {
                        conditionMarkerX = centerX;
                        conditionMarkerY = centerY;
                    } else {
                        const controlPoints =
                            data?.controlPoints || currentControlPoints;
                        const middleIndex = Math.floor(
                            controlPoints.length / 2
                        );
                        const middlePoint = controlPoints[middleIndex];
                        if (middlePoint) {
                            conditionMarkerX = middlePoint.x;
                            conditionMarkerY = middlePoint.y;
                        } else {
                            conditionMarkerX = centerX;
                            conditionMarkerY = centerY;
                        }
                    }

                    if (edgeType === "straight" || edgeType === "rounded") {
                        if (isSimpleMode) {
                            conditionMarkerAngle =
                                Math.atan2(
                                    targetY - sourceY,
                                    targetX - sourceX
                                ) *
                                (180 / Math.PI);
                        } else {
                            const controlPoints =
                                data?.controlPoints || currentControlPoints;
                            const firstPoint = controlPoints[0];
                            const lastPoint =
                                controlPoints[controlPoints.length - 1];
                            if (firstPoint && lastPoint) {
                                conditionMarkerAngle =
                                    Math.atan2(
                                        lastPoint.y - firstPoint.y,
                                        lastPoint.x - firstPoint.x
                                    ) *
                                    (180 / Math.PI);
                            } else {
                                conditionMarkerAngle =
                                    Math.atan2(
                                        targetY - sourceY,
                                        targetX - sourceX
                                    ) *
                                    (180 / Math.PI);
                            }
                        }
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
                            : data?.conditionLabelOffset ||
                              defaultConditionLabelOffset;

                    const conditionLabelX =
                        conditionMarkerX + conditionLabelOffset.x;
                    const conditionLabelY =
                        conditionMarkerY + conditionLabelOffset.y;

                    return showConditionMarker ? (
                        <EdgeLabelRenderer>
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
    edgeType: "straight",
    condition: "True",
    conditionLabelOffset: { x: 0, y: -30 },
    isDependency: false,
    controlPoints: undefined,
});

RCQEdge.getGraphType = (): string => "rcq";

RCQEdge.displayName = "RCQEdge";

export default RCQEdge;
