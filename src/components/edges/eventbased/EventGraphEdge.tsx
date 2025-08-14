"use client";

import React, { memo, useCallback, useRef, useEffect } from "react";
import { EdgeProps, EdgeLabelRenderer } from "reactflow";
import ReactKatex from "@pkasila/react-katex";
import { CommandController } from "@/controllers/CommandController";
import {
    parseTransformMatrix,
    clientToFlowPosition,
    throttle,
    calculateEdgePositions,
    getPointAndAngleOnPath,
} from "@/lib/utils/math";
import BaseEdgeComponent, {
    BaseEdgeData,
    BaseEdgeProps,
    getDefaultBaseEdgeData,
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
        const anchorRef = useRef<{
            condition?: { x: number; y: number };
            delay?: { x: number; y: number };
            parameter?: { x: number; y: number };
        }>({});
        const pathStringRef = useRef<string>("");
        const tempConditionTRef = useRef<number | null>(null);
        const tempDelayTRef = useRef<number | null>(null);
        const tempParamTRef = useRef<number | null>(null);

        const projectPointOntoPath = (
            pathD: string,
            p: { x: number; y: number }
        ): { x: number; y: number; t: number } => {
            try {
                const svg = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "svg"
                );
                const path = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "path"
                );
                path.setAttribute("d", pathD);
                svg.appendChild(path);
                document.body.appendChild(svg);
                const total = path.getTotalLength();
                let bestT = 0;
                let bestDist = Infinity;

                const samples = 50;
                for (let i = 0; i <= samples; i++) {
                    const t = i / samples;
                    const pt = path.getPointAtLength(total * t);
                    const dx = p.x - pt.x;
                    const dy = p.y - pt.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < bestDist) {
                        bestDist = d2;
                        bestT = t;
                    }
                }

                const refineRange = 0.04;
                const lower = Math.max(0, bestT - refineRange);
                const upper = Math.min(1, bestT + refineRange);
                const steps = 20;
                bestDist = Infinity;
                for (let i = 0; i <= steps; i++) {
                    const t = lower + (i / steps) * (upper - lower);
                    const pt = path.getPointAtLength(total * t);
                    const dx = p.x - pt.x;
                    const dy = p.y - pt.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < bestDist) {
                        bestDist = d2;
                        bestT = t;
                    }
                }
                const bestPt = path.getPointAtLength(total * bestT);
                document.body.removeChild(svg);
                return { x: bestPt.x, y: bestPt.y, t: bestT };
            } catch (e) {
                return { x: p.x, y: p.y, t: 0.5 };
            }
        };

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
                    try {
                        transformMatrixRef.current =
                            parseTransformMatrix(transformStyle);
                    } catch (error) {
                        console.warn(
                            "Failed to parse transform matrix:",
                            error
                        );
                        transformMatrixRef.current = {
                            scale: 1,
                            offsetX: 0,
                            offsetY: 0,
                        };
                    }

                    let defaultOffset: { x: number; y: number } = {
                        x: 0,
                        y: 0,
                    };
                    let currentOffset: { x: number; y: number } | undefined;
                    let currentT: number | undefined;
                    switch (type) {
                        case "condition":
                            defaultOffset = { x: 0, y: -40 };
                            currentOffset = data?.conditionLabelOffset;
                            currentT = data?.conditionPosition ?? 0.5;
                            break;
                        case "delay":
                            defaultOffset = { x: 0, y: -30 };
                            currentOffset = data?.delayLabelOffset;
                            currentT = data?.delayPosition ?? 0.25;
                            break;
                        case "parameter":
                            defaultOffset = { x: 0, y: -50 };
                            currentOffset = data?.parameterLabelOffset;
                            currentT = data?.parameterPosition ?? 0.75;
                            break;
                    }

                    const usedOffset = currentOffset || defaultOffset;
                    const existingAnchor =
                        (type === "condition" && anchorRef.current.condition) ||
                        (type === "delay" && anchorRef.current.delay) ||
                        (type === "parameter" && anchorRef.current.parameter);

                    const anchorPoint = existingAnchor || {
                        x: (sourceX + targetX) / 2,
                        y: (sourceY + targetY) / 2,
                    };

                    const labelFlowPos = {
                        x: anchorPoint.x + usedOffset.x,
                        y: anchorPoint.y + usedOffset.y,
                    };

                    const mouseFlowPos = clientToFlowPosition(
                        e.clientX,
                        e.clientY,
                        transformMatrixRef.current || {
                            scale: 1,
                            offsetX: 0,
                            offsetY: 0,
                        }
                    );

                    dragOffsetRef.current = {
                        x: labelFlowPos.x - mouseFlowPos.x,
                        y: labelFlowPos.y - mouseFlowPos.y,
                    };

                    if (type === "condition") {
                        setTempConditionPosition(labelFlowPos);
                        tempConditionTRef.current = currentT ?? 0.5;
                    }
                    if (type === "delay") {
                        setTempDelayPosition(labelFlowPos);
                        tempDelayTRef.current = currentT ?? 0.25;
                    }
                    if (type === "parameter") {
                        setTempParamPosition(labelFlowPos);
                        tempParamTRef.current = currentT ?? 0.75;
                    }

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
                            try {
                                transformMatrixRef.current =
                                    parseTransformMatrix(transformStyle);
                            } catch (error) {
                                console.warn(
                                    "Failed to parse transform matrix during drag:",
                                    error
                                );
                                transformMatrixRef.current = {
                                    scale: 1,
                                    offsetX: 0,
                                    offsetY: 0,
                                };
                            }
                        }

                        const mousePosition = clientToFlowPosition(
                            e.clientX,
                            e.clientY,
                            transformMatrixRef.current || {
                                scale: 1,
                                offsetX: 0,
                                offsetY: 0,
                            }
                        );

                        const adjusted = {
                            x: mousePosition.x + dragOffsetRef.current.x,
                            y: mousePosition.y + dragOffsetRef.current.y,
                        };

                        const pathD = pathStringRef.current;
                        if (pathD) {
                            const proj = projectPointOntoPath(pathD, adjusted);
                            if (type === "condition")
                                tempConditionTRef.current = proj.t;
                            if (type === "delay")
                                tempDelayTRef.current = proj.t;
                            if (type === "parameter")
                                tempParamTRef.current = proj.t;
                            const dx = adjusted.x - proj.x;
                            const dy = adjusted.y - proj.y;
                            const len = Math.hypot(dx, dy);
                            const maxOffset = 30;
                            const s =
                                len > maxOffset && len > 0
                                    ? maxOffset / len
                                    : 1;
                            setTempPosition({
                                x: proj.x + dx * s,
                                y: proj.y + dy * s,
                            });
                        } else {
                            const anchor =
                                (type === "condition" &&
                                    anchorRef.current.condition) ||
                                (type === "delay" && anchorRef.current.delay) ||
                                (type === "parameter" &&
                                    anchorRef.current.parameter);
                            if (anchor) {
                                const dx = adjusted.x - anchor.x;
                                const dy = adjusted.y - anchor.y;
                                const len = Math.hypot(dx, dy);
                                const maxOffset = 30;
                                const scale =
                                    len > maxOffset && len > 0
                                        ? maxOffset / len
                                        : 1;
                                setTempPosition({
                                    x: anchor.x + dx * scale,
                                    y: anchor.y + dy * scale,
                                });
                            } else {
                                setTempPosition(adjusted);
                            }
                        }
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
                    const anchor =
                        (type === "condition" && anchorRef.current.condition) ||
                        (type === "delay" && anchorRef.current.delay) ||
                        (type === "parameter" && anchorRef.current.parameter);

                    const pathD = pathStringRef.current;
                    let finalAnchor = anchor;
                    if (pathD) {
                        let t: number | null = null;
                        if (type === "condition") t = tempConditionTRef.current;
                        if (type === "delay") t = tempDelayTRef.current;
                        if (type === "parameter") t = tempParamTRef.current;
                        if (t != null) {
                            const pt = getPointAndAngleOnPath(
                                pathD,
                                t,
                                sourceX,
                                sourceY,
                                targetX,
                                targetY
                            );
                            finalAnchor = { x: pt.x, y: pt.y };
                        }
                    }

                    if (!finalAnchor) {
                        const centerX = (sourceX + targetX) / 2;
                        const centerY = (sourceY + targetY) / 2;
                        finalAnchor = { x: centerX, y: centerY };
                    }

                    let offset = {
                        x: tempPosition.x - finalAnchor.x,
                        y: tempPosition.y - finalAnchor.y,
                    };
                    const len = Math.hypot(offset.x, offset.y);
                    const maxOffset = 30;
                    if (len > maxOffset && len > 0) {
                        const s = maxOffset / len;
                        offset = { x: offset.x * s, y: offset.y * s };
                    }

                    const offsetKey =
                        `${type}LabelOffset` as keyof EventGraphEdgeData;
                    const positionKey =
                        `${type}Position` as keyof EventGraphEdgeData;
                    const nextData: any = { ...data, [offsetKey]: offset };
                    const tVal =
                        type === "condition"
                            ? tempConditionTRef.current
                            : type === "delay"
                            ? tempDelayTRef.current
                            : tempParamTRef.current;
                    if (tVal != null) nextData[positionKey] = tVal;
                    const command = commandController.createUpdateEdgeCommand(
                        id,
                        {
                            data: nextData,
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
                    pathStringRef.current = edgePath;
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

                    const liveCondition =
                        isConditionDragging && tempConditionTRef.current != null
                            ? getPointAndAngleOnPath(
                                  edgePath,
                                  tempConditionTRef.current,
                                  sourceX,
                                  sourceY,
                                  targetX,
                                  targetY
                              )
                            : {
                                  x: conditionPoint.x,
                                  y: conditionPoint.y,
                                  angle: conditionAngle,
                              };
                    const liveDelay =
                        isDelayDragging && tempDelayTRef.current != null
                            ? getPointAndAngleOnPath(
                                  edgePath,
                                  tempDelayTRef.current,
                                  sourceX,
                                  sourceY,
                                  targetX,
                                  targetY
                              )
                            : {
                                  x: delayPoint.x,
                                  y: delayPoint.y,
                                  angle: delayAngle,
                              };
                    const liveParam =
                        isParamDragging && tempParamTRef.current != null
                            ? getPointAndAngleOnPath(
                                  edgePath,
                                  tempParamTRef.current,
                                  sourceX,
                                  sourceY,
                                  targetX,
                                  targetY
                              )
                            : {
                                  x: paramPoint.x,
                                  y: paramPoint.y,
                                  angle: paramAngle,
                              };

                    anchorRef.current.condition = {
                        x: liveCondition.x,
                        y: liveCondition.y,
                    };
                    anchorRef.current.delay = {
                        x: liveDelay.x,
                        y: liveDelay.y,
                    };
                    anchorRef.current.parameter = {
                        x: liveParam.x,
                        y: liveParam.y,
                    };

                    const defaultConditionOffset = { x: 0, y: -40 };
                    const defaultDelayOffset = { x: 0, y: -30 };
                    const defaultParamOffset = { x: 0, y: -50 };

                    const conditionLabelOffset =
                        isConditionDragging && tempConditionPosition
                            ? {
                                  x: tempConditionPosition.x - liveCondition.x,
                                  y: tempConditionPosition.y - liveCondition.y,
                              }
                            : data?.conditionLabelOffset ||
                              defaultConditionOffset;

                    const delayLabelOffset =
                        isDelayDragging && tempDelayPosition
                            ? {
                                  x: tempDelayPosition.x - liveDelay.x,
                                  y: tempDelayPosition.y - liveDelay.y,
                              }
                            : data?.delayLabelOffset || defaultDelayOffset;

                    const paramLabelOffset =
                        isParamDragging && tempParamPosition
                            ? {
                                  x: tempParamPosition.x - liveParam.x,
                                  y: tempParamPosition.y - liveParam.y,
                              }
                            : data?.parameterLabelOffset || defaultParamOffset;

                    const conditionLabelX =
                        liveCondition.x + conditionLabelOffset.x;
                    const conditionLabelY =
                        liveCondition.y + conditionLabelOffset.y;
                    const delayLabelX = liveDelay.x + delayLabelOffset.x;
                    const delayLabelY = liveDelay.y + delayLabelOffset.y;
                    const paramLabelX = liveParam.x + paramLabelOffset.x;
                    const paramLabelY = liveParam.y + paramLabelOffset.y;

                    const allX = [];
                    const allY = [];

                    if (hasCondition) {
                        allX.push(liveCondition.x, conditionLabelX);
                        allY.push(liveCondition.y, conditionLabelY);
                    }
                    if (hasDelay) {
                        allX.push(liveDelay.x, delayLabelX);
                        allY.push(liveDelay.y, delayLabelY);
                    }
                    if (hasParameter) {
                        allX.push(liveParam.x, paramLabelX);
                        allY.push(liveParam.y, paramLabelY);
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
                                                liveCondition.x - minX
                                            }, ${
                                                liveCondition.y - minY
                                            }) rotate(${liveCondition.angle})`}
                                        />
                                        <line
                                            x1={liveCondition.x - minX}
                                            y1={liveCondition.y - minY}
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
                                                liveDelay.x - minX
                                            }, ${liveDelay.y - minY}) rotate(${
                                                liveDelay.angle
                                            })`}
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
                                            x1={liveDelay.x - minX}
                                            y1={liveDelay.y - minY}
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
                                        x1={liveParam.x - minX}
                                        y1={liveParam.y - minY}
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
                                    ref={conditionLabelRef}
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
                                                ({data?.condition || "True"})
                                            </span>
                                        ) : (
                                            <ReactKatex>
                                                {`[${
                                                    data?.condition || "True"
                                                }]`}
                                            </ReactKatex>
                                        )}
                                    </div>
                                </div>
                            )}

                            {hasDelay && (
                                <div
                                    ref={delayLabelRef}
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
                                    ref={paramLabelRef}
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
    ...getDefaultBaseEdgeData(),
    condition: "True",
    delay: undefined,
    parameter: undefined,
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
