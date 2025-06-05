"use client";

import React, { memo, useState, useCallback, useRef, useMemo } from "react";
import { EdgeProps, EdgeLabelRenderer } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getBezierPoint,
    getBezierTangent,
    isCurveFlipped,
    getOffsetPoint,
    calculateDynamicOffset,
} from "@/lib/utils/math";
import { calculateOffsetPointForEdge } from "@/lib/utils/edge";
import BaseEdgeComponent, {
    BaseEdgeData,
    BaseEdgeProps,
} from "@/components/edges/BaseEdgeComponent";

const commandController = CommandController.getInstance();

const DELAY_LABEL_CONFIG = {
    baseOffset: 50,
    minScaleFactor: 0.1,
    maxScaleFactor: 1.5,
    connectorDashArray: "3 2",
};

interface EventGraphEdgeData extends BaseEdgeData {
    condition?: string;
    delay?: string;
    parameter?: string;
    delayPosition?: number;
    parameterPosition?: number;
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

        const [isDelayDragging, setIsDelayDragging] = useState(false);
        const [isParamDragging, setIsParamDragging] = useState(false);
        const delayLabelRef = useRef<HTMLDivElement>(null);
        const paramLabelRef = useRef<HTMLDivElement>(null);

        const [tempDelayPosition, setTempDelayPosition] = useState<
            number | null
        >(null);
        const [tempParamPosition, setTempParamPosition] = useState<
            number | null
        >(null);

        const handleDoubleClick = () => {
            setIsEditing(true);
            setEditCondition(data?.condition || "True");
            setEditDelay(data?.delay || "");
            setEditParameter(data?.parameter || "");
        };

