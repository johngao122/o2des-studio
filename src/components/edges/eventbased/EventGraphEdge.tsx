"use client";

import React, { memo, useCallback, useRef, useEffect } from "react";
import { EdgeProps, EdgeLabelRenderer } from "reactflow";
import ReactKatex from "@pkasila/react-katex";
import { CommandController } from "@/controllers/CommandController";
import {
    getBezierPoint,
    parseTransformMatrix,
    clientToFlowPosition,
    throttle,
    snapToGrid,
    getPointAndAngleOnPath,
    calculateEdgePositions,
} from "@/lib/utils/math";
import BaseEdgeComponent, {
    BaseEdgeData,
    BaseEdgeProps,
} from "@/components/edges/BaseEdgeComponent";

const commandController = CommandController.getInstance();

interface EventGraphEdgeData extends BaseEdgeData {
    condition?: string;
    delay?: string;
    parameter?: string;
    conditionPosition?: number;
    delayPosition?: number;
    parameterPosition?: number;
    conditionLabelOffset?: { x: number; y: number };
    delayLabelOffset?: { x: number; y: number };
    parameterLabelOffset?: { x: number; y: number };
}

interface ExtendedEdgeProps extends BaseEdgeProps<EventGraphEdgeData> {
    onClick?: () => void;
}

interface EventGraphEdgeComponent
    extends React.NamedExoticComponent<ExtendedEdgeProps> {
    getDefaultData?: () => EventGraphEdgeData;
    getGraphType?: () => string;
    displayName?: string;
}

