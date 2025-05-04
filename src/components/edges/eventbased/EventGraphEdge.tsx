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
    projectPointOntoBezierCurve,
} from "@/lib/utils/math";
import { calculateOffsetPointForEdge } from "@/lib/utils/edge";

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
    delayPosition?: number;
    parameterPosition?: number;
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
        const [isDelayDragging, setIsDelayDragging] = useState(false);
        const [isParamDragging, setIsParamDragging] = useState(false);
        const labelRef = useRef<HTMLDivElement>(null);
        const delayLabelRef = useRef<HTMLDivElement>(null);
        const paramLabelRef = useRef<HTMLDivElement>(null);

        const [tempControlPoint, setTempControlPoint] = useState<{
            x: number;
            y: number;
        } | null>(null);

        const [tempDelayPosition, setTempDelayPosition] = useState<
            number | null
        >(null);
        const [tempParamPosition, setTempParamPosition] = useState<
            number | null
        >(null);

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

                        const delayPosition =
                            isDelayDragging && tempDelayPosition !== null
                                ? tempDelayPosition
                                : data?.delayPosition !== undefined
                                ? data.delayPosition
                                : 0.25;

                        const delayPoint = getBezierPoint(
                            delayPosition,
                            sourceX,
                            sourceY,
                            cpx,
                            cpy,
                            targetX,
                            targetY
                        );
                        const delayPointX = delayPoint.x;
                        const delayPointY = delayPoint.y;

                        const delayTangent = getBezierTangent(
                            delayPosition,
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
                            delayPointX,
                            delayPointY,
                            delayTangentAngle,
                            baseOffset,
                            sourceX,
                            sourceY,
                            targetX,
                            targetY,
                            controlPoint,
                            DELAY_LABEL_CONFIG.minScaleFactor,
                            DELAY_LABEL_CONFIG.maxScaleFactor
                        );

                        const paramPosition =
                            isParamDragging && tempParamPosition !== null
                                ? tempParamPosition
                                : data?.parameterPosition !== undefined
                                ? data.parameterPosition
                                : 0.75;

                        const paramPoint = getBezierPoint(
                            paramPosition,
                            sourceX,
                            sourceY,
                            cpx,
                            cpy,
                            targetX,
                            targetY
                        );
                        const paramPointX = paramPoint.x;
                        const paramPointY = paramPoint.y;

                        const paramTangent = getBezierTangent(
                            paramPosition,
                            sourceX,
                            sourceY,
                            cpx,
                            cpy,
                            targetX,
                            targetY
                        );
                        const paramTangentAngle = paramTangent.angle;

                        const offsetParamPoint = calculateOffsetPointForEdge(
                            paramPointX,
                            paramPointY,
                            paramTangentAngle,
                            baseOffset,
                            sourceX,
                            sourceY,
                            targetX,
                            targetY,
                            controlPoint,
                            DELAY_LABEL_CONFIG.minScaleFactor,
                            DELAY_LABEL_CONFIG.maxScaleFactor
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

                        return {
                            path,
                            labelX: cpx,
                            labelY: cpy,
                            quarterPointX: delayPointX,
                            quarterPointY: delayPointY,
                            delayTangentAngle,
                            delayOffsetX: offsetDelayPoint.x,
                            delayOffsetY: offsetDelayPoint.y,
                            midPointX,
                            midPointY,
                            tangentAngle,
                            threeQuarterPointX: paramPointX,
                            threeQuarterPointY: paramPointY,
                            paramTangentAngle,
                            paramOffsetX: offsetParamPoint.x,
                            paramOffsetY: offsetParamPoint.y,
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

                        const delayPosition =
                            isDelayDragging && tempDelayPosition !== null
                                ? tempDelayPosition
                                : data?.delayPosition !== undefined
                                ? data.delayPosition
                                : 0.25;

                        const delayPoint = getBezierPoint(
                            delayPosition,
                            sourceX,
                            sourceY,
                            controlPointX,
                            controlPointY,
                            targetX,
                            targetY
                        );
                        const delayPointX = delayPoint.x;
                        const delayPointY = delayPoint.y;

                        const delayTangent = getBezierTangent(
                            delayPosition,
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
                            delayPointX,
                            delayPointY,
                            delayTangentAngle,
                            baseOffset,
                            sourceX,
                            sourceY,
                            targetX,
                            targetY,
                            undefined,
                            DELAY_LABEL_CONFIG.minScaleFactor,
                            DELAY_LABEL_CONFIG.maxScaleFactor
                        );

                        const paramPosition =
                            isParamDragging && tempParamPosition !== null
                                ? tempParamPosition
                                : data?.parameterPosition !== undefined
                                ? data.parameterPosition
                                : 0.75;

                        const paramPoint = getBezierPoint(
                            paramPosition,
                            sourceX,
                            sourceY,
                            controlPointX,
                            controlPointY,
                            targetX,
                            targetY
                        );
                        const paramPointX = paramPoint.x;
                        const paramPointY = paramPoint.y;

                        const paramTangent = getBezierTangent(
                            paramPosition,
                            sourceX,
                            sourceY,
                            controlPointX,
                            controlPointY,
                            targetX,
                            targetY
                        );
                        const paramTangentAngle = paramTangent.angle;

                        const offsetParamPoint = calculateOffsetPointForEdge(
                            paramPointX,
                            paramPointY,
                            paramTangentAngle,
                            baseOffset,
                            sourceX,
                            sourceY,
                            targetX,
                            targetY,
                            undefined,
                            DELAY_LABEL_CONFIG.minScaleFactor,
                            DELAY_LABEL_CONFIG.maxScaleFactor
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

                        return {
                            path,
                            labelX: controlPointX,
                            labelY: controlPointY,
                            quarterPointX: delayPointX,
                            quarterPointY: delayPointY,
                            delayTangentAngle,
                            delayOffsetX: offsetDelayPoint.x,
                            delayOffsetY: offsetDelayPoint.y,
                            midPointX,
                            midPointY,
                            tangentAngle,
                            threeQuarterPointX: paramPointX,
                            threeQuarterPointY: paramPointY,
                            paramTangentAngle,
                            paramOffsetX: offsetParamPoint.x,
                            paramOffsetY: offsetParamPoint.y,
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
                        targetY,
                        undefined,
                        DELAY_LABEL_CONFIG.minScaleFactor,
                        DELAY_LABEL_CONFIG.maxScaleFactor
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
        let parameterLabelX: number, parameterLabelY: number;
        let parameterMarkerAngle: number;

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
            parameterMarkerAngle = result.paramTangentAngle || 0;

            const baseOffset = DELAY_LABEL_CONFIG.baseOffset;
            const offsetParamPoint = calculateOffsetPointForEdge(
                parameterMarkerX,
                parameterMarkerY,
                parameterMarkerAngle,
                baseOffset,
                sourceX,
                sourceY,
                targetX,
                targetY,
                undefined,
                DELAY_LABEL_CONFIG.minScaleFactor,
                DELAY_LABEL_CONFIG.maxScaleFactor
            );
            parameterLabelX = offsetParamPoint.x;
            parameterLabelY = offsetParamPoint.y;
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
                targetY,
                undefined,
                DELAY_LABEL_CONFIG.minScaleFactor,
                DELAY_LABEL_CONFIG.maxScaleFactor
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
            parameterMarkerAngle = delayMarkerAngle;

            const offsetParamPoint = calculateOffsetPointForEdge(
                parameterMarkerX,
                parameterMarkerY,
                parameterMarkerAngle,
                baseOffset,
                sourceX,
                sourceY,
                targetX,
                targetY,
                undefined,
                DELAY_LABEL_CONFIG.minScaleFactor,
                DELAY_LABEL_CONFIG.maxScaleFactor
            );
            parameterLabelX = offsetParamPoint.x;
            parameterLabelY = offsetParamPoint.y;
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

                const isSelectDropdown =
                    relatedTarget &&
                    (relatedTarget.closest('[role="listbox"]') ||
                        relatedTarget.hasAttribute(
                            "data-radix-select-viewport"
                        ) ||
                        relatedTarget.classList.contains("select-content") ||
                        relatedTarget.classList.contains("select-item") ||
                        relatedTarget.classList.contains("select-trigger") ||
                        (relatedTarget.className &&
                            typeof relatedTarget.className === "string" &&
                            (relatedTarget.className.includes("radix") ||
                                relatedTarget.className.includes("select"))));

                if (
                    !relatedTarget ||
                    (!currentTarget.contains(relatedTarget) &&
                        !isSelectDropdown)
                ) {
                    setIsEditing(false);

                    const updatedData: EventGraphEdgeData = {
                        condition: editCondition || "True",
                        edgeType: editEdgeType,
                        controlPoint: data?.controlPoint,
                        delayPosition: data?.delayPosition,
                        parameterPosition: data?.parameterPosition,
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
                    const currentDelayPosition = data?.delayPosition;
                    const currentParamPosition = data?.parameterPosition;

                    const hasChanged =
                        updatedData.condition !== currentCondition ||
                        (updatedData.delay || "") !== currentDelay ||
                        (updatedData.parameter || "") !== currentParameter ||
                        updatedData.edgeType !== currentEdgeType ||
                        JSON.stringify(updatedData.controlPoint) !==
                            JSON.stringify(currentControlPoint) ||
                        updatedData.delayPosition !== currentDelayPosition ||
                        updatedData.parameterPosition !== currentParamPosition;

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

        const handleDelayDragStart = (e: MouseEvent) => {
            if (isEditing) return;

            e.stopPropagation();
            e.preventDefault();

            setIsDelayDragging(true);
            document.body.style.cursor = "grabbing";
        };

        const handleDelayDrag = useCallback(
            throttle((e: MouseEvent) => {
                if (!isDelayDragging || isEditing) return;

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

                    if (data?.edgeType === "bezier") {
                        const projection = projectPointOntoBezierCurve(
                            mousePosition,
                            sourceX,
                            sourceY,
                            data?.controlPoint ||
                                calculateDefaultControlPoint(
                                    sourceX,
                                    sourceY,
                                    targetX,
                                    targetY
                                ),
                            targetX,
                            targetY,
                            0.05,
                            0.45
                        );

                        setTempDelayPosition(projection.t);
                    } else {
                        const lineLength = Math.sqrt(
                            Math.pow(targetX - sourceX, 2) +
                                Math.pow(targetY - sourceY, 2)
                        );

                        const dx = targetX - sourceX;
                        const dy = targetY - sourceY;
                        const t =
                            ((mousePosition.x - sourceX) * dx +
                                (mousePosition.y - sourceY) * dy) /
                            (lineLength * lineLength);

                        const constrainedT = Math.max(0.05, Math.min(0.45, t));
                        setTempDelayPosition(constrainedT);
                    }
                }
            }, 16),
            [
                isDelayDragging,
                isEditing,
                sourceX,
                sourceY,
                targetX,
                targetY,
                data,
            ]
        );

        const handleDelayDragEnd = useCallback(() => {
            if (isDelayDragging && tempDelayPosition !== null) {
                const hasChanged = data?.delayPosition !== tempDelayPosition;

                if (hasChanged) {
                    const command = commandController.createUpdateEdgeCommand(
                        id,
                        {
                            data: {
                                ...data,
                                delayPosition: tempDelayPosition,
                            },
                        }
                    );
                    commandController.execute(command);
                }
            }

            setIsDelayDragging(false);
            setTempDelayPosition(null);
            document.body.style.cursor = "";
        }, [isDelayDragging, tempDelayPosition, data, id]);

        const handleParamDragStart = (e: MouseEvent) => {
            if (isEditing) return;

            e.stopPropagation();
            e.preventDefault();

            setIsParamDragging(true);
            document.body.style.cursor = "grabbing";
        };

        const handleParamDrag = useCallback(
            throttle((e: MouseEvent) => {
                if (!isParamDragging || isEditing) return;

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

                    if (data?.edgeType === "bezier") {
                        const projection = projectPointOntoBezierCurve(
                            mousePosition,
                            sourceX,
                            sourceY,
                            data?.controlPoint ||
                                calculateDefaultControlPoint(
                                    sourceX,
                                    sourceY,
                                    targetX,
                                    targetY
                                ),
                            targetX,
                            targetY,
                            0.55,
                            0.95
                        );

                        setTempParamPosition(projection.t);
                    } else {
                        const lineLength = Math.sqrt(
                            Math.pow(targetX - sourceX, 2) +
                                Math.pow(targetY - sourceY, 2)
                        );

                        const dx = targetX - sourceX;
                        const dy = targetY - sourceY;
                        const t =
                            ((mousePosition.x - sourceX) * dx +
                                (mousePosition.y - sourceY) * dy) /
                            (lineLength * lineLength);

                        const constrainedT = Math.max(0.55, Math.min(0.95, t));
                        setTempParamPosition(constrainedT);
                    }
                }
            }, 16),
            [
                isParamDragging,
                isEditing,
                sourceX,
                sourceY,
                targetX,
                targetY,
                data,
            ]
        );

        const handleParamDragEnd = useCallback(() => {
            if (isParamDragging && tempParamPosition !== null) {
                const hasChanged =
                    data?.parameterPosition !== tempParamPosition;

                if (hasChanged) {
                    const command = commandController.createUpdateEdgeCommand(
                        id,
                        {
                            data: {
                                ...data,
                                parameterPosition: tempParamPosition,
                            },
                        }
                    );
                    commandController.execute(command);
                }
            }

            setIsParamDragging(false);
            setTempParamPosition(null);
            document.body.style.cursor = "";
        }, [isParamDragging, tempParamPosition, data, id]);

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

        useEffect(() => {
            if (isDelayDragging) {
                window.addEventListener("mousemove", handleDelayDrag as any);
                window.addEventListener("mouseup", handleDelayDragEnd);

                return () => {
                    window.removeEventListener(
                        "mousemove",
                        handleDelayDrag as any
                    );
                    window.removeEventListener("mouseup", handleDelayDragEnd);
                };
            }
        }, [isDelayDragging, handleDelayDrag, handleDelayDragEnd]);

        useEffect(() => {
            if (isParamDragging) {
                window.addEventListener("mousemove", handleParamDrag as any);
                window.addEventListener("mouseup", handleParamDragEnd);

                return () => {
                    window.removeEventListener(
                        "mousemove",
                        handleParamDrag as any
                    );
                    window.removeEventListener("mouseup", handleParamDragEnd);
                };
            }
        }, [isParamDragging, handleParamDrag, handleParamDragEnd]);

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
                                            {typeof data?.condition ===
                                                "string" &&
                                            data.condition.trim() !== ""
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
                                ref={delayLabelRef}
                                onMouseDown={
                                    !isEditing
                                        ? handleDelayDragStart
                                        : undefined
                                }
                                className={`edge-label-delay flex justify-center items-center ${
                                    selected
                                        ? "bg-blue-50 dark:bg-blue-900/50"
                                        : "bg-white/70 dark:bg-zinc-800/70"
                                } p-1 rounded text-xs ${
                                    selected
                                        ? "shadow-md border border-blue-300 dark:border-blue-600"
                                        : "shadow"
                                } ${!isEditing ? "cursor-ew-resize" : ""} ${
                                    isDelayDragging ? "opacity-70" : ""
                                }`}
                                style={{
                                    boxShadow: selected
                                        ? "0 2px 4px rgba(59, 130, 246, 0.3)"
                                        : "0 1px 3px rgba(0, 0, 0, 0.1)",
                                    minWidth: "20px",
                                    backdropFilter: "blur(4px)",
                                    cursor: !isEditing
                                        ? "ew-resize"
                                        : "default",
                                }}
                            >
                                <MathJax>
                                    {typeof data?.delay === "string" &&
                                    data.delay.trim() !== ""
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
                                transform: `translate(-50%, -50%) translate(${parameterLabelX}px,${parameterLabelY}px)`,
                                pointerEvents: "all",
                            }}
                            className="nodrag nopan"
                        >
                            <div
                                ref={paramLabelRef}
                                onMouseDown={
                                    !isEditing
                                        ? handleParamDragStart
                                        : undefined
                                }
                                className={`edge-label-param flex justify-center items-center ${
                                    selected
                                        ? "bg-blue-50 dark:bg-blue-900/50"
                                        : "bg-white/70 dark:bg-zinc-800/70"
                                } p-1 rounded text-xs ${
                                    selected
                                        ? "shadow-md border border-blue-300 dark:border-blue-600"
                                        : "shadow"
                                } ${!isEditing ? "cursor-ew-resize" : ""} ${
                                    isParamDragging ? "opacity-70" : ""
                                }`}
                                style={{
                                    boxShadow: selected
                                        ? "0 2px 4px rgba(59, 130, 246, 0.3)"
                                        : "0 1px 3px rgba(0, 0, 0, 0.1)",
                                    minWidth: "20px",
                                    backdropFilter: "blur(4px)",
                                    cursor: !isEditing
                                        ? "ew-resize"
                                        : "default",
                                }}
                            >
                                {typeof data.parameter === "string" &&
                                data.parameter.trim() !== "" ? (
                                    <MathJax>{data.parameter}</MathJax>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {/* Connector line for parameter label */}
                    {!isEditing && hasParameter && (
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
                                    d={`M ${parameterMarkerX} ${parameterMarkerY} L ${parameterLabelX} ${parameterLabelY}`}
                                    stroke={selected ? "#3b82f6" : "#6b7280"}
                                    strokeWidth={selected ? 1.5 : 1}
                                    strokeDasharray={
                                        DELAY_LABEL_CONFIG.connectorDashArray
                                    }
                                    fill="none"
                                    strokeOpacity={selected ? 0.8 : 0.6}
                                />
                            </svg>
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
    delayPosition: 0.25,
    parameterPosition: 0.75,
});

EventGraphEdge.getGraphType = (): string => "eventBased";

EventGraphEdge.displayName = "EventGraphEdge";

export default EventGraphEdge;
