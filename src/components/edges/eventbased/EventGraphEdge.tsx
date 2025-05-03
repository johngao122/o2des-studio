"use client";

import React, {
    memo,
    useState,
    useCallback,
    MouseEvent,
    useRef,
    useEffect,
    useMemo,
} from "react";
import {
    EdgeProps,
    EdgeLabelRenderer,
    BaseEdge,
    useReactFlow,
} from "reactflow";
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
    parseTransformMatrix,
    clientToFlowPosition,
    calculateDynamicOffset,
    calculateDefaultControlPoint,
    getMidpoint,
    getPerpendicularPoint,
    getAngleBetweenPoints,
    createBezierPathString,
} from "@/lib/utils/math";

const commandController = CommandController.getInstance();

const DELAY_LABEL_CONFIG = {
    baseOffset: 50,
    minScaleFactor: 0.1,
    maxScaleFactor: 1.5,
    connectorDashArray: "3 2",
};

type EdgeTypeOption = "straight" | "bezier";

interface EventGraphEdgeData {
    condition?: string;
    delay?: string;
    parameter?: string;
    edgeType?: EdgeTypeOption;
    controlPoint?: { x: number; y: number };
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
        const [editEdgeType, setEditEdgeType] = useState<EdgeTypeOption>(
            data?.edgeType || "straight"
        );

        const [hasCondition, setHasCondition] = useState(!!data?.condition);
        const [hasDelay, setHasDelay] = useState(
            !!data?.delay && data.delay.trim() !== ""
        );
        const [hasParameter, setHasParameter] = useState(
            !!data?.parameter && data.parameter.trim() !== ""
        );

        const [isDragging, setIsDragging] = useState(false);
        const labelRef = useRef<HTMLDivElement>(null);

        const [tempControlPoint, setTempControlPoint] = useState<{
            x: number;
            y: number;
        } | null>(null);

        const [dragOffset, setDragOffset] = useState<{
            x: number;
            y: number;
        } | null>(null);

        const edgeStyle = {
            strokeWidth: selected ? 3 : 2,
            stroke: selected ? "#3b82f6" : "#555",
            ...style,
        };

        const calculateOffsetPointForEdge = (
            x: number,
            y: number,
            angle: number,
            baseOffset: number,
            sourceX: number,
            sourceY: number,
            targetX: number,
            targetY: number
        ) => {
            const flipOffset =
                data?.edgeType === "bezier" && data?.controlPoint
                    ? isCurveFlipped(
                          sourceX,
                          sourceY,
                          targetX,
                          targetY,
                          data.controlPoint.x,
                          data.controlPoint.y
                      )
                    : false;

            const offsetDirection = flipOffset ? -1 : 1;

            const dynamicOffset = calculateDynamicOffset(
                baseOffset,
                sourceX,
                sourceY,
                targetX,
                targetY,
                DELAY_LABEL_CONFIG.minScaleFactor,
                DELAY_LABEL_CONFIG.maxScaleFactor
            );

            const offsetAngle = angle + 90 * offsetDirection;
            const offsetPoint = getOffsetPoint(
                x,
                y,
                offsetAngle,
                dynamicOffset
            );

            return { x: offsetPoint.x, y: offsetPoint.y, flipped: flipOffset };
        };

