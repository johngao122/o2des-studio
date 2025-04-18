"use client";

import React, { memo, useState, useCallback } from "react";
import {
    EdgeProps,
    getSmoothStepPath,
    EdgeLabelRenderer,
    getStraightPath,
} from "reactflow";
import { BaseEdge } from "@/types/base";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { Input } from "@/components/ui/input";

const commandController = CommandController.getInstance();

interface EventGraphEdgeData {
    condition?: string;
    delay?: string;
    parameter?: string;
}

interface ExtendedEdgeProps extends EdgeProps<EventGraphEdgeData> {
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
        const [isEditing, setIsEditing] = useState(false);
        const [editCondition, setEditCondition] = useState(
            data?.condition || "True"
        );
        const [editDelay, setEditDelay] = useState(data?.delay || "");
        const [editParameter, setEditParameter] = useState(
            data?.parameter || ""
        );

        const [hasCondition, setHasCondition] = useState(!!data?.condition);
        const [hasDelay, setHasDelay] = useState(
            !!data?.delay && data.delay.trim() !== ""
        );
        const [hasParameter, setHasParameter] = useState(
            !!data?.parameter && data.parameter.trim() !== ""
        );

        const edgeStyle = {
            strokeWidth: selected ? 3 : 2,
            stroke: selected ? "#3b82f6" : "#555",
            ...style,
        };

        const markerX = sourceX * 0.75 + targetX * 0.25;
        const markerY = sourceY * 0.75 + targetY * 0.25;

        const [path1] = getStraightPath({
            sourceX,
            sourceY,
            targetX: markerX,
            targetY: markerY,
        });
        const [path2] = getStraightPath({
            sourceX: markerX,
            sourceY: markerY,
            targetX,
            targetY,
        });

        const combinedPath = `${path1} ${path2.substring(1)}`;

        const labelX = (sourceX + targetX) / 2;
        const mainLabelY = (sourceY + targetY) / 2 - 25;
        const delayLabelY = (sourceY + targetY) / 2 + 25;

        const handleDoubleClick = useCallback(() => {
            setIsEditing(true);
            setEditCondition(data?.condition || "True");
            setEditDelay(data?.delay || "");
            setEditParameter(data?.parameter || "");
        }, [data]);

