"use client";

import React, {
    memo,
    useState,
    useCallback,
    MouseEvent,
    useRef,
    useEffect,
} from "react";
import { EdgeProps, EdgeLabelRenderer, BaseEdge } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { Input } from "@/components/ui/input";
import {
    getMidpoint,
    getAngleBetweenPoints,
    calculateDefaultControlPoint,
    createBezierPathString,
    getBezierPoint,
    parseTransformMatrix,
    clientToFlowPosition,
} from "@/lib/utils/math";

const commandController = CommandController.getInstance();

type EdgeTypeOption = "straight" | "bezier";

function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return function (...args: Parameters<T>) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            return func(...args);
        }
    };
}

function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function (...args: Parameters<T>) {
        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

interface InitializationEdgeData {
    parameter?: string;
    edgeType?: EdgeTypeOption;
    controlPoint?: { x: number; y: number };
}

interface ExtendedEdgeProps extends EdgeProps<InitializationEdgeData> {
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
        style = {},
        data = {} as InitializationEdgeData,
        markerEnd,
        selected,
        onClick,
    }: ExtendedEdgeProps) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editParameter, setEditParameter] = useState(
            data?.parameter || ""
        );
        const [editEdgeType, setEditEdgeType] = useState<EdgeTypeOption>(
            data?.edgeType || "straight"
        );

        const [isDragging, setIsDragging] = useState(false);
        const [tempControlPoint, setTempControlPoint] = useState<{
            x: number;
            y: number;
        } | null>(null);
        const [dragOffset, setDragOffset] = useState<{
            x: number;
            y: number;
        } | null>(null);

        const prevPositions = useRef({
            sourceX,
            sourceY,
            targetX,
            targetY,
            initialized: false,
            lastUpdateTime: 0,
        });

        const debouncedControlPointUpdate = useCallback(
            debounce(
                (
                    newSourceX: number,
                    newSourceY: number,
                    newTargetX: number,
                    newTargetY: number,
                    controlPoint: { x: number; y: number }
                ) => {
                    const sourceDeltaX =
                        newSourceX - prevPositions.current.sourceX;
                    const sourceDeltaY =
                        newSourceY - prevPositions.current.sourceY;
                    const targetDeltaX =
                        newTargetX - prevPositions.current.targetX;
                    const targetDeltaY =
                        newTargetY - prevPositions.current.targetY;

                    const tWeight = 0.5;
                    const deltaX =
                        sourceDeltaX * (1 - tWeight) + targetDeltaX * tWeight;
                    const deltaY =
                        sourceDeltaY * (1 - tWeight) + targetDeltaY * tWeight;

                    const newControlPoint = {
                        x: controlPoint.x + deltaX,
                        y: controlPoint.y + deltaY,
                    };

                    const command = commandController.createUpdateEdgeCommand(
                        id,
                        {
                            data: {
                                ...data,
                                controlPoint: newControlPoint,
                            },
                        }
                    );
                    commandController.execute(command);

                    prevPositions.current = {
                        sourceX: newSourceX,
                        sourceY: newSourceY,
                        targetX: newTargetX,
                        targetY: newTargetY,
                        initialized: true,
                        lastUpdateTime: Date.now(),
                    };
                },
                50
            ),
            [id, data]
        );

        useEffect(() => {
            if (isDragging || isEditing) {
                return;
            }

            if (data?.edgeType === "bezier" && data?.controlPoint) {
                if (!prevPositions.current.initialized) {
                    prevPositions.current = {
                        sourceX,
                        sourceY,
                        targetX,
                        targetY,
                        initialized: true,
                        lastUpdateTime: Date.now(),
                    };
                    return;
                }

                if (
                    prevPositions.current.sourceX === sourceX &&
                    prevPositions.current.sourceY === sourceY &&
                    prevPositions.current.targetX === targetX &&
                    prevPositions.current.targetY === targetY
                ) {
                    return;
                }

                debouncedControlPointUpdate(
                    sourceX,
                    sourceY,
                    targetX,
                    targetY,
                    data.controlPoint
                );
            }
        }, [
            sourceX,
            sourceY,
            targetX,
            targetY,
            isDragging,
            isEditing,
            data?.edgeType,
            data?.controlPoint,
            debouncedControlPointUpdate,
        ]);

        const edgeStyle = {
            strokeWidth: selected ? 3 : 2,
            stroke: selected ? "#3b82f6" : "#555",
            ...style,
        };

        let path: string;
        let labelX: number, labelY: number;

        if (data?.edgeType === "bezier") {
            const controlPoint =
                isDragging && tempControlPoint
                    ? tempControlPoint
                    : data?.controlPoint ||
                      calculateDefaultControlPoint(
                          sourceX,
                          sourceY,
                          targetX,
                          targetY
                      );

            path = createBezierPathString(
                sourceX,
                sourceY,
                controlPoint.x,
                controlPoint.y,
                targetX,
                targetY
            );

            labelX = controlPoint.x;
            labelY = controlPoint.y;
        } else {
            path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;

            const midPoint = getMidpoint(sourceX, sourceY, targetX, targetY);
            labelX = midPoint.x;
            labelY = midPoint.y;
        }

        const handleDoubleClick = useCallback(() => {
            setIsEditing(true);
            setEditParameter(data?.parameter || "");
            setEditEdgeType(data?.edgeType || "straight");
        }, [data]);

        const handleContainerBlur = useCallback(
            (event: React.FocusEvent<HTMLDivElement>) => {
                const currentTarget = event.currentTarget;
                const relatedTarget = event.relatedTarget as HTMLElement | null;

                if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
                    setIsEditing(false);

                    const updatedData: InitializationEdgeData = {
                        edgeType: editEdgeType,
                        controlPoint: data?.controlPoint,
                    };

                    const trimmedParameter = editParameter.trim();
                    if (trimmedParameter !== "") {
                        updatedData.parameter = trimmedParameter;
                    }

                    const currentParameter = data?.parameter || "";
                    const currentEdgeType = data?.edgeType || "straight";
                    const currentControlPoint = data?.controlPoint;

                    const hasChanged =
                        updatedData.parameter !== currentParameter ||
                        updatedData.edgeType !== currentEdgeType ||
                        JSON.stringify(updatedData.controlPoint) !==
                            JSON.stringify(currentControlPoint);

                    if (hasChanged) {
                        const command =
                            commandController.createUpdateEdgeCommand(id, {
                                data: updatedData,
                            });
                        commandController.execute(command);
                    }
                }
            },
            [id, data, editParameter, editEdgeType]
        );

        const handleDragStart = (e: MouseEvent) => {
            if (isEditing || data?.edgeType !== "bezier") return;

            e.stopPropagation();

            const flowPane = document.querySelector(".react-flow__viewport");

            if (flowPane) {
                const transformStyle =
                    window.getComputedStyle(flowPane).transform;
                const transformMatrix = parseTransformMatrix(transformStyle);

                const currentControlPoint =
                    data?.controlPoint ||
                    calculateDefaultControlPoint(
                        sourceX,
                        sourceY,
                        targetX,
                        targetY
                    );

                const mousePosition = clientToFlowPosition(
                    e.clientX,
                    e.clientY,
                    transformMatrix
                );

                const offsetX = currentControlPoint.x - mousePosition.x;
                const offsetY = currentControlPoint.y - mousePosition.y;

                setDragOffset({ x: offsetX, y: offsetY });
                setTempControlPoint(currentControlPoint);
                setIsDragging(true);

                document.body.style.cursor = "grabbing";
            }
        };

        const handleDrag = useCallback(
            throttle((e: MouseEvent) => {
                if (
                    !isDragging ||
                    isEditing ||
                    data?.edgeType !== "bezier" ||
                    !tempControlPoint ||
                    !dragOffset
                )
                    return;

                e.preventDefault();
                e.stopPropagation();

                const flowPane = document.querySelector(
                    ".react-flow__viewport"
                );

                if (flowPane) {
                    const transformStyle =
                        window.getComputedStyle(flowPane).transform;
                    const transformMatrix =
                        parseTransformMatrix(transformStyle);

                    const mousePosition = clientToFlowPosition(
                        e.clientX,
                        e.clientY,
                        transformMatrix
                    );

                    const x = mousePosition.x + dragOffset.x;
                    const y = mousePosition.y + dragOffset.y;

                    setTempControlPoint({ x, y });
                }
            }, 16),
            [isDragging, isEditing, data, tempControlPoint, dragOffset]
        );

        const handleDragEnd = useCallback(() => {
            if (isDragging && tempControlPoint) {
                const currentControlPoint = data?.controlPoint;
                const hasChanged =
                    !currentControlPoint ||
                    currentControlPoint.x !== tempControlPoint.x ||
                    currentControlPoint.y !== tempControlPoint.y;

                if (hasChanged) {
                    const command = commandController.createUpdateEdgeCommand(
                        id,
                        {
                            data: {
                                ...data,
                                controlPoint: tempControlPoint,
                            },
                        }
                    );
                    commandController.execute(command);
                }
            }

            setIsDragging(false);
            setTempControlPoint(null);
            setDragOffset(null);
            document.body.style.cursor = "";
        }, [isDragging, tempControlPoint, data, id]);

        useEffect(() => {
            if (isDragging) {
                window.addEventListener("mousemove", handleDrag as any);
                window.addEventListener("mouseup", handleDragEnd);

                return () => {
                    window.removeEventListener("mousemove", handleDrag as any);
                    window.removeEventListener("mouseup", handleDragEnd);
                };
            }
        }, [isDragging, handleDrag, handleDragEnd]);

        return (
            <>
                {/* Selected Outline */}
                {selected && (
                    <path
                        d={path}
                        style={{
                            stroke: "#93c5fd",
                            strokeWidth: 6,
                            strokeOpacity: 0.5,
                            fill: "none",
                        }}
                    />
                )}

                {/* Edge path */}
                <g style={{ cursor: "pointer" }}>
                    <path
                        id={id}
                        className="react-flow__edge-path"
                        d={path}
                        style={edgeStyle}
                        markerEnd={markerEnd}
                        onClick={onClick}
                    />
                </g>

                <EdgeLabelRenderer>
                    {/* Box Marker with Parameter */}
                    <div
                        style={{
                            position: "absolute",
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: "all",
                        }}
                        className="nodrag nopan"
                        onMouseDown={
                            isEditing ? (e) => e.stopPropagation() : undefined
                        }
                    >
                        <div
                            onDoubleClick={
                                !isEditing ? handleDoubleClick : undefined
                            }
                            onMouseDown={
                                !isEditing && data?.edgeType === "bezier"
                                    ? handleDragStart
                                    : isEditing
                                    ? (e) => e.stopPropagation()
                                    : undefined
                            }
                            onClick={
                                isEditing
                                    ? (e) => e.stopPropagation()
                                    : undefined
                            }
                            onBlur={isEditing ? handleContainerBlur : undefined}
                            tabIndex={-1}
                            className={`init-edge-label flex flex-col items-center justify-center ${
                                selected
                                    ? "bg-blue-50 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600"
                                    : "bg-white/90 dark:bg-zinc-800/90 border-gray-300 dark:border-gray-600"
                            } p-1 rounded-none border-2 text-xs shadow ${
                                isEditing
                                    ? "min-w-[180px]"
                                    : "min-w-[20px] min-h-[20px]"
                            } ${
                                data?.edgeType === "bezier" && !isEditing
                                    ? "draggable-bezier"
                                    : ""
                            } ${isDragging ? "opacity-70" : ""}`}
                            style={{
                                cursor:
                                    data?.edgeType === "bezier" && !isEditing
                                        ? isDragging
                                            ? "grabbing"
                                            : "grab"
                                        : "default",
                            }}
                        >
                            {isEditing ? (
                                <div className="flex flex-col space-y-1 p-1 w-full">
                                    <Input
                                        type="text"
                                        value={editParameter}
                                        onChange={(e) =>
                                            setEditParameter(e.target.value)
                                        }
                                        className="nodrag text-xs h-6 dark:bg-zinc-700"
                                        placeholder="Parameter"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            ) : (
                                <div className="parameter-box">
                                    <MathJax>
                                        {typeof data?.parameter === "string" &&
                                        data.parameter.trim() !== ""
                                            ? data.parameter
                                            : "1"}
                                    </MathJax>
                                </div>
                            )}
                        </div>
                    </div>
                </EdgeLabelRenderer>
            </>
        );
    }
) as InitializationEdgeComponent;

InitializationEdge.getDefaultData = (): InitializationEdgeData => ({
    parameter: "1",
    edgeType: "straight",
});

InitializationEdge.getGraphType = (): string => "eventBased";

InitializationEdge.displayName = "InitializationEdge";

export default InitializationEdge;