        const getEdgePath = () => {
            const edgeType = data?.edgeType || "straight";

            switch (edgeType) {
                case "bezier":
                    const controlPoint =
                        isDragging && tempControlPoint
                            ? tempControlPoint
                            : data?.controlPoint;

                    if (controlPoint) {
                        const { x: cpx, y: cpy } = controlPoint;

                        const path = createBezierPathString(
                            sourceX,
                            sourceY,
                            cpx,
                            cpy,
                            targetX,
                            targetY
                        );

                        const t1 = 0.25;
                        const quarterPoint = getBezierPoint(
                            t1,
                            sourceX,
                            sourceY,
                            cpx,
                            cpy,
                            targetX,
                            targetY
                        );
                        const quarterPointX = quarterPoint.x;
                        const quarterPointY = quarterPoint.y;

                        const delayTangent = getBezierTangent(
                            t1,
                            sourceX,
                            sourceY,
                            cpx,
                            cpy,
                            targetX,
                            targetY
                        );
                        const delayTangentAngle = delayTangent.angle;

                        const baseOffset = DELAY_LABEL_CONFIG.baseOffset;
                        const offsetDelayPoint = calculateOffsetPointForEdge(
                            quarterPointX,
                            quarterPointY,
                            delayTangentAngle,
                            baseOffset,
                            sourceX,
                            sourceY,
                            targetX,
                            targetY
                        );

                        const t2 = 0.5;
                        const midPoint = getBezierPoint(
                            t2,
                            sourceX,
                            sourceY,
                            cpx,
                            cpy,
                            targetX,
                            targetY
                        );
                        const midPointX = midPoint.x;
                        const midPointY = midPoint.y;

                        const tangent = getBezierTangent(
                            t2,
                            sourceX,
                            sourceY,
                            cpx,
                            cpy,
                            targetX,
                            targetY
                        );
                        const tangentAngle = tangent.angle;

                        const t3 = 0.75;
                        const threeQuarterPoint = getBezierPoint(
                            t3,
                            sourceX,
                            sourceY,
                            cpx,
                            cpy,
                            targetX,
                            targetY
                        );
                        const threeQuarterPointX = threeQuarterPoint.x;
                        const threeQuarterPointY = threeQuarterPoint.y;

                        return {
                            path,
                            labelX: cpx,
                            labelY: cpy,
                            quarterPointX,
                            quarterPointY,
                            delayTangentAngle,
                            delayOffsetX: offsetDelayPoint.x,
                            delayOffsetY: offsetDelayPoint.y,
                            midPointX,
                            midPointY,
                            tangentAngle,
                            threeQuarterPointX,
                            threeQuarterPointY,
                        };
                    } else {
                        const controlPoint = calculateDefaultControlPoint(
                            sourceX,
                            sourceY,
                            targetX,
                            targetY
                        );
                        const controlPointX = controlPoint.x;
                        const controlPointY = controlPoint.y;

                        const path = createBezierPathString(
                            sourceX,
                            sourceY,
                            controlPointX,
                            controlPointY,
                            targetX,
                            targetY
                        );

                        const t1 = 0.25;
                        const quarterPoint = getBezierPoint(
                            t1,
                            sourceX,
                            sourceY,
                            controlPointX,
                            controlPointY,
                            targetX,
                            targetY
                        );
                        const quarterPointX = quarterPoint.x;
                        const quarterPointY = quarterPoint.y;

                        const delayTangent = getBezierTangent(
                            t1,
                            sourceX,
                            sourceY,
                            controlPointX,
                            controlPointY,
                            targetX,
                            targetY
                        );
                        const delayTangentAngle = delayTangent.angle;

                        const baseOffset = DELAY_LABEL_CONFIG.baseOffset;
                        const offsetDelayPoint = calculateOffsetPointForEdge(
                            quarterPointX,
                            quarterPointY,
                            delayTangentAngle,
                            baseOffset,
                            sourceX,
                            sourceY,
                            targetX,
                            targetY
                        );

                        const t2 = 0.5;
                        const midPoint = getBezierPoint(
                            t2,
                            sourceX,
                            sourceY,
                            controlPointX,
                            controlPointY,
                            targetX,
                            targetY
                        );
                        const midPointX = midPoint.x;
                        const midPointY = midPoint.y;

                        const tangent = getBezierTangent(
                            t2,
                            sourceX,
                            sourceY,
                            controlPointX,
                            controlPointY,
                            targetX,
                            targetY
                        );
                        const tangentAngle = tangent.angle;

                        const t3 = 0.75;
                        const threeQuarterPoint = getBezierPoint(
                            t3,
                            sourceX,
                            sourceY,
                            controlPointX,
                            controlPointY,
                            targetX,
                            targetY
                        );
                        const threeQuarterPointX = threeQuarterPoint.x;
                        const threeQuarterPointY = threeQuarterPoint.y;

                        return {
                            path,
                            labelX: controlPointX,
                            labelY: controlPointY,
                            quarterPointX,
                            quarterPointY,
                            delayTangentAngle,
                            delayOffsetX: offsetDelayPoint.x,
                            delayOffsetY: offsetDelayPoint.y,
                            midPointX,
                            midPointY,
                            tangentAngle,
                            threeQuarterPointX,
                            threeQuarterPointY,
                        };
                    }
                case "straight":
                default:
                    const path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;

                    const angle = getAngleBetweenPoints(
                        sourceX,
                        sourceY,
                        targetX,
                        targetY
                    );

                    const midPoint = getMidpoint(
                        sourceX,
                        sourceY,
                        targetX,
                        targetY
                    );
                    const midPointX = midPoint.x;
                    const midPointY = midPoint.y;

                    const delayMarkerPoint = {
                        x: sourceX + (targetX - sourceX) * 0.25,
                        y: sourceY + (targetY - sourceY) * 0.25,
                    };
                    const delayMarkerX = delayMarkerPoint.x;
                    const delayMarkerY = delayMarkerPoint.y;

                    const baseOffset = DELAY_LABEL_CONFIG.baseOffset;
                    const offsetDelayPoint = calculateOffsetPointForEdge(
                        delayMarkerX,
                        delayMarkerY,
                        angle,
                        baseOffset,
                        sourceX,
                        sourceY,
                        targetX,
                        targetY
                    );

                    const parameterMarkerPoint = {
                        x: sourceX + (targetX - sourceX) * 0.75,
                        y: sourceY + (targetY - sourceY) * 0.75,
                    };
                    const parameterMarkerX = parameterMarkerPoint.x;
                    const parameterMarkerY = parameterMarkerPoint.y;

                    return {
                        path,
                        labelX: midPointX,
                        labelY: midPointY,
                        quarterPointX: delayMarkerX,
                        quarterPointY: delayMarkerY,
                        delayTangentAngle: angle,
                        delayOffsetX: offsetDelayPoint.x,
                        delayOffsetY: offsetDelayPoint.y,
                        midPointX,
                        midPointY,
                        tangentAngle: angle,
                        threeQuarterPointX: parameterMarkerX,
                        threeQuarterPointY: parameterMarkerY,
                    };
            }
        };