        const handleContainerBlur = useCallback(
            (event: React.FocusEvent<HTMLDivElement>) => {
                const currentTarget = event.currentTarget;
                const relatedTarget = event.relatedTarget as HTMLElement | null;

                if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
                    setIsEditing(false);

                    const updatedData: EventGraphEdgeData = {
                        condition: editCondition || "True",
                    };

                    const trimmedDelay = editDelay.trim();
                    const hasDelayValue = trimmedDelay !== "";
                    if (hasDelayValue) {
                        updatedData.delay = trimmedDelay;
                    }

                    const trimmedParameter = editParameter.trim();
                    const hasParameterValue = trimmedParameter !== "";
                    if (hasParameterValue) {
                        updatedData.parameter = trimmedParameter;
                    }

                    setHasCondition(true);
                    setHasDelay(hasDelayValue);
                    setHasParameter(hasParameterValue);

                    const currentCondition = data?.condition || "True";
                    const currentDelay = data?.delay || "";
                    const currentParameter = data?.parameter || "";

                    const hasChanged =
                        updatedData.condition !== currentCondition ||
                        (updatedData.delay || "") !== currentDelay ||
                        (updatedData.parameter || "") !== currentParameter;

                    if (hasChanged) {
                        const command =
                            commandController.createUpdateEdgeCommand(id, {
                                data: updatedData,
                            });
                        commandController.execute(command);
                    }
                }
            },
            [id, data, editCondition, editDelay, editParameter]
        );

        const showConditionMarker =
            !isEditing &&
            hasCondition &&
            data?.condition &&
            data.condition !== "True";
        const showDelayMarker = !isEditing && hasDelay;

        const dxAngle = markerX - sourceX;
        const dyAngle = markerY - sourceY;
        const angleRadians = Math.atan2(dyAngle, dxAngle);
        const angleDegrees = angleRadians * (180 / Math.PI);

        let conditionMarkerPosX = markerX;
        let conditionMarkerPosY = markerY;
        let delayMarkerPosX = markerX;
        let delayMarkerPosY = markerY;

        if (showConditionMarker && showDelayMarker) {
            const offsetDistance = 8;
            const length =
                Math.sqrt(dxAngle * dxAngle + dyAngle * dyAngle) || 1;
            const unitX = dxAngle / length;
            const unitY = dyAngle / length;

            conditionMarkerPosX -= unitX * offsetDistance;
            conditionMarkerPosY -= unitY * offsetDistance;
            delayMarkerPosX += unitX * offsetDistance;
            delayMarkerPosY += unitY * offsetDistance;
        }

        const paramLabelBaseX = sourceX * 0.15 + targetX * 0.85;
        const paramLabelBaseY = sourceY * 0.15 + targetY * 0.85;
        const paramLabelX = paramLabelBaseX;
        const paramLabelY = paramLabelBaseY;

        return (
            <>
                {/* Selected Outline - Render two paths */}
                {selected && (
                    <>
                        <path
                            d={path1}
                            style={{
                                stroke: "#93c5fd",
                                strokeWidth: 6,
                                strokeOpacity: 0.5,
                                fill: "none",
                            }}
                        />
                        <path
                            d={path2}
                            style={{
                                stroke: "#93c5fd",
                                strokeWidth: 6,
                                strokeOpacity: 0.5,
                                fill: "none",
                            }}
                        />
                    </>
                )}

                {/* Edge paths */}
                <g style={{ cursor: "pointer" }}>
                    <path
                        id={`${id}-p1`}
                        className="react-flow__edge-path"
                        d={path1}
                        style={edgeStyle}
                        onClick={onClick}
                    />
                    <path
                        id={`${id}-p2`}
                        className="react-flow__edge-path"
                        d={path2}
                        style={edgeStyle}
                        markerEnd={markerEnd}
                        onClick={onClick}
                    />
                </g>

                <EdgeLabelRenderer>
                    {/* Main Label (Condition & Parameter) */}
                    <div
                        style={{
                            position: "absolute",
                            transform: `translate(-50%, -50%) translate(${labelX}px,${mainLabelY}px)`,
                            pointerEvents: "all",
                        }}
                        className="nodrag nopan"
                    >
                        <div
                            onDoubleClick={
                                !isEditing ? handleDoubleClick : undefined
                            }
                            onBlur={isEditing ? handleContainerBlur : undefined}
                            tabIndex={-1}
                            className={`edge-label flex flex-col items-center ${
                                selected
                                    ? "bg-blue-50 dark:bg-blue-900/50"
                                    : "bg-white/70 dark:bg-zinc-800/70"
                            } p-1 rounded text-xs ${
                                selected
                                    ? "shadow-md border border-blue-300 dark:border-blue-600"
                                    : "shadow"
                            } ${isEditing ? "h-full" : ""}`}
                            style={{
                                minWidth: isEditing ? "180px" : "auto",
                                minHeight: isEditing ? "100px" : "auto",
                            }}
                        >
                            {isEditing ? (
                                <div className="flex flex-col space-y-1 p-1 w-full">
                                    <Input
                                        type="text"
                                        value={editCondition}
                                        onChange={(e) =>
                                            setEditCondition(e.target.value)
                                        }
                                        className="nodrag text-xs h-6 dark:bg-zinc-700"
                                        placeholder="Condition (e.g., True)"
                                        autoFocus
                                    />
                                    <Input
                                        type="text"
                                        value={editDelay}
                                        onChange={(e) =>
                                            setEditDelay(e.target.value)
                                        }
                                        className="nodrag text-xs h-6 dark:bg-zinc-700"
                                        placeholder="Delay (optional)"
                                    />
                                    <Input
                                        type="text"
                                        value={editParameter}
                                        onChange={(e) =>
                                            setEditParameter(e.target.value)
                                        }
                                        className="nodrag text-xs h-6 dark:bg-zinc-700"
                                        placeholder="Parameter (optional)"
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* Condition */}
                                    <div className="condition">
                                        <MathJax>
                                            {typeof data?.condition === "string"
                                                ? data.condition
                                                : "True"}
                                        </MathJax>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Delay Label (Below) */}
                    {!isEditing && hasDelay && (
                        <div
                            style={{
                                position: "absolute",
                                transform: `translate(-50%, -50%) translate(${labelX}px,${delayLabelY}px)`,
                                pointerEvents: "all",
                            }}
                            className="nodrag nopan"
                        >
                            <div
                                className={`edge-label-delay flex justify-center items-center ${
                                    selected
                                        ? "bg-blue-50 dark:bg-blue-900/50"
                                        : "bg-white/70 dark:bg-zinc-800/70"
                                } p-1 rounded text-xs ${
                                    selected
                                        ? "shadow-md border border-blue-300 dark:border-blue-600"
                                        : "shadow"
                                }`}
                            >
                                <MathJax>
                                    {typeof data?.delay === "string"
                                        ? `{${data.delay}}`
                                        : "{}"}
                                </MathJax>
                            </div>
                        </div>
                    )}

                    {/* Conditional Squiggle Marker (Condition) */}
                    {showConditionMarker && (
                        <div
                            style={{
                                position: "absolute",
                                transform: `translate(-50%, -50%) translate(${conditionMarkerPosX}px,${conditionMarkerPosY}px) rotate(${
                                    angleDegrees + 90
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
                    )}

                    {/* Conditional Squiggle Marker (Delay) */}
                    {showDelayMarker && (
                        <div
                            style={{
                                position: "absolute",
                                transform: `translate(-50%, -50%) translate(${delayMarkerPosX}px,${delayMarkerPosY}px) rotate(${angleDegrees}deg)`,
                                pointerEvents: "none",
                            }}
                            className="nodrag nopan"
                        >
                            <svg
                                width="20"
                                height="40"
                                viewBox="-5 -5 10 10"
                                className={
                                    selected
                                        ? "stroke-blue-500"
                                        : "stroke-gray-600 dark:stroke-gray-400"
                                }
                            >
                                <path
                                    d="M -2 -4 L -2 4 M 2 -4 L 2 4"
                                    strokeWidth="1.5"
                                    fill="none"
                                />
                            </svg>
                        </div>
                    )}

                    {/* Parameter Label (Near Target) - Display only when not editing */}
                    {!isEditing && hasParameter && (
                        <div
                            style={{
                                position: "absolute",
                                transform: `translate(-50%, -50%) translate(${paramLabelX}px,${paramLabelY}px)`,
                                pointerEvents: "all",
                            }}
                            className="nodrag nopan"
                        >
                            <div
                                className={`edge-label-param flex justify-center items-center ${
                                    selected
                                        ? "bg-blue-50 dark:bg-blue-900/50"
                                        : "bg-white/70 dark:bg-zinc-800/70"
                                } p-1 rounded text-xs ${
                                    selected
                                        ? "shadow-md border border-blue-300 dark:border-blue-600"
                                        : "shadow"
                                }`}
                            >
                                {typeof data.parameter === "string" && (
                                    <MathJax>{data.parameter}</MathJax>
                                )}
                            </div>
                        </div>
                    )}
                </EdgeLabelRenderer>
            </>
        );
    }
) as any;

EventGraphEdge.getDefaultData = (): EventGraphEdgeData => ({
    condition: "True",
    delay: undefined,
    parameter: undefined,
});

EventGraphEdge.getGraphType = (): string => "eventBased";

EventGraphEdge.displayName = "EventGraphEdge";

export default EventGraphEdge;