const EventGraphEdge = memo(
    ({
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        style = {},
        data = {} as EventGraphEdgeData,
        markerEnd,
        selected,
        onClick,
    }: ExtendedEdgeProps) => {
        const [isConditionDragging, setIsConditionDragging] =
            React.useState(false);
        const [isDelayDragging, setIsDelayDragging] = React.useState(false);
        const [isParamDragging, setIsParamDragging] = React.useState(false);

        const [tempConditionPosition, setTempConditionPosition] =
            React.useState<{
                x: number;
                y: number;
            } | null>(null);
        const [tempDelayPosition, setTempDelayPosition] = React.useState<{
            x: number;
            y: number;
        } | null>(null);
        const [tempParamPosition, setTempParamPosition] = React.useState<{
            x: number;
            y: number;
        } | null>(null);

        const conditionLabelRef = useRef<HTMLDivElement>(null);
        const delayLabelRef = useRef<HTMLDivElement>(null);
        const paramLabelRef = useRef<HTMLDivElement>(null);
        const flowPaneRef = useRef<Element | null>(null);
        const transformMatrixRef = useRef<ReturnType<
            typeof parseTransformMatrix
        > | null>(null);
        const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

        const hasCondition = !!(
            data?.condition && data.condition.trim() !== ""
        );
        const hasDelay = !!(data?.delay && data.delay.trim() !== "");
        const hasParameter = !!(
            data?.parameter && data.parameter.trim() !== ""
        );

        const createDragStartHandler =
            (
                type: "condition" | "delay" | "parameter",
                setDragging: (dragging: boolean) => void
            ) =>
            (e: React.MouseEvent) => {
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

                    let position: number;
                    let defaultOffset: { x: number; y: number };
                    let currentOffset: { x: number; y: number } | undefined;

                    switch (type) {
                        case "condition":
                            position = data?.conditionPosition ?? 0.5;
                            defaultOffset = { x: 0, y: -40 };
                            currentOffset = data?.conditionLabelOffset;
                            break;
                        case "delay":
                            position = data?.delayPosition ?? 0.25;
                            defaultOffset = { x: 0, y: -30 };
                            currentOffset = data?.delayLabelOffset;
                            break;
                        case "parameter":
                            position = data?.parameterPosition ?? 0.75;
                            defaultOffset = { x: 0, y: -50 };
                            currentOffset = data?.parameterLabelOffset;
                            break;
                    }

                    let edgePoint: { x: number; y: number };

                    if (isSimpleMode) {
                        const dx = targetX - sourceX;
                        const dy = targetY - sourceY;
                        edgePoint = {
                            x: sourceX + dx * position,
                            y: sourceY + dy * position,
                        };
                    } else {
                        const centerX = (sourceX + targetX) / 2;
                        const centerY = (sourceY + targetY) / 2;
                        edgePoint = { x: centerX, y: centerY };
                    }

                    const labelOffset = currentOffset || defaultOffset;
                    const labelX = edgePoint.x + labelOffset.x;
                    const labelY = edgePoint.y + labelOffset.y;

                    const mousePosition = clientToFlowPosition(
                        e.clientX,
                        e.clientY,
                        transformMatrixRef.current
                    );

                    const offsetX = labelX - mousePosition.x;
                    const offsetY = labelY - mousePosition.y;

                    dragOffsetRef.current = { x: offsetX, y: offsetY };
                    setDragging(true);
                    document.body.style.cursor = "grabbing";
                }
            };

        const createDragHandler = (
            type: "condition" | "delay" | "parameter",
            isDragging: boolean,
            setTempPosition: (pos: { x: number; y: number } | null) => void
        ) =>
            useCallback(
                throttle((e: MouseEvent) => {
                    if (!isDragging || !dragOffsetRef.current) return;

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

                        setTempPosition(snappedPosition);
                    }
                }, 16),
                [isDragging]
            );

        const createDragEndHandler = (
            type: "condition" | "delay" | "parameter",
            isDragging: boolean,
            tempPosition: { x: number; y: number } | null,
            setDragging: (dragging: boolean) => void,
            setTempPosition: (pos: { x: number; y: number } | null) => void
        ) =>
            useCallback(() => {
                if (isDragging && tempPosition) {
                    const edgeType = data?.edgeType || "straight";
                    const hasCustomControlPoints =
                        data?.controlPoints && data.controlPoints.length > 0;
                    const isSimpleMode =
                        edgeType === "straight" && !hasCustomControlPoints;

                    let position: number;
                    switch (type) {
                        case "condition":
                            position = data?.conditionPosition ?? 0.5;
                            break;
                        case "delay":
                            position = data?.delayPosition ?? 0.25;
                            break;
                        case "parameter":
                            position = data?.parameterPosition ?? 0.75;
                            break;
                    }

                    let edgePoint: { x: number; y: number };

                    if (isSimpleMode) {
                        const dx = targetX - sourceX;
                        const dy = targetY - sourceY;
                        edgePoint = {
                            x: sourceX + dx * position,
                            y: sourceY + dy * position,
                        };
                    } else {
                        const centerX = (sourceX + targetX) / 2;
                        const centerY = (sourceY + targetY) / 2;
                        edgePoint = { x: centerX, y: centerY };
                    }

                    const offset = {
                        x: tempPosition.x - edgePoint.x,
                        y: tempPosition.y - edgePoint.y,
                    };

                    const offsetKey =
                        `${type}LabelOffset` as keyof EventGraphEdgeData;

                    const command = commandController.createUpdateEdgeCommand(
                        id,
                        {
                            data: {
                                ...data,
                                [offsetKey]: offset,
                            },
                        }
                    );
                    commandController.execute(command);
                }

                setDragging(false);
                setTempPosition(null);
                dragOffsetRef.current = null;
                document.body.style.cursor = "";
            }, [
                isDragging,
                tempPosition,
                data,
                id,
                sourceX,
                sourceY,
                targetX,
                targetY,
                type,
            ]);

        const handleConditionDragStart = createDragStartHandler(
            "condition",
            setIsConditionDragging
        );
        const handleDelayDragStart = createDragStartHandler(
            "delay",
            setIsDelayDragging
        );
        const handleParamDragStart = createDragStartHandler(
            "parameter",
            setIsParamDragging
        );

        const handleConditionDrag = createDragHandler(
            "condition",
            isConditionDragging,
            setTempConditionPosition
        );
        const handleDelayDrag = createDragHandler(
            "delay",
            isDelayDragging,
            setTempDelayPosition
        );
        const handleParamDrag = createDragHandler(
            "parameter",
            isParamDragging,
            setTempParamPosition
        );

        const handleConditionDragEnd = createDragEndHandler(
            "condition",
            isConditionDragging,
            tempConditionPosition,
            setIsConditionDragging,
            setTempConditionPosition
        );
        const handleDelayDragEnd = createDragEndHandler(
            "delay",
            isDelayDragging,
            tempDelayPosition,
            setIsDelayDragging,
            setTempDelayPosition
        );
        const handleParamDragEnd = createDragEndHandler(
            "parameter",
            isParamDragging,
            tempParamPosition,
            setIsParamDragging,
            setTempParamPosition
        );

        useEffect(() => {
            if (isConditionDragging) {
                window.addEventListener("mousemove", handleConditionDrag);
                window.addEventListener("mouseup", handleConditionDragEnd);
                return () => {
                    window.removeEventListener(
                        "mousemove",
                        handleConditionDrag
                    );
                    window.removeEventListener(
                        "mouseup",
                        handleConditionDragEnd
                    );
                };
            }
        }, [isConditionDragging, handleConditionDrag, handleConditionDragEnd]);

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

        useEffect(() => {
            if (isParamDragging) {
                window.addEventListener("mousemove", handleParamDrag);
                window.addEventListener("mouseup", handleParamDragEnd);
                return () => {
                    window.removeEventListener("mousemove", handleParamDrag);
                    window.removeEventListener("mouseup", handleParamDragEnd);
                };
            }
        }, [isParamDragging, handleParamDrag, handleParamDragEnd]);

        const calculatePositions = (
            edgePath: string,
            currentControlPoints: { x: number; y: number }[],
            isSimpleMode: boolean,
            centerX: number,
            centerY: number
        ) => {
            const conditionPosition = data?.conditionPosition ?? 0.5;
            const delayPosition = data?.delayPosition ?? 0.25;
            const parameterPosition = data?.parameterPosition ?? 0.75;

            const positions = [
                conditionPosition,
                delayPosition,
                parameterPosition,
            ];

            const { pathPoints, edgePoints } = calculateEdgePositions(
                edgePath,
                sourceX,
                sourceY,
                targetX,
                targetY,
                positions,
                isSimpleMode,
                centerX,
                centerY
            );

            const [conditionData, delayData, paramData] = pathPoints;
            const [conditionEdgePoint, delayEdgePoint, paramEdgePoint] =
                edgePoints;

            return {
                conditionPoint: { x: conditionData.x, y: conditionData.y },
                delayPoint: { x: delayData.x, y: delayData.y },
                paramPoint: { x: paramData.x, y: paramData.y },
                conditionEdgePoint,
                delayEdgePoint,
                paramEdgePoint,
                conditionAngle: conditionData.angle,
                delayAngle: delayData.angle,
                paramAngle: paramData.angle,
            };
        };

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
                    labelX,
                    labelY,
                    isSimpleMode,
                    centerX,
                    centerY,
                    currentControlPoints,
                }: {
                    edgePath: string;
                    labelX: number;
                    labelY: number;
                    isSimpleMode: boolean;
                    centerX: number;
                    centerY: number;
                    currentControlPoints: { x: number; y: number }[];
                }) => {
                    const {
                        conditionPoint,
                        delayPoint,
                        paramPoint,
                        conditionEdgePoint,
                        delayEdgePoint,
                        paramEdgePoint,
                        conditionAngle,
                        delayAngle,
                        paramAngle,
                    } = calculatePositions(
                        edgePath,
                        currentControlPoints,
                        isSimpleMode,
                        centerX,
                        centerY
                    );

                    const defaultConditionOffset = { x: 0, y: -40 };
                    const defaultDelayOffset = { x: 0, y: -30 };
                    const defaultParamOffset = { x: 0, y: -50 };

                    const conditionLabelOffset =
                        isConditionDragging && tempConditionPosition
                            ? {
                                  x:
                                      tempConditionPosition.x -
                                      conditionEdgePoint.x,
                                  y:
                                      tempConditionPosition.y -
                                      conditionEdgePoint.y,
                              }
                            : data?.conditionLabelOffset ||
                              defaultConditionOffset;

                    const delayLabelOffset =
                        isDelayDragging && tempDelayPosition
                            ? {
                                  x: tempDelayPosition.x - delayEdgePoint.x,
                                  y: tempDelayPosition.y - delayEdgePoint.y,
                              }
                            : data?.delayLabelOffset || defaultDelayOffset;

                    const paramLabelOffset =
                        isParamDragging && tempParamPosition
                            ? {
                                  x: tempParamPosition.x - paramEdgePoint.x,
                                  y: tempParamPosition.y - paramEdgePoint.y,
                              }
                            : data?.parameterLabelOffset || defaultParamOffset;

                    const conditionLabelX =
                        conditionEdgePoint.x + conditionLabelOffset.x;
                    const conditionLabelY =
                        conditionEdgePoint.y + conditionLabelOffset.y;
                    const delayLabelX = delayEdgePoint.x + delayLabelOffset.x;
                    const delayLabelY = delayEdgePoint.y + delayLabelOffset.y;
                    const paramLabelX = paramEdgePoint.x + paramLabelOffset.x;
                    const paramLabelY = paramEdgePoint.y + paramLabelOffset.y;

                    const allX = [];
                    const allY = [];

                    if (hasCondition) {
                        allX.push(conditionEdgePoint.x, conditionLabelX);
                        allY.push(conditionEdgePoint.y, conditionLabelY);
                    }
                    if (hasDelay) {
                        allX.push(delayEdgePoint.x, delayLabelX);
                        allY.push(delayEdgePoint.y, delayLabelY);
                    }
                    if (hasParameter) {
                        allX.push(paramEdgePoint.x, paramLabelX);
                        allY.push(paramEdgePoint.y, paramLabelY);
                    }

                    if (allX.length === 0) {
                        allX.push(sourceX, targetX);
                        allY.push(sourceY, targetY);
                    }

                    const minX = Math.min(...allX) - 50;
                    const maxX = Math.max(...allX) + 50;
                    const minY = Math.min(...allY) - 50;
                    const maxY = Math.max(...allY) + 50;

                    const svgWidth = maxX - minX;
                    const svgHeight = maxY - minY;

                    return (
                        <EdgeLabelRenderer>
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
                                {hasCondition && (
                                    <g>
                                        <path
                                            d="M -8 0 Q -4 -6 0 0 Q 4 6 8 0"
                                            stroke={
                                                selected ? "#3b82f6" : "#6b7280"
                                            }
                                            strokeWidth="2"
                                            fill="none"
                                            transform={`translate(${
                                                conditionPoint.x - minX
                                            }, ${
                                                conditionPoint.y - minY
                                            }) rotate(${conditionAngle})`}
                                        />
                                        <line
                                            x1={conditionEdgePoint.x - minX}
                                            y1={conditionEdgePoint.y - minY}
                                            x2={conditionLabelX - minX}
                                            y2={conditionLabelY - minY}
                                            stroke={
                                                selected ? "#3b82f6" : "#6b7280"
                                            }
                                            strokeWidth="1"
                                            strokeDasharray="3,3"
                                            opacity={0.7}
                                        />
                                    </g>
                                )}

                                {hasDelay && (
                                    <g>
                                        <g
                                            transform={`translate(${
                                                delayPoint.x - minX
                                            }, ${
                                                delayPoint.y - minY
                                            }) rotate(${delayAngle})`}
                                        >
                                            <line
                                                x1={-8}
                                                y1={-2}
                                                x2={8}
                                                y2={-2}
                                                stroke={
                                                    selected
                                                        ? "#f59e0b"
                                                        : "#6b7280"
                                                }
                                                strokeWidth="2"
                                            />
                                            <line
                                                x1={-8}
                                                y1={2}
                                                x2={8}
                                                y2={2}
                                                stroke={
                                                    selected
                                                        ? "#f59e0b"
                                                        : "#6b7280"
                                                }
                                                strokeWidth="2"
                                            />
                                        </g>
                                        <line
                                            x1={delayEdgePoint.x - minX}
                                            y1={delayEdgePoint.y - minY}
                                            x2={delayLabelX - minX}
                                            y2={delayLabelY - minY}
                                            stroke={
                                                selected ? "#f59e0b" : "#6b7280"
                                            }
                                            strokeWidth="1"
                                            strokeDasharray="3,3"
                                            opacity={0.7}
                                        />
                                    </g>
                                )}

                                {hasParameter && (
                                    <line
                                        x1={paramEdgePoint.x - minX}
                                        y1={paramEdgePoint.y - minY}
                                        x2={paramLabelX - minX}
                                        y2={paramLabelY - minY}
                                        stroke={
                                            selected ? "#10b981" : "#6b7280"
                                        }
                                        strokeWidth="1"
                                        strokeDasharray="3,3"
                                        opacity={0.7}
                                    />
                                )}
                            </svg>

                            {hasCondition && (
                                <div
                                    style={{
                                        position: "absolute",
                                        transform: `translate(-50%, -50%) translate(${
                                            isConditionDragging &&
                                            tempConditionPosition
                                                ? tempConditionPosition.x
                                                : conditionLabelX
                                        }px,${
                                            isConditionDragging &&
                                            tempConditionPosition
                                                ? tempConditionPosition.y
                                                : conditionLabelY
                                        }px)`,
                                        pointerEvents: "all",
                                        zIndex: 10,
                                    }}
                                    className="nodrag nopan"
                                >
                                    <div
                                        ref={conditionLabelRef}
                                        onMouseDown={handleConditionDragStart}
                                        className={`edge-label-condition flex justify-center items-center ${
                                            selected
                                                ? "bg-blue-50 dark:bg-blue-900/50"
                                                : "bg-white/90 dark:bg-zinc-800/90"
                                        } px-2 py-1 rounded text-xs ${
                                            selected
                                                ? "shadow-md border border-blue-300 dark:border-blue-600"
                                                : "shadow border border-gray-200 dark:border-gray-700"
                                        } cursor-grab ${
                                            isConditionDragging
                                                ? "cursor-grabbing opacity-70"
                                                : ""
                                        }`}
                                        style={{
                                            boxShadow: selected
                                                ? "0 2px 4px rgba(59, 130, 246, 0.3)"
                                                : "0 1px 3px rgba(0, 0, 0, 0.1)",
                                            minWidth: "30px",
                                            backdropFilter: "blur(4px)",
                                        }}
                                    >
                                        {isConditionDragging ? (
                                            <span>
                                                {data?.condition || "True"}
                                            </span>
                                        ) : (
                                            <ReactKatex>
                                                {data?.condition || "True"}
                                            </ReactKatex>
                                        )}
                                    </div>
                                </div>
                            )}

                            {hasDelay && (
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
                                                {typeof data.delay ===
                                                    "string" &&
                                                data.delay.trim() !== ""
                                                    ? `{${data.delay}}`
                                                    : "{}"}
                                            </span>
                                        ) : (
                                            <ReactKatex>
                                                {typeof data?.delay ===
                                                    "string" &&
                                                data.delay.trim() !== ""
                                                    ? `{${data.delay}}`
                                                    : "{}"}
                                            </ReactKatex>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Parameter Label */}
                            {hasParameter && (
                                <div
                                    style={{
                                        position: "absolute",
                                        transform: `translate(-50%, -50%) translate(${
                                            isParamDragging && tempParamPosition
                                                ? tempParamPosition.x
                                                : paramLabelX
                                        }px,${
                                            isParamDragging && tempParamPosition
                                                ? tempParamPosition.y
                                                : paramLabelY
                                        }px)`,
                                        pointerEvents: "all",
                                        zIndex: 10,
                                    }}
                                    className="nodrag nopan"
                                >
                                    <div
                                        ref={paramLabelRef}
                                        onMouseDown={handleParamDragStart}
                                        className={`edge-label-param flex justify-center items-center ${
                                            selected
                                                ? "bg-green-50 dark:bg-green-900/50"
                                                : "bg-white/90 dark:bg-zinc-800/90"
                                        } px-2 py-1 rounded text-xs ${
                                            selected
                                                ? "shadow-md border border-green-300 dark:border-green-600"
                                                : "shadow border border-gray-200 dark:border-gray-700"
                                        } cursor-grab ${
                                            isParamDragging
                                                ? "cursor-grabbing opacity-70"
                                                : ""
                                        }`}
                                        style={{
                                            boxShadow: selected
                                                ? "0 2px 4px rgba(16, 185, 129, 0.3)"
                                                : "0 1px 3px rgba(0, 0, 0, 0.1)",
                                            minWidth: "20px",
                                            backdropFilter: "blur(4px)",
                                        }}
                                    >
                                        {isParamDragging ? (
                                            <span>
                                                {typeof data.parameter ===
                                                    "string" &&
                                                data.parameter.trim() !== ""
                                                    ? data.parameter
                                                    : ""}
                                            </span>
                                        ) : (
                                            <ReactKatex>
                                                {typeof data.parameter ===
                                                    "string" &&
                                                data.parameter.trim() !== ""
                                                    ? data.parameter
                                                    : ""}
                                            </ReactKatex>
                                        )}
                                    </div>
                                </div>
                            )}
                        </EdgeLabelRenderer>
                    );
                }}
            </BaseEdgeComponent>
        );
    }
) as any;

EventGraphEdge.getDefaultData = (): EventGraphEdgeData => ({
    condition: "True",
    delay: undefined,
    parameter: undefined,
    edgeType: "straight",
    controlPoints: undefined,
    conditionPosition: 0.5,
    delayPosition: 0.25,
    parameterPosition: 0.75,
    conditionLabelOffset: { x: 0, y: -40 },
    delayLabelOffset: { x: 0, y: -30 },
    parameterLabelOffset: { x: 0, y: -50 },
});

EventGraphEdge.getGraphType = (): string => "eventBased";

EventGraphEdge.displayName = "EventGraphEdge";

export default EventGraphEdge;