        let path1, path2, combinedPath;
        let labelX: number, labelY: number;
        let delayMarkerX: number, delayMarkerY: number;
        let delayLabelX: number, delayLabelY: number;
        let delayMarkerAngle: number;
        let conditionMarkerX: number, conditionMarkerY: number;
        let conditionMarkerAngle: number;
        let parameterMarkerX: number, parameterMarkerY: number;

        if (data?.edgeType === "bezier") {
            const result = getEdgePath();
            combinedPath = result.path;
            labelX = result.labelX;
            labelY = result.labelY;
            delayMarkerX = result.quarterPointX;
            delayMarkerY = result.quarterPointY;
            delayLabelX = result.delayOffsetX;
            delayLabelY = result.delayOffsetY;
            delayMarkerAngle = result.delayTangentAngle;
            conditionMarkerX = result.midPointX;
            conditionMarkerY = result.midPointY;
            conditionMarkerAngle = result.tangentAngle;
            parameterMarkerX = result.threeQuarterPointX;
            parameterMarkerY = result.threeQuarterPointY;
        } else {
            const markerX = sourceX * 0.75 + targetX * 0.25;
            const markerY = sourceY * 0.75 + targetY * 0.25;

            path1 = `M ${sourceX},${sourceY} L ${markerX},${markerY}`;
            path2 = `M ${markerX},${markerY} L ${targetX},${targetY}`;

            combinedPath = `${path1} ${path2.substring(1)}`;
            labelX = (sourceX + targetX) / 2;
            labelY = (sourceY + targetY) / 2 - 25;
            delayMarkerX = sourceX + (targetX - sourceX) * 0.25;
            delayMarkerY = sourceY + (targetY - sourceY) * 0.25;
            delayMarkerAngle =
                Math.atan2(targetY - sourceY, targetX - sourceX) *
                (180 / Math.PI);

            const baseOffset = DELAY_LABEL_CONFIG.baseOffset;
            const offsetDelayPoint = calculateOffsetPointForEdge(
                delayMarkerX,
                delayMarkerY,
                delayMarkerAngle,
                baseOffset,
                sourceX,
                sourceY,
                targetX,
                targetY
            );
            delayLabelX = offsetDelayPoint.x;
            delayLabelY = offsetDelayPoint.y;

            conditionMarkerX = sourceX + (targetX - sourceX) * 0.5;
            conditionMarkerY = sourceY + (targetY - sourceY) * 0.5;
            conditionMarkerAngle =
                Math.atan2(targetY - sourceY, targetX - sourceX) *
                (180 / Math.PI);
            parameterMarkerX = sourceX + (targetX - sourceX) * 0.75;
            parameterMarkerY = sourceY + (targetY - sourceY) * 0.75;
        }

        const showConditionMarker =
            !isEditing &&
            hasCondition &&
            data?.condition &&
            data.condition !== "True";
        const showDelayMarker = !isEditing && hasDelay;

        const handleDoubleClick = useCallback(() => {
            setIsEditing(true);
            setEditCondition(data?.condition || "True");
            setEditDelay(data?.delay || "");
            setEditParameter(data?.parameter || "");
            setEditEdgeType(data?.edgeType || "straight");
        }, [data]);

