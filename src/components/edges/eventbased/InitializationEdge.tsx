"use client";

import React, { memo, useState, useCallback, useRef, useEffect } from "react";
import { EdgeProps, EdgeLabelRenderer } from "reactflow";
import ReactKatex from "@pkasila/react-katex";
import { CommandController } from "@/controllers/CommandController";
import BaseEdgeComponent, {
    BaseEdgeData,
    BaseEdgeProps,
} from "@/components/edges/BaseEdgeComponent";
import {
    parseTransformMatrix,
    clientToFlowPosition,
    throttle,
    snapToGrid,
} from "@/lib/utils/math";

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
                transformMatrixRef.current =
                    parseTransformMatrix(transformStyle);

                const edgeType = data?.edgeType || "straight";
                const hasCustomControlPoints =
                    data?.controlPoints && data.controlPoints.length > 0;
                const isSimpleMode =
                    edgeType === "straight" && !hasCustomControlPoints;

                const delayPosition = data?.delayPosition ?? 0.25;
                let delayPoint: { x: number; y: number };

                if (isSimpleMode) {
                    const dx = targetX - sourceX;
                    const dy = targetY - sourceY;
                    delayPoint = {
                        x: sourceX + dx * delayPosition,
                        y: sourceY + dy * delayPosition,
                    };
                } else {
                    const centerX = (sourceX + targetX) / 2;
                    const centerY = (sourceY + targetY) / 2;
                    delayPoint = { x: centerX, y: centerY };
                }

                const defaultDelayLabelOffset = { x: 0, y: -30 };
                const delayLabelOffset =
                    data?.delayLabelOffset || defaultDelayLabelOffset;
                const delayLabelX = delayPoint.x + delayLabelOffset.x;
                const delayLabelY = delayPoint.y + delayLabelOffset.y;

                const mousePosition = clientToFlowPosition(
                    e.clientX,
                    e.clientY,
                    transformMatrixRef.current
                );

                const offsetX = delayLabelX - mousePosition.x;
                const offsetY = delayLabelY - mousePosition.y;

                dragOffsetRef.current = { x: offsetX, y: offsetY };
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

                    setTempDelayPosition(snappedPosition);
                }
            }, 16),
            [isDelayDragging]
        );

        const handleDelayDragEnd = useCallback(() => {
            if (isDelayDragging && tempDelayPosition) {
                const edgeType = data?.edgeType || "straight";
                const hasCustomControlPoints =
                    data?.controlPoints && data.controlPoints.length > 0;
                const isSimpleMode =
                    edgeType === "straight" && !hasCustomControlPoints;

                const delayPosition = data?.delayPosition ?? 0.25;
                let edgePoint: { x: number; y: number };

                if (isSimpleMode) {
                    const dx = targetX - sourceX;
                    const dy = targetY - sourceY;
                    edgePoint = {
                        x: sourceX + dx * delayPosition,
                        y: sourceY + dy * delayPosition,
                    };
                } else {
                    const centerX = (sourceX + targetX) / 2;
                    const centerY = (sourceY + targetY) / 2;
                    edgePoint = { x: centerX, y: centerY };
                }

                const offset = {
                    x: tempDelayPosition.x - edgePoint.x,
                    y: tempDelayPosition.y - edgePoint.y,
                };

                const command = commandController.createUpdateEdgeCommand(id, {
                    data: {
                        ...data,
                        delayLabelOffset: offset,
                    },
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
                }: {
                    isSimpleMode: boolean;
                    centerX: number;
                    centerY: number;
                }) => {
                    const delayPosition = data?.delayPosition ?? 0.25;

                    let delayPoint: { x: number; y: number };

                    if (isSimpleMode) {
                        const dx = targetX - sourceX;
                        const dy = targetY - sourceY;
                        delayPoint = {
                            x: sourceX + dx * delayPosition,
                            y: sourceY + dy * delayPosition,
                        };
                    } else {
                        delayPoint = { x: centerX, y: centerY };
                    }

                    const defaultDelayLabelOffset = { x: 0, y: -30 };
                    const delayLabelOffset =
                        isDelayDragging && tempDelayPosition
                            ? {
                                  x: tempDelayPosition.x - delayPoint.x,
                                  y: tempDelayPosition.y - delayPoint.y,
                              }
                            : data?.delayLabelOffset || defaultDelayLabelOffset;

                    const delayLabelX = delayPoint.x + delayLabelOffset.x;
                    const delayLabelY = delayPoint.y + delayLabelOffset.y;

                    return (
                        <EdgeLabelRenderer>
                            {/* Connection line from edge to label */}
                            {(hasInitialDelay || !hasInitialDelay) && (
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
                                        x1={delayPoint.x}
                                        y1={delayPoint.y}
                                        x2={delayLabelX}
                                        y2={delayLabelY}
                                        stroke={
                                            selected ? "#3b82f6" : "#6b7280"
                                        }
                                        strokeWidth="1"
                                        strokeDasharray="3,3"
                                        opacity={0.7}
                                    />
                                </svg>
                            )}

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
        );
    }
) as InitializationEdgeComponent;

InitializationEdge.getDefaultData = (): InitializationEdgeData => ({
    initialDelay: "0",
    delayPosition: 0.25,
    delayLabelOffset: { x: 0, y: -30 },
    edgeType: "straight",
});

InitializationEdge.getGraphType = (): string => "eventBased";

InitializationEdge.displayName = "InitializationEdge";

export default InitializationEdge;
