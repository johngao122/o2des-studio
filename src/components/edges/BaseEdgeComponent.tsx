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
    Position,
} from "reactflow";
import { CommandController } from "@/controllers/CommandController";
import {
    parseTransformMatrix,
    clientToFlowPosition,
    throttle,
    snapToGrid,
} from "@/lib/utils/math";
import {
    calculateDefaultControlPoints,
    simplifyControlPoints,
    createRoundedPath,
} from "@/lib/utils/edge";

const commandController = CommandController.getInstance();

export type EdgeTypeOption = "straight" | "bezier" | "rounded";

export interface BaseEdgeData {
    edgeType?: EdgeTypeOption;
    controlPoints?: { x: number; y: number }[];
    isDependency?: boolean;
}

export interface BaseEdgeProps<T extends BaseEdgeData = BaseEdgeData>
    extends EdgeProps<T> {
    onClick?: () => void;
    children?: (props: {
        edgePath: string;
        labelX: number;
        labelY: number;
        isSimpleMode: boolean;
        centerX: number;
        centerY: number;
        currentControlPoints: { x: number; y: number }[];
        selected: boolean;
    }) => React.ReactNode;
}

export const BaseEdgeComponent = memo(
    <T extends BaseEdgeData = BaseEdgeData>({
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        style = {},
        data = {} as T,
        markerEnd,
        selected,
        onClick,
        children,
    }: BaseEdgeProps<T>) => {
        const [isDragging, setIsDragging] = useState<number | null>(null);
        const [isCenterDragging, setIsCenterDragging] = useState(false);
        const [tempControlPoints, setTempControlPoints] = useState<
            {
                x: number;
                y: number;
            }[]
        >([]);
        const [tempCenterPosition, setTempCenterPosition] = useState<{
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
            strokeDasharray: data?.isDependency ? "5,5" : "none",
            ...style,
        };

        const edgeType = data?.edgeType || "straight";

        const hasCustomControlPoints =
            data?.controlPoints && data.controlPoints.length > 0;
        const isSimpleMode = edgeType === "straight" && !hasCustomControlPoints;

        const defaultControlPoints = calculateDefaultControlPoints(
            sourceX,
            sourceY,
            targetX,
            targetY
        );

        const centerX = (sourceX + targetX) / 2;
        const centerY = (sourceY + targetY) / 2;

        const currentControlPoints = data?.controlPoints || [];

        useEffect(() => {
            if (!hasCustomControlPoints && id) {
                const defaultControlPointsArray = [
                    defaultControlPoints.cp1,
                    defaultControlPoints.cp2,
                    defaultControlPoints.cp3,
                ];

                const command = commandController.createUpdateEdgeCommand(id, {
                    data: {
                        ...data,
                        controlPoints: defaultControlPointsArray,
                    },
                });
                commandController.execute(command);
            }
        }, [hasCustomControlPoints, id, defaultControlPoints, data]);

        const getControlPoint = (index: number) => {
            if (isDragging === index + 1 && tempControlPoints[index]) {
                return tempControlPoints[index];
            }

            if (isCenterDragging && tempCenterPosition && index === 1) {
                return tempCenterPosition;
            }

            if (currentControlPoints[index]) {
                return currentControlPoints[index];
            }

            if (index === 0) return defaultControlPoints.cp1;
            if (index === 1) return defaultControlPoints.cp2;
            if (index === 2) return defaultControlPoints.cp3;
            return { x: centerX, y: centerY };
        };

        const controlPoint1 = getControlPoint(0);
        const controlPoint2 = getControlPoint(1);
        const controlPoint3 = getControlPoint(2);

        let edgePath: string;
        let labelX: number, labelY: number;

        labelX = controlPoint2.x;
        labelY = controlPoint2.y;

        switch (edgeType) {
            case "bezier":
                const controlPoints =
                    isDragging !== null && tempControlPoints.length > 0
                        ? tempControlPoints
                        : data?.controlPoints && data.controlPoints.length > 0
                        ? data.controlPoints
                        : [controlPoint1, controlPoint2, controlPoint3];
                const bezierSegments = [];

                const [segment1] = getBezierPath({
                    sourceX,
                    sourceY,
                    sourcePosition: Position.Right,
                    targetX: controlPoints[0]?.x || controlPoint1.x,
                    targetY: controlPoints[0]?.y || controlPoint1.y,
                    targetPosition: Position.Left,
                });
                bezierSegments.push(segment1);

                for (let i = 0; i < controlPoints.length - 1; i++) {
                    const [segment] = getBezierPath({
                        sourceX: controlPoints[i].x,
                        sourceY: controlPoints[i].y,
                        sourcePosition: Position.Right,
                        targetX: controlPoints[i + 1].x,
                        targetY: controlPoints[i + 1].y,
                        targetPosition: Position.Left,
                    });
                    bezierSegments.push(segment.replace("M", "L"));
                }

                const lastControlPoint =
                    controlPoints[controlPoints.length - 1];
                const [segment4] = getBezierPath({
                    sourceX: lastControlPoint.x,
                    sourceY: lastControlPoint.y,
                    sourcePosition: Position.Right,
                    targetX,
                    targetY,
                    targetPosition: Position.Left,
                });
                bezierSegments.push(segment4.replace("M", "L"));

                edgePath = bezierSegments.join(" ");
                break;

            case "rounded":
                const roundedControlPoints =
                    isDragging !== null && tempControlPoints.length > 0
                        ? tempControlPoints
                        : data?.controlPoints && data.controlPoints.length > 0
                        ? data.controlPoints
                        : [controlPoint1, controlPoint2, controlPoint3];

                if (isSimpleMode && !isCenterDragging) {
                    const [simplePath] = getStraightPath({
                        sourceX,
                        sourceY,
                        targetX,
                        targetY,
                    });
                    edgePath = simplePath;
                } else {
                    edgePath = createRoundedPath(
                        sourceX,
                        sourceY,
                        targetX,
                        targetY,
                        roundedControlPoints
                    );
                }
                break;

            case "straight":
            default:
                if (isSimpleMode && !isCenterDragging) {
                    const [simplePath] = getStraightPath({
                        sourceX,
                        sourceY,
                        targetX,
                        targetY,
                    });
                    edgePath = simplePath;
                } else {
                    const controlPoints =
                        isDragging !== null && tempControlPoints.length > 0
                            ? tempControlPoints
                            : data?.controlPoints || [
                                  controlPoint1,
                                  controlPoint2,
                                  controlPoint3,
                              ];
                    const pathSegments = [];

                    const [firstSegment] = getStraightPath({
                        sourceX,
                        sourceY,
                        targetX: controlPoints[0]?.x || controlPoint1.x,
                        targetY: controlPoints[0]?.y || controlPoint1.y,
                    });
                    pathSegments.push(firstSegment);

                    for (let i = 0; i < controlPoints.length - 1; i++) {
                        const [segment] = getStraightPath({
                            sourceX: controlPoints[i].x,
                            sourceY: controlPoints[i].y,
                            targetX: controlPoints[i + 1].x,
                            targetY: controlPoints[i + 1].y,
                        });
                        pathSegments.push(segment.replace("M", "L"));
                    }

                    const lastControlPoint =
                        controlPoints[controlPoints.length - 1];
                    const [lastSegment] = getStraightPath({
                        sourceX: lastControlPoint.x,
                        sourceY: lastControlPoint.y,
                        targetX,
                        targetY,
                    });
                    pathSegments.push(lastSegment.replace("M", "L"));

                    edgePath = pathSegments.join(" ");
                }
                break;
        }

        const handleCenterDragStart = (e: MouseEvent) => {
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

                const offsetX = centerX - mousePosition.x;
                const offsetY = centerY - mousePosition.y;

                dragOffsetRef.current = { x: offsetX, y: offsetY };
                setIsCenterDragging(true);
                document.body.style.cursor = "grabbing";
            }
        };

        const handleCenterDrag = useCallback(
            throttle((e: MouseEvent) => {
                if (!isCenterDragging || !dragOffsetRef.current) return;

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

                    setTempCenterPosition(snappedPosition);
                }
            }, 16),
            [isCenterDragging]
        );

        const handleCenterDragEnd = useCallback(() => {
            if (isCenterDragging && tempCenterPosition) {
                const draggedPoint = tempCenterPosition;

                const cp1 = {
                    x: sourceX + (draggedPoint.x - sourceX) * 0.33,
                    y: sourceY + (draggedPoint.y - sourceY) * 0.33,
                };

                const cp3 = {
                    x: draggedPoint.x + (targetX - draggedPoint.x) * 0.33,
                    y: draggedPoint.y + (targetY - draggedPoint.y) * 0.33,
                };

                const initialControlPoints = [cp1, draggedPoint, cp3];
                const simplifiedControlPoints = simplifyControlPoints(
                    initialControlPoints,
                    sourceX,
                    sourceY,
                    targetX,
                    targetY
                );

                const updatedData = {
                    ...data,
                    controlPoints: simplifiedControlPoints,
                };

                const command = commandController.createUpdateEdgeCommand(id, {
                    data: updatedData,
                });
                commandController.execute(command);
            }

            setIsCenterDragging(false);
            setTempCenterPosition(null);
            dragOffsetRef.current = null;
            document.body.style.cursor = "";
        }, [
            isCenterDragging,
            tempCenterPosition,
            data,
            id,
            sourceX,
            sourceY,
            targetX,
            targetY,
        ]);

        const handleDragStart =
            (controlPointIndex: number) => (e: MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();

                setTempControlPoints([]);

                flowPaneRef.current = document.querySelector(
                    ".react-flow__viewport"
                );

                if (flowPaneRef.current) {
                    const transformStyle = window.getComputedStyle(
                        flowPaneRef.current
                    ).transform;
                    transformMatrixRef.current =
                        parseTransformMatrix(transformStyle);

                    const currentControlPoints = data?.controlPoints || [];
                    const currentControlPoint = currentControlPoints[
                        controlPointIndex - 1
                    ] || { x: centerX, y: centerY };

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

                    setTempControlPoints((prev) => {
                        const currentControlPoints = data?.controlPoints || [];
                        const newControlPoints = [...currentControlPoints];

                        while (newControlPoints.length < isDragging) {
                            newControlPoints.push({ x: centerX, y: centerY });
                        }

                        newControlPoints[isDragging - 1] = snappedPosition;

                        return newControlPoints;
                    });
                }
            }, 16),
            [isDragging, data?.controlPoints, centerX, centerY]
        );

        const handleDragEnd = useCallback(() => {
            if (isDragging !== null && tempControlPoints[isDragging - 1]) {
                let currentControlPoints = data?.controlPoints || [];

                while (currentControlPoints.length < isDragging) {
                    currentControlPoints.push({ x: centerX, y: centerY });
                }

                const draggedPoint = tempControlPoints[isDragging - 1];

                if (currentControlPoints.length >= 2) {
                    const segmentStart =
                        isDragging === 1
                            ? { x: sourceX, y: sourceY }
                            : currentControlPoints[isDragging - 2];
                    const segmentEnd =
                        isDragging === currentControlPoints.length
                            ? { x: targetX, y: targetY }
                            : currentControlPoints[isDragging];

                    if (segmentStart && segmentEnd) {
                        const lineLength = Math.sqrt(
                            Math.pow(segmentEnd.x - segmentStart.x, 2) +
                                Math.pow(segmentEnd.y - segmentStart.y, 2)
                        );

                        if (lineLength > 0) {
                            const t = Math.max(
                                0,
                                Math.min(
                                    1,
                                    ((draggedPoint.x - segmentStart.x) *
                                        (segmentEnd.x - segmentStart.x) +
                                        (draggedPoint.y - segmentStart.y) *
                                            (segmentEnd.y - segmentStart.y)) /
                                        (lineLength * lineLength)
                                )
                            );

                            const closestPoint = {
                                x:
                                    segmentStart.x +
                                    t * (segmentEnd.x - segmentStart.x),
                                y:
                                    segmentStart.y +
                                    t * (segmentEnd.y - segmentStart.y),
                            };

                            const distanceFromLine = Math.sqrt(
                                Math.pow(draggedPoint.x - closestPoint.x, 2) +
                                    Math.pow(draggedPoint.y - closestPoint.y, 2)
                            );

                            if (distanceFromLine > 40) {
                                const segmentLength = Math.sqrt(
                                    Math.pow(segmentEnd.x - segmentStart.x, 2) +
                                        Math.pow(
                                            segmentEnd.y - segmentStart.y,
                                            2
                                        )
                                );

                                if (segmentLength > 100) {
                                    const beforePoint = {
                                        x:
                                            segmentStart.x +
                                            (draggedPoint.x - segmentStart.x) *
                                                0.33,
                                        y:
                                            segmentStart.y +
                                            (draggedPoint.y - segmentStart.y) *
                                                0.33,
                                    };
                                    const afterPoint = {
                                        x:
                                            draggedPoint.x +
                                            (segmentEnd.x - draggedPoint.x) *
                                                0.33,
                                        y:
                                            draggedPoint.y +
                                            (segmentEnd.y - draggedPoint.y) *
                                                0.33,
                                    };

                                    const newControlPoints = [
                                        ...currentControlPoints,
                                    ];
                                    newControlPoints.splice(
                                        isDragging - 1,
                                        1,
                                        beforePoint,
                                        draggedPoint,
                                        afterPoint
                                    );
                                    currentControlPoints = newControlPoints;
                                } else {
                                    const newControlPoints = [
                                        ...currentControlPoints,
                                    ];
                                    newControlPoints[isDragging - 1] =
                                        draggedPoint;
                                    currentControlPoints = newControlPoints;
                                }
                            } else {
                                const newControlPoints = [
                                    ...currentControlPoints,
                                ];
                                newControlPoints[isDragging - 1] = draggedPoint;
                                currentControlPoints = newControlPoints;
                            }
                        } else {
                            const newControlPoints = [...currentControlPoints];
                            newControlPoints[isDragging - 1] = draggedPoint;
                            currentControlPoints = newControlPoints;
                        }
                    } else {
                        const newControlPoints = [...currentControlPoints];
                        newControlPoints[isDragging - 1] = draggedPoint;
                        currentControlPoints = newControlPoints;
                    }
                } else {
                    const newControlPoints = [...currentControlPoints];
                    newControlPoints[isDragging - 1] = draggedPoint;
                    currentControlPoints = newControlPoints;
                }

                currentControlPoints = simplifyControlPoints(
                    currentControlPoints,
                    sourceX,
                    sourceY,
                    targetX,
                    targetY
                );

                const updatedData = {
                    ...data,
                    controlPoints: currentControlPoints,
                };

                const command = commandController.createUpdateEdgeCommand(id, {
                    data: updatedData,
                });
                commandController.execute(command);
            }

            setIsDragging(null);
            setTempControlPoints([]);
            dragOffsetRef.current = null;
            document.body.style.cursor = "";
        }, [
            isDragging,
            tempControlPoints,
            data,
            id,
            centerX,
            centerY,
            sourceX,
            sourceY,
            targetX,
            targetY,
        ]);

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
            if (isCenterDragging) {
                window.addEventListener("mousemove", handleCenterDrag as any);
                window.addEventListener("mouseup", handleCenterDragEnd);

                return () => {
                    window.removeEventListener(
                        "mousemove",
                        handleCenterDrag as any
                    );
                    window.removeEventListener("mouseup", handleCenterDragEnd);
                };
            }
        }, [isCenterDragging, handleCenterDrag, handleCenterDragEnd]);

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
                            strokeDasharray: data?.isDependency
                                ? "5,5"
                                : "none",
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
                        {isSimpleMode ? (
                            <div
                                style={{
                                    position: "absolute",
                                    transform: `translate(-50%, -50%) translate(${
                                        isCenterDragging && tempCenterPosition
                                            ? tempCenterPosition.x
                                            : centerX
                                    }px,${
                                        isCenterDragging && tempCenterPosition
                                            ? tempCenterPosition.y
                                            : centerY
                                    }px)`,
                                    pointerEvents: "all",
                                    cursor: isCenterDragging
                                        ? "grabbing"
                                        : "grab",
                                }}
                                className="nodrag nopan"
                                onMouseDown={handleCenterDragStart}
                            >
                                <div
                                    className={`w-3 h-3 rounded-full border-2 ${
                                        isCenterDragging
                                            ? "bg-blue-500 border-blue-600"
                                            : "bg-white border-blue-500"
                                    } shadow-md hover:scale-110 transition-transform`}
                                />
                            </div>
                        ) : (
                            <>
                                {(data?.controlPoints || []).map(
                                    (controlPoint, index) => {
                                        const actualControlPoint =
                                            isDragging === index + 1 &&
                                            tempControlPoints.length > index &&
                                            tempControlPoints[index]
                                                ? tempControlPoints[index]
                                                : controlPoint;

                                        return (
                                            <div
                                                key={`control-point-${index}`}
                                                style={{
                                                    position: "absolute",
                                                    transform: `translate(-50%, -50%) translate(${actualControlPoint.x}px,${actualControlPoint.y}px)`,
                                                    pointerEvents: "all",
                                                    cursor:
                                                        isDragging === index + 1
                                                            ? "grabbing"
                                                            : "grab",
                                                }}
                                                className="nodrag nopan"
                                                onMouseDown={handleDragStart(
                                                    index + 1
                                                )}
                                            >
                                                <div
                                                    className={`w-3 h-3 rounded-full border-2 ${
                                                        isDragging === index + 1
                                                            ? "bg-blue-500 border-blue-600"
                                                            : "bg-white border-blue-500"
                                                    } shadow-md hover:scale-110 transition-transform`}
                                                />
                                            </div>
                                        );
                                    }
                                )}
                            </>
                        )}
                    </EdgeLabelRenderer>
                )}

                {/* Children prop */}
                {children &&
                    children({
                        edgePath,
                        labelX,
                        labelY,
                        isSimpleMode,
                        centerX,
                        centerY,
                        currentControlPoints,
                        selected: selected || false,
                    })}
            </>
        );
    }
) as any;

export const getDefaultBaseEdgeData = (): BaseEdgeData => ({
    edgeType: "straight",
    isDependency: false,
    controlPoints: undefined,
});

BaseEdgeComponent.displayName = "BaseEdgeComponent";

export default BaseEdgeComponent;