        const handleContainerBlur = useCallback(
            (event: React.FocusEvent<HTMLDivElement>) => {
                const currentTarget = event.currentTarget;
                const relatedTarget = event.relatedTarget as HTMLElement | null;

                if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
                    setIsEditing(false);

                    const updatedData: EventGraphEdgeData = {
                        condition: editCondition || "True",
                        edgeType: editEdgeType,
                        controlPoint: data?.controlPoint,
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
                    const currentEdgeType = data?.edgeType || "straight";
                    const currentControlPoint = data?.controlPoint;

                    const hasChanged =
                        updatedData.condition !== currentCondition ||
                        (updatedData.delay || "") !== currentDelay ||
                        (updatedData.parameter || "") !== currentParameter ||
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
            [id, data, editCondition, editDelay, editParameter, editEdgeType]
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
            (e: MouseEvent) => {
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
            },
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
                    <>
                        {data?.edgeType === "bezier" ? (
                            <path
                                d={combinedPath}
                                style={{
                                    stroke: "#93c5fd",
                                    strokeWidth: 6,
                                    strokeOpacity: 0.5,
                                    fill: "none",
                                }}
                            />
                        ) : (
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
                    </>
                )}

                {/* Edge paths */}
                <g style={{ cursor: "pointer" }}>
                    {data?.edgeType === "bezier" ? (
                        <path
                            id={id}
                            className="react-flow__edge-path"
                            d={combinedPath}
                            style={edgeStyle}
                            markerEnd={markerEnd}
                            onClick={onClick}
                        />
                    ) : (
                        <>
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
                        </>
                    )}
                </g>

                <EdgeLabelRenderer>
                    {/* Main Label (Condition & Parameter) */}
                    <div
                        style={{
                            position: "absolute",
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: "all",
                        }}
                        className="nodrag nopan"
                    >
                        <div
                            ref={labelRef}
                            onDoubleClick={
                                !isEditing ? handleDoubleClick : undefined
                            }
                            onMouseDown={
                                !isEditing && data?.edgeType === "bezier"
                                    ? handleDragStart
                                    : undefined
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
                            } ${isEditing ? "h-full" : ""} ${
                                data?.edgeType === "bezier" && !isEditing
                                    ? "draggable-bezier"
                                    : ""
                            } ${isDragging ? "opacity-70" : ""}`}
                            style={{
                                minWidth: isEditing ? "180px" : "auto",
                                minHeight: isEditing ? "100px" : "auto",
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
                                    <Select
                                        value={editEdgeType}
                                        onValueChange={(
                                            value: EdgeTypeOption
                                        ) => setEditEdgeType(value)}
                                    >
                                        <SelectTrigger className="nodrag text-xs h-6 dark:bg-zinc-700">
                                            <SelectValue placeholder="Edge Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="straight">
                                                Straight
                                            </SelectItem>
                                            <SelectItem value="bezier">
                                                Bezier
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
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

                    {/* Delay Label */}
                    {!isEditing && hasDelay && (
                        <div
                            style={{
                                position: "absolute",
                                transform: `translate(-50%, -50%) translate(${delayLabelX}px,${delayLabelY}px)`,
                                pointerEvents: "all",
                                zIndex: 10,
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
                                style={{
                                    boxShadow: selected
                                        ? "0 2px 4px rgba(59, 130, 246, 0.3)"
                                        : "0 1px 3px rgba(0, 0, 0, 0.1)",
                                    minWidth: "20px",
                                    backdropFilter: "blur(4px)",
                                }}
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
                    )}

                    {/* Conditional Squiggle Marker (Delay) */}
                    {showDelayMarker && (
                        <>
                            {/* Marker on the curve */}
                            <div
                                style={{
                                    position: "absolute",
                                    transform: `translate(-50%, -50%) translate(${delayMarkerX}px,${delayMarkerY}px) rotate(${delayMarkerAngle}deg)`,
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

                            {/* Connector line between marker and label */}
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    pointerEvents: "none",
                                    width: "100%",
                                    height: "100%",
                                }}
                                className="nodrag nopan"
                            >
                                <svg
                                    width="100%"
                                    height="100%"
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        pointerEvents: "none",
                                        overflow: "visible",
                                    }}
                                >
                                    <path
                                        d={`M ${delayMarkerX} ${delayMarkerY} L ${delayLabelX} ${delayLabelY}`}
                                        stroke={
                                            selected ? "#3b82f6" : "#6b7280"
                                        }
                                        strokeWidth={selected ? 1.5 : 1}
                                        strokeDasharray={
                                            DELAY_LABEL_CONFIG.connectorDashArray
                                        }
                                        fill="none"
                                        strokeOpacity={selected ? 0.8 : 0.6}
                                    />
                                </svg>
                            </div>
                        </>
                    )}

                    {/* Parameter Label (Near Target) - Display only when not editing */}
                    {!isEditing && hasParameter && (
                        <div
                            style={{
                                position: "absolute",
                                transform: `translate(-50%, -50%) translate(${parameterMarkerX}px,${parameterMarkerY}px)`,
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
    edgeType: "straight",
    controlPoint: undefined,
});

EventGraphEdge.getGraphType = (): string => "eventBased";

EventGraphEdge.displayName = "EventGraphEdge";

export default EventGraphEdge;