        const handleSave = useCallback(() => {
            const updatedData: EventGraphEdgeData = {
                ...data,
            };

            if (hasCondition && editCondition.trim() !== "") {
                updatedData.condition = editCondition.trim();
            } else {
                updatedData.condition = undefined;
            }

            if (hasDelay && editDelay.trim() !== "") {
                updatedData.delay = editDelay.trim();
            } else {
                updatedData.delay = undefined;
            }

            if (hasParameter && editParameter.trim() !== "") {
                updatedData.parameter = editParameter.trim();
            } else {
                updatedData.parameter = undefined;
            }

            const command = commandController.createUpdateEdgeCommand(id, {
                data: updatedData,
            });
            commandController.execute(command);
            setIsEditing(false);
        }, [
            id,
            data,
            editCondition,
            editDelay,
            editParameter,
            hasCondition,
            hasDelay,
            hasParameter,
        ]);

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                handleSave();
            } else if (e.key === "Escape") {
                setIsEditing(false);
                setEditCondition(data?.condition || "True");
                setEditDelay(data?.delay || "");
                setEditParameter(data?.parameter || "");
            }
        };

        const handleContainerBlur = () => {
            handleSave();
        };

        const handleDelayDragStart = (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setIsDelayDragging(true);
            document.body.style.cursor = "ew-resize";
        };

        const handleParamDragStart = (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setIsParamDragging(true);
            document.body.style.cursor = "ew-resize";
        };

        const calculatePositions = (
            edgePath: string,
            currentControlPoints: { x: number; y: number }[],
            isSimpleMode: boolean,
            centerX: number,
            centerY: number
        ) => {
            const delayPosition =
                tempDelayPosition ?? data?.delayPosition ?? 0.25;
            const parameterPosition =
                tempParamPosition ?? data?.parameterPosition ?? 0.75;

            let delayPoint: { x: number; y: number };
            let paramPoint: { x: number; y: number };
            let conditionPoint: { x: number; y: number };

            if (isSimpleMode) {
                const dx = targetX - sourceX;
                const dy = targetY - sourceY;

                delayPoint = {
                    x: sourceX + dx * delayPosition,
                    y: sourceY + dy * delayPosition,
                };

                paramPoint = {
                    x: sourceX + dx * parameterPosition,
                    y: sourceY + dy * parameterPosition,
                };

                conditionPoint = {
                    x: sourceX + dx * 0.5,
                    y: sourceY + dy * 0.5,
                };
            } else {
                if (
                    data?.edgeType === "bezier" &&
                    currentControlPoints.length > 0
                ) {
                    delayPoint = getBezierPoint(
                        sourceX,
                        sourceY,
                        currentControlPoints[0]?.x || centerX,
                        currentControlPoints[0]?.y || centerY,
                        targetX,
                        targetY,
                        delayPosition
                    );

                    paramPoint = getBezierPoint(
                        sourceX,
                        sourceY,
                        currentControlPoints[0]?.x || centerX,
                        currentControlPoints[0]?.y || centerY,
                        targetX,
                        targetY,
                        parameterPosition
                    );

                    conditionPoint = getBezierPoint(
                        sourceX,
                        sourceY,
                        currentControlPoints[0]?.x || centerX,
                        currentControlPoints[0]?.y || centerY,
                        targetX,
                        targetY,
                        0.5
                    );
                } else {
                    delayPoint = { x: centerX, y: centerY };
                    paramPoint = { x: centerX, y: centerY };
                    conditionPoint = { x: centerX, y: centerY };
                }
            }

            return { delayPoint, paramPoint, conditionPoint };
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
                    const { delayPoint, paramPoint, conditionPoint } =
                        calculatePositions(
                            edgePath,
                            currentControlPoints,
                            isSimpleMode,
                            centerX,
                            centerY
                        );

                    const showConditionMarker = hasCondition && !isEditing;
                    const showDelayMarker = hasDelay && !isEditing;

                    return (
                        <EdgeLabelRenderer>
                            {/* Main Label for Editing */}
                            <div
                                style={{
                                    position: "absolute",
                                    transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                                    pointerEvents: "all",
                                }}
                                className="nodrag nopan"
                                onMouseDown={
                                    isEditing
                                        ? (e) => e.stopPropagation()
                                        : undefined
                                }
                            >
                                <div
                                    onDoubleClick={
                                        !isEditing
                                            ? handleDoubleClick
                                            : undefined
                                    }
                                    onClick={
                                        isEditing
                                            ? (e) => e.stopPropagation()
                                            : undefined
                                    }
                                    onBlur={
                                        isEditing
                                            ? handleContainerBlur
                                            : undefined
                                    }
                                    tabIndex={-1}
                                    className={`event-edge-label flex flex-col items-center justify-center ${
                                        selected
                                            ? "bg-blue-50 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600"
                                            : "bg-white/90 dark:bg-zinc-800/90 border-gray-300 dark:border-gray-600"
                                    } p-2 rounded border-2 text-xs shadow ${
                                        isEditing
                                            ? "min-w-[300px]"
                                            : "min-w-[20px] min-h-[20px]"
                                    }`}
                                >
                                    {isEditing ? (
                                        <div className="flex flex-col space-y-2 p-1 w-full">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={hasCondition}
                                                    onChange={(e) =>
                                                        setHasCondition(
                                                            e.target.checked
                                                        )
                                                    }
                                                    className="nodrag"
                                                />
                                                <label className="text-xs">
                                                    Condition
                                                </label>
                                                <Input
                                                    type="text"
                                                    value={editCondition}
                                                    onChange={(e) =>
                                                        setEditCondition(
                                                            e.target.value
                                                        )
                                                    }
                                                    onKeyDown={handleKeyDown}
                                                    className="nodrag text-xs h-6 flex-1"
                                                    placeholder="True"
                                                    disabled={!hasCondition}
                                                />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={hasDelay}
                                                    onChange={(e) =>
                                                        setHasDelay(
                                                            e.target.checked
                                                        )
                                                    }
                                                    className="nodrag"
                                                />
                                                <label className="text-xs">
                                                    Delay
                                                </label>
                                                <Input
                                                    type="text"
                                                    value={editDelay}
                                                    onChange={(e) =>
                                                        setEditDelay(
                                                            e.target.value
                                                        )
                                                    }
                                                    onKeyDown={handleKeyDown}
                                                    className="nodrag text-xs h-6 flex-1"
                                                    placeholder="TimeSpan"
                                                    disabled={!hasDelay}
                                                />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={hasParameter}
                                                    onChange={(e) =>
                                                        setHasParameter(
                                                            e.target.checked
                                                        )
                                                    }
                                                    className="nodrag"
                                                />
                                                <label className="text-xs">
                                                    Parameter
                                                </label>
                                                <Input
                                                    type="text"
                                                    value={editParameter}
                                                    onChange={(e) =>
                                                        setEditParameter(
                                                            e.target.value
                                                        )
                                                    }
                                                    onKeyDown={handleKeyDown}
                                                    className="nodrag text-xs h-6 flex-1"
                                                    placeholder="Value"
                                                    disabled={!hasParameter}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            Event
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Delay Label */}
                            {!isEditing && hasDelay && (
                                <div
                                    style={{
                                        position: "absolute",
                                        transform: `translate(-50%, -50%) translate(${delayPoint.x}px,${delayPoint.y}px)`,
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
                                        } cursor-ew-resize ${
                                            isDelayDragging ? "opacity-70" : ""
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
                                            <MathJax>
                                                {typeof data?.delay ===
                                                    "string" &&
                                                data.delay.trim() !== ""
                                                    ? `{${data.delay}}`
                                                    : "{}"}
                                            </MathJax>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Condition Marker */}
                            {showConditionMarker && (
                                <div
                                    style={{
                                        position: "absolute",
                                        transform: `translate(-50%, -50%) translate(${conditionPoint.x}px,${conditionPoint.y}px)`,
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

                            {/* Parameter Label */}
                            {!isEditing && hasParameter && (
                                <div
                                    style={{
                                        position: "absolute",
                                        transform: `translate(-50%, -50%) translate(${paramPoint.x}px,${paramPoint.y}px)`,
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
                                                ? "bg-blue-50 dark:bg-blue-900/50"
                                                : "bg-white/90 dark:bg-zinc-800/90"
                                        } px-2 py-1 rounded-full text-xs ${
                                            selected
                                                ? "shadow-md border border-blue-300 dark:border-blue-600"
                                                : "shadow border border-gray-200 dark:border-gray-700"
                                        } cursor-ew-resize ${
                                            isParamDragging ? "opacity-70" : ""
                                        }`}
                                        style={{
                                            boxShadow: selected
                                                ? "0 2px 4px rgba(59, 130, 246, 0.3)"
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
                                            <MathJax>
                                                {typeof data.parameter ===
                                                    "string" &&
                                                data.parameter.trim() !== ""
                                                    ? data.parameter
                                                    : ""}
                                            </MathJax>
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
    delayPosition: 0.25,
    parameterPosition: 0.75,
});

EventGraphEdge.getGraphType = (): string => "eventBased";

EventGraphEdge.displayName = "EventGraphEdge";

export default EventGraphEdge;
