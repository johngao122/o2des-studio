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
    BaseEdge,
    EdgeLabelRenderer,
    getStraightPath,
    getBezierPath,
    Position,
    useReactFlow,
} from "reactflow";
import { CommandController } from "@/controllers/CommandController";
import { parseTransformMatrix, throttle, snapToGrid } from "@/lib/utils/math";
import { absoluteToFlowPosition } from "@/lib/utils/coordinates";
import {
    calculateDefaultControlPoints,
    simplifyControlPoints,
    createRoundedPath,
} from "@/lib/utils/edge";
import { OrthogonalRoutingEngine } from "@/lib/routing/OrthogonalRoutingEngine";
import { HandleSelectionService } from "@/lib/routing/HandleSelectionService";
import { routingFeedbackSystem } from "@/lib/routing/RoutingFeedbackSystem";
import { getAllNodeHandles, getHandleInfoById } from "@/lib/utils/nodeHandles";
import { useStore } from "@/store";
import {
    HandleInfo,
    NodeInfo,
    OrthogonalPath,
    RoutingMetrics,
} from "@/lib/routing/types";
import {
    segmentDragHandler,
    EdgeSegment,
    SegmentDragState,
    SegmentDragConstraints,
} from "@/services/SegmentDragHandler";
import { orthogonalWaypointManager } from "@/services/OrthogonalWaypointManager";
import { pathCalculator } from "@/services/PathCalculator";
import {
    orthogonalConstraintEngine,
    MovementConstraint,
} from "@/services/OrthogonalConstraintEngine";

const BEZ_T_LEFT = 1 / 3;
const BEZ_T_CENTER = 0.5;
const BEZ_T_RIGHT = 2 / 3;

function bezierPointAtT(
    s: { x: number; y: number },
    c1: { x: number; y: number },
    c3: { x: number; y: number },
    e: { x: number; y: number },
    t: number
) {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return {
        x: a * s.x + b * c1.x + c * c3.x + d * e.x,
        y: a * s.y + b * c1.y + c * c3.y + d * e.y,
    };
}

function solveC1FromOnCurvePoint(
    p: { x: number; y: number },
    s: { x: number; y: number },
    c3: { x: number; y: number },
    e: { x: number; y: number },
    t: number
) {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return {
        x: (p.x - a * s.x - c * c3.x - d * e.x) / b,
        y: (p.y - a * s.y - c * c3.y - d * e.y) / b,
    };
}

function solveC3FromOnCurvePoint(
    p: { x: number; y: number },
    s: { x: number; y: number },
    c1: { x: number; y: number },
    e: { x: number; y: number },
    t: number
) {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return {
        x: (p.x - a * s.x - b * c1.x - d * e.x) / c,
        y: (p.y - a * s.y - b * c1.y - d * e.y) / c,
    };
}

const commandController = CommandController.getInstance();
const orthogonalRoutingEngine = new OrthogonalRoutingEngine();
const handleSelectionService = new HandleSelectionService();

export type EdgeTypeOption = "straight" | "bezier" | "rounded" | "orthogonal";

export type RoutingType = "orthogonal" | "straight" | "bezier";

export const isValidRoutingType = (value: any): value is RoutingType => {
    return (
        typeof value === "string" &&
        ["orthogonal", "straight", "bezier"].includes(value)
    );
};

export interface BaseEdgeData {
    edgeType?: EdgeTypeOption;
    controlPoints?: { x: number; y: number }[];
    isDependency?: boolean;

    routingType?: "horizontal-first" | "vertical-first";
    routingMetrics?: RoutingMetrics;
    selectedHandles?: {
        source: HandleInfo;
        target: HandleInfo;
    };
    useOrthogonalRouting?: boolean;
    edgeRoutingType?: RoutingType;
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
        ...props
    }: BaseEdgeProps<T>) => {
        const [isDragging, setIsDragging] = useState<number | null>(null);
        const reactFlowInstance = useReactFlow();
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

        const [isSegmentDragging, setIsSegmentDragging] = useState<
            string | null
        >(null);
        const [segmentDragState, setSegmentDragState] =
            useState<SegmentDragState | null>(null);
        const [tempSegmentPath, setTempSegmentPath] = useState<string | null>(
            null
        );
        const [tempSegments, setTempSegments] = useState<EdgeSegment[] | null>(
            null
        );
        const [currentSegments, setCurrentSegments] = useState<EdgeSegment[]>(
            []
        );

        const flowPaneRef = useRef<Element | null>(null);
        const transformMatrixRef = useRef<ReturnType<
            typeof parseTransformMatrix
        > | null>(null);
        const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
        const controlPointStartRef = useRef<{ x: number; y: number } | null>(
            null
        );
        const bezierDragKindRef = useRef<"left" | "center" | "right" | null>(
            null
        );
        const CONTROL_POINT_GRID = 10;

        const edgeStyle = {
            strokeWidth: selected ? 3 : 2,
            stroke: selected ? "#3b82f6" : "#555",
            strokeDasharray: data?.isDependency ? "5,5" : "none",
            ...style,
        };

        const getMouseFlowPosition = useCallback(
            (e: MouseEvent) => {
                try {
                    const pos = reactFlowInstance.screenToFlowPosition({
                        x: e.clientX,
                        y: e.clientY,
                    });
                    return { x: pos.x, y: pos.y };
                } catch {
                    const rfRoot = document.querySelector(
                        ".react-flow"
                    ) as HTMLElement | null;
                    if (!rfRoot) return { x: 0, y: 0 };
                    const rect = rfRoot.getBoundingClientRect();
                    const viewport = reactFlowInstance.getViewport();
                    const pos = absoluteToFlowPosition(
                        { x: e.clientX, y: e.clientY },
                        viewport,
                        rect
                    );
                    return { x: pos.x, y: pos.y };
                }
            },
            [reactFlowInstance]
        );

        const getEffectiveRoutingType = (): RoutingType => {
            if (data?.edgeRoutingType) {
                return data.edgeRoutingType;
            }

            if (data?.useOrthogonalRouting === false) {
                return "straight";
            }

            return "orthogonal";
        };

        const effectiveRoutingType = getEffectiveRoutingType();
        const useOrthogonalRouting = effectiveRoutingType === "orthogonal";

        const edgeTypeRaw = data?.edgeType || "straight";
        const edgeType: "straight" | "rounded" =
            edgeTypeRaw === "rounded" || edgeTypeRaw === "bezier"
                ? "rounded"
                : "straight";

        const edges = useStore((state) => state.edges);
        const currentEdge = edges.find((edge) => edge.id === id);
        const sourceHandle = currentEdge?.sourceHandle;
        const targetHandle = currentEdge?.targetHandle;

        const nodes = useStore((state) => state.nodes);

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

        const hasInitializedControlPoints = useRef(new Set<string>());

        useEffect(() => {
            if (effectiveRoutingType !== "bezier") return;

            if (
                !hasCustomControlPoints &&
                id &&
                !hasInitializedControlPoints.current.has(id)
            ) {
                hasInitializedControlPoints.current.add(id);
                const defaultControlPointsArray = [
                    defaultControlPoints.cp1,
                    defaultControlPoints.cp2,
                    defaultControlPoints.cp3,
                ];

                const currentPoints = data?.controlPoints;
                const needsUpdate =
                    !currentPoints ||
                    currentPoints.length !== defaultControlPointsArray.length ||
                    !currentPoints.every(
                        (cp, i) =>
                            cp.x === defaultControlPointsArray[i].x &&
                            cp.y === defaultControlPointsArray[i].y
                    );

                if (needsUpdate) {
                    const command = commandController.createUpdateEdgeCommand(
                        id,
                        {
                            data: {
                                ...data,
                                controlPoints: defaultControlPointsArray,
                            },
                        }
                    );
                    commandController.execute(command);
                }
            }
        }, [effectiveRoutingType, hasCustomControlPoints, id]);

        useEffect(() => {
            if (effectiveRoutingType !== "bezier") return;
            const cps = data?.controlPoints || [];
            if (cps.length !== 3) {
                const next = [
                    cps[0] || defaultControlPoints.cp1,
                    cps[1] || defaultControlPoints.cp2,
                    cps[2] || defaultControlPoints.cp3,
                ];
                const command = commandController.createUpdateEdgeCommand(id, {
                    data: { ...data, controlPoints: next },
                });
                commandController.execute(command);
            }
        }, [
            effectiveRoutingType,
            id,
            data,
            defaultControlPoints.cp1,
            defaultControlPoints.cp2,
            defaultControlPoints.cp3,
        ]);

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

        const calculateOrthogonalPath = useCallback((): {
            path: string;
            controlPoints: { x: number; y: number }[];
        } | null => {
            if (!useOrthogonalRouting) {
                return null;
            }

            try {
                const dx = Math.abs(targetX - sourceX);
                const dy = Math.abs(targetY - sourceY);
                let preferredRouting: "horizontal-first" | "vertical-first";
                if (dx > dy) {
                    preferredRouting = "horizontal-first";
                } else if (dy > dx) {
                    preferredRouting = "vertical-first";
                } else {
                    preferredRouting = "horizontal-first";
                }

                const orthogonalPath =
                    orthogonalRoutingEngine.calculateOrthogonalPathFromEdgeCoordinates(
                        sourceX,
                        sourceY,
                        targetX,
                        targetY,
                        sourcePosition,
                        targetPosition,
                        { preferredRouting }
                    );

                const routingControlPoints =
                    orthogonalRoutingEngine.generateControlPoints(
                        orthogonalPath
                    );

                const componentControlPoints = routingControlPoints.map(
                    (cp) => ({ x: cp.x, y: cp.y })
                );

                const pathSegments: string[] = [];
                if (orthogonalPath.segments.length > 0) {
                    const firstSegment = orthogonalPath.segments[0];
                    pathSegments.push(
                        `M ${firstSegment.start.x} ${firstSegment.start.y}`
                    );

                    for (const segment of orthogonalPath.segments) {
                        pathSegments.push(
                            `L ${segment.end.x} ${segment.end.y}`
                        );
                    }
                }

                const svgPath = pathSegments.join(" ");

                console.info("[EdgeRender] Routing selection", {
                    preferredRouting,
                    selectedRouting: orthogonalPath.routingType,
                    pathLength: orthogonalPath.totalLength,
                    sourceCoords: { x: sourceX, y: sourceY },
                    targetCoords: { x: targetX, y: targetY },
                });

                return {
                    path: svgPath,
                    controlPoints: componentControlPoints,
                };
            } catch (error) {
                console.error(
                    "[EdgeRender] Error calculating orthogonal path:",
                    error
                );
                return null;
            }
        }, [
            effectiveRoutingType,
            useOrthogonalRouting,
            sourceX,
            sourceY,
            targetX,
            targetY,
            sourcePosition,
            targetPosition,
        ]);

        let edgePath: string = "";
        let labelX: number = (sourceX + targetX) / 2;
        let labelY: number = (sourceY + targetY) / 2;
        let orthogonalResult: {
            path: string;
            controlPoints: { x: number; y: number }[];
        } | null = null;

        switch (effectiveRoutingType) {
            case "orthogonal":
                orthogonalResult = calculateOrthogonalPath();

                if (orthogonalResult) {
                    const orthogonalControlPoints =
                        orthogonalResult.controlPoints;

                    if (edgeType === "rounded") {
                        const sourcePoint = { x: sourceX, y: sourceY };
                        const targetPoint = { x: targetX, y: targetY };
                        const rounded = pathCalculator.calculatePath(
                            sourcePoint,
                            targetPoint,
                            orthogonalControlPoints,
                            { edgeType: "rounded", cornerRadius: 8 }
                        );
                        edgePath = rounded.svgPath;
                    } else {
                        edgePath = orthogonalResult.path;
                    }

                    if (orthogonalControlPoints.length > 0) {
                        const midIndex = Math.floor(
                            orthogonalControlPoints.length / 2
                        );
                        labelX = orthogonalControlPoints[midIndex].x;
                        labelY = orthogonalControlPoints[midIndex].y;
                    }
                }

                if (
                    currentControlPoints &&
                    currentControlPoints.length > 0 &&
                    !tempSegmentPath
                ) {
                    const sourcePoint = { x: sourceX, y: sourceY };
                    const targetPoint = { x: targetX, y: targetY };
                    const result = pathCalculator.calculatePath(
                        sourcePoint,
                        targetPoint,
                        currentControlPoints,
                        { edgeType: "orthogonal" }
                    );
                    edgePath = result.svgPath;
                }
                break;

            case "bezier":
                {
                    const cp1Render = controlPoint1 || defaultControlPoints.cp1;
                    const cp3Render = controlPoint3 || defaultControlPoints.cp3;

                    let c1 = cp1Render;
                    let c3 = cp3Render;
                    if (isCenterDragging && tempCenterPosition) {
                        c1 = {
                            x:
                                sourceX +
                                (tempCenterPosition.x - sourceX) * 0.33,
                            y:
                                sourceY +
                                (tempCenterPosition.y - sourceY) * 0.33,
                        };
                        c3 = {
                            x:
                                tempCenterPosition.x +
                                (targetX - tempCenterPosition.x) * 0.33,
                            y:
                                tempCenterPosition.y +
                                (targetY - tempCenterPosition.y) * 0.33,
                        };
                    }

                    const hasBezierControls =
                        (data?.controlPoints &&
                            data.controlPoints.length >= 3) ||
                        (tempControlPoints && tempControlPoints.length >= 3) ||
                        isCenterDragging;

                    if (
                        effectiveRoutingType === "bezier" &&
                        tempControlPoints &&
                        tempControlPoints.length >= 3
                    ) {
                        c1 = tempControlPoints[0] || c1;
                        c3 = tempControlPoints[2] || c3;
                    }

                    if (hasBezierControls) {
                        edgePath = `M ${sourceX} ${sourceY} C ${c1.x} ${c1.y} ${c3.x} ${c3.y} ${targetX} ${targetY}`;

                        const t = 0.5;
                        const oneMinusT = 1 - t;
                        const bx =
                            oneMinusT * oneMinusT * oneMinusT * sourceX +
                            3 * oneMinusT * oneMinusT * t * c1.x +
                            3 * oneMinusT * t * t * c3.x +
                            t * t * t * targetX;
                        const by =
                            oneMinusT * oneMinusT * oneMinusT * sourceY +
                            3 * oneMinusT * oneMinusT * t * c1.y +
                            3 * oneMinusT * t * t * c3.y +
                            t * t * t * targetY;
                        labelX = bx;
                        labelY = by;
                    } else {
                        const [bezierPath, bezierLabelX, bezierLabelY] =
                            getBezierPath({
                                sourceX,
                                sourceY,
                                sourcePosition,
                                targetX,
                                targetY,
                                targetPosition,
                            });
                        edgePath = bezierPath;
                        labelX = bezierLabelX;
                        labelY = bezierLabelY;
                    }
                }
                break;

            case "straight":
            default:
                if (isCenterDragging && tempCenterPosition) {
                    edgePath = `M ${sourceX} ${sourceY} L ${tempCenterPosition.x} ${tempCenterPosition.y} L ${targetX} ${targetY}`;
                } else if (
                    hasCustomControlPoints &&
                    !isSimpleMode &&
                    !isCenterDragging
                ) {
                    const controlPoints =
                        isDragging !== null && tempControlPoints.length > 0
                            ? tempControlPoints
                            : data?.controlPoints || [
                                  defaultControlPoints.cp1,
                                  defaultControlPoints.cp2,
                                  defaultControlPoints.cp3,
                              ];
                    const pathSegments = [];

                    const [firstSegment] = getStraightPath({
                        sourceX,
                        sourceY,
                        targetX:
                            controlPoints[0]?.x || defaultControlPoints.cp1.x,
                        targetY:
                            controlPoints[0]?.y || defaultControlPoints.cp1.y,
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
                } else {
                    const [straightPath] = getStraightPath({
                        sourceX,
                        sourceY,
                        targetX,
                        targetY,
                    });
                    edgePath = straightPath;
                }
                break;
        }

        if (!edgePath) {
            const [fallbackPath] = getStraightPath({
                sourceX,
                sourceY,
                targetX,
                targetY,
            });
            edgePath = fallbackPath;
        }

        if (tempSegmentPath && isSegmentDragging) {
            edgePath = tempSegmentPath;
        }

        useEffect(() => {
            if (!useOrthogonalRouting) {
                setCurrentSegments([]);
                return;
            }

            const sourcePoint = { x: sourceX, y: sourceY };
            const targetPoint = { x: targetX, y: targetY };

            const controlPointsToUse =
                currentControlPoints && currentControlPoints.length > 0
                    ? currentControlPoints
                    : orthogonalResult?.controlPoints || [];

            if (controlPointsToUse.length > 0 || !orthogonalResult) {
                const newSegments = segmentDragHandler.calculateSegments(
                    controlPointsToUse,
                    sourcePoint,
                    targetPoint
                );

                setCurrentSegments((prevSegments) => {
                    if (
                        JSON.stringify(prevSegments) !==
                        JSON.stringify(newSegments)
                    ) {
                        return newSegments;
                    }
                    return prevSegments;
                });
            } else {
                setCurrentSegments([]);
            }
        }, [
            effectiveRoutingType,
            id,
            sourceX,
            sourceY,
            targetX,
            targetY,
            JSON.stringify(currentControlPoints),
            JSON.stringify(orthogonalResult?.controlPoints || []),
        ]);

        useEffect(() => {
            if (!useOrthogonalRouting) return;
            if (!currentControlPoints || currentControlPoints.length === 0)
                return;
            if (isSegmentDragging || isCenterDragging || isDragging !== null)
                return;

            const validation =
                orthogonalConstraintEngine.validateOrthogonalPath(
                    currentControlPoints,
                    { x: sourceX, y: sourceY },
                    { x: targetX, y: targetY }
                );

            if (!validation.isOrthogonal) {
                const reroute = calculateOrthogonalPath();
                const newControlPoints =
                    reroute?.controlPoints ||
                    orthogonalConstraintEngine.enforceOrthogonalConstraints(
                        currentControlPoints,
                        { x: sourceX, y: sourceY },
                        { x: targetX, y: targetY }
                    );

                if (
                    JSON.stringify(newControlPoints) !==
                    JSON.stringify(currentControlPoints)
                ) {
                    const updatedData = {
                        ...data,
                        controlPoints: newControlPoints,
                    } as any;
                    const command = commandController.createUpdateEdgeCommand(
                        id,
                        { data: updatedData }
                    );
                    commandController.execute(command);
                }
            }
        }, [
            effectiveRoutingType,
            sourceX,
            sourceY,
            targetX,
            targetY,
            JSON.stringify(currentControlPoints),
            isSegmentDragging,
            isCenterDragging,
            isDragging,
        ]);

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

                const mousePosition = getMouseFlowPosition(e);

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

                    const mousePosition = getMouseFlowPosition(e);

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
                const controlPointsToSave =
                    effectiveRoutingType === "bezier"
                        ? initialControlPoints
                        : simplifyControlPoints(
                              initialControlPoints,
                              sourceX,
                              sourceY,
                              targetX,
                              targetY
                          );

                const updatedData = {
                    ...data,
                    controlPoints: controlPointsToSave,
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

                    if (effectiveRoutingType === "bezier") {
                        const cp1 = controlPoint1 || defaultControlPoints.cp1;
                        const cp3 = controlPoint3 || defaultControlPoints.cp3;
                        const s = { x: sourceX, y: sourceY };
                        const ept = { x: targetX, y: targetY };
                        const t =
                            controlPointIndex === 1
                                ? BEZ_T_LEFT
                                : controlPointIndex === 2
                                ? BEZ_T_CENTER
                                : BEZ_T_RIGHT;
                        const onCurve = bezierPointAtT(s, cp1, cp3, ept, t);

                        controlPointStartRef.current = onCurve;
                        bezierDragKindRef.current =
                            controlPointIndex === 1
                                ? "left"
                                : controlPointIndex === 2
                                ? "center"
                                : "right";

                        const mousePosition = getMouseFlowPosition(e);
                        const offsetX = onCurve.x - mousePosition.x;
                        const offsetY = onCurve.y - mousePosition.y;
                        dragOffsetRef.current = { x: offsetX, y: offsetY };
                        setIsDragging(controlPointIndex);
                        document.body.style.cursor = "grabbing";
                    } else {
                        const currentControlPoints = data?.controlPoints || [];
                        const currentControlPoint = currentControlPoints[
                            controlPointIndex - 1
                        ] || { x: centerX, y: centerY };
                        controlPointStartRef.current = currentControlPoint;
                        const mousePosition = getMouseFlowPosition(e);
                        const offsetX = currentControlPoint.x - mousePosition.x;
                        const offsetY = currentControlPoint.y - mousePosition.y;
                        dragOffsetRef.current = { x: offsetX, y: offsetY };
                        setIsDragging(controlPointIndex);
                        document.body.style.cursor = "grabbing";
                    }
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

                    const mousePosition = getMouseFlowPosition(e);

                    const rawPosition = {
                        x: mousePosition.x + dragOffsetRef.current.x,
                        y: mousePosition.y + dragOffsetRef.current.y,
                    };

                    const start = controlPointStartRef.current || rawPosition;
                    const steppedPosition = {
                        x:
                            start.x +
                            Math.round(
                                (rawPosition.x - start.x) / CONTROL_POINT_GRID
                            ) *
                                CONTROL_POINT_GRID,
                        y:
                            start.y +
                            Math.round(
                                (rawPosition.y - start.y) / CONTROL_POINT_GRID
                            ) *
                                CONTROL_POINT_GRID,
                    };

                    setTempControlPoints((prev) => {
                        if (effectiveRoutingType === "bezier") {
                            const base = (
                                prev.length
                                    ? prev
                                    : data?.controlPoints || [
                                          defaultControlPoints.cp1,
                                          defaultControlPoints.cp2,
                                          defaultControlPoints.cp3,
                                      ]
                            ).slice(0, 3);
                            while (base.length < 3)
                                base.push({ x: centerX, y: centerY });

                            const s = { x: sourceX, y: sourceY };
                            const ept = { x: targetX, y: targetY };

                            const kind = bezierDragKindRef.current;
                            if (kind === "center" || isDragging === 2) {
                                const center = steppedPosition;
                                const derivedCp1 = {
                                    x: sourceX + (center.x - sourceX) * 0.33,
                                    y: sourceY + (center.y - sourceY) * 0.33,
                                };
                                const derivedCp3 = {
                                    x: center.x + (targetX - center.x) * 0.33,
                                    y: center.y + (targetY - center.y) * 0.33,
                                };
                                base[0] = derivedCp1;
                                base[1] = center;
                                base[2] = derivedCp3;
                                return base;
                            }

                            if (kind === "left" || isDragging === 1) {
                                const c3 = base[2] || defaultControlPoints.cp3;
                                const c1 = solveC1FromOnCurvePoint(
                                    steppedPosition,
                                    s,
                                    c3,
                                    ept,
                                    BEZ_T_LEFT
                                );
                                base[0] = c1;
                                return base;
                            }

                            if (kind === "right" || isDragging === 3) {
                                const c1 = base[0] || defaultControlPoints.cp1;
                                const c3 = solveC3FromOnCurvePoint(
                                    steppedPosition,
                                    s,
                                    c1,
                                    ept,
                                    BEZ_T_RIGHT
                                );
                                base[2] = c3;
                                return base;
                            }

                            return base;
                        }

                        const currentControlPoints = data?.controlPoints || [];
                        const newControlPoints = [...currentControlPoints];
                        while (newControlPoints.length < isDragging) {
                            newControlPoints.push({ x: centerX, y: centerY });
                        }
                        newControlPoints[isDragging - 1] = steppedPosition;
                        return newControlPoints;
                    });
                }
            }, 16),
            [
                isDragging,
                data?.controlPoints,
                centerX,
                centerY,
                effectiveRoutingType,
                sourceX,
                sourceY,
                targetX,
                targetY,
            ]
        );

        const handleDragEnd = useCallback(() => {
            if (isDragging !== null && tempControlPoints[isDragging - 1]) {
                if (
                    effectiveRoutingType === ("bezier" as RoutingType) ||
                    effectiveRoutingType === "bezier"
                ) {
                    let next = tempControlPoints.slice(0, 3);
                    while (next.length < 3)
                        next.push({ x: centerX, y: centerY });
                    const updatedData = { ...data, controlPoints: next };
                    const command = commandController.createUpdateEdgeCommand(
                        id,
                        { data: updatedData }
                    );
                    commandController.execute(command);
                    setIsDragging(null);
                    setTempControlPoints([]);
                    dragOffsetRef.current = null;
                    document.body.style.cursor = "";
                    controlPointStartRef.current = null;
                    bezierDragKindRef.current = null;
                    return;
                }

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
            controlPointStartRef.current = null;
            bezierDragKindRef.current = null;
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

        const handleSegmentDragStart =
            (segmentId: string) => (e: MouseEvent) => {
                if (!useOrthogonalRouting) {
                    return;
                }

                e.stopPropagation();
                e.preventDefault();

                const segment = currentSegments.find((s) => s.id === segmentId);
                if (!segment) return;

                flowPaneRef.current = document.querySelector(
                    ".react-flow__viewport"
                );
                if (!flowPaneRef.current) return;

                const transformStyle = window.getComputedStyle(
                    flowPaneRef.current
                ).transform;
                transformMatrixRef.current =
                    parseTransformMatrix(transformStyle);

                const mousePosition = getMouseFlowPosition(e);

                const dragState = segmentDragHandler.startSegmentDrag(
                    segment,
                    mousePosition
                );
                setIsSegmentDragging(segmentId);
                setSegmentDragState(dragState);
                document.body.style.cursor = "grabbing";
            };

        const handleSegmentDrag = useCallback(
            throttle((e: MouseEvent) => {
                if (!isSegmentDragging || !segmentDragState) return;

                e.preventDefault();
                e.stopPropagation();

                if (!flowPaneRef.current) {
                    flowPaneRef.current = document.querySelector(
                        ".react-flow__viewport"
                    );
                }

                if (!transformMatrixRef.current && flowPaneRef.current) {
                    const transformStyle = window.getComputedStyle(
                        flowPaneRef.current
                    ).transform;
                    transformMatrixRef.current =
                        parseTransformMatrix(transformStyle);
                }

                const mousePosition = getMouseFlowPosition(e);

                const segment = currentSegments.find(
                    (s) => s.id === isSegmentDragging
                );
                if (!segment) return;

                const constraints: SegmentDragConstraints =
                    orthogonalConstraintEngine.calculateSegmentConstraints(
                        segment,
                        currentSegments,
                        { x: sourceX, y: sourceY },
                        { x: targetX, y: targetY }
                    );

                const updatedDragState = segmentDragHandler.updateSegmentDrag(
                    mousePosition,
                    segment,
                    constraints
                );

                if (updatedDragState) {
                    setSegmentDragState(updatedDragState);

                    const segmentArrayIndex = currentSegments.findIndex(
                        (s) => s.id === isSegmentDragging
                    );
                    const isFirstSegment = segmentArrayIndex === 0;
                    const isLastSegment =
                        segmentArrayIndex === currentSegments.length - 1;

                    const isConnectedToSource =
                        Math.abs(segment.start.x - sourceX) < 1 &&
                        Math.abs(segment.start.y - sourceY) < 1;
                    const isConnectedToTarget =
                        Math.abs(segment.end.x - targetX) < 1 &&
                        Math.abs(segment.end.y - targetY) < 1;
                    const isActuallyTerminal =
                        isConnectedToSource || isConnectedToTarget;

                    if (
                        (isFirstSegment || isLastSegment) &&
                        isActuallyTerminal
                    ) {
                        const analysisControlPoints =
                            pathCalculator.extractControlPointsFromSegments(
                                currentSegments
                            );
                        const waypointResult =
                            orthogonalWaypointManager.insertPreservationWaypoints(
                                segmentArrayIndex,
                                updatedDragState.constrainedPosition,
                                analysisControlPoints,
                                { x: sourceX, y: sourceY },
                                { x: targetX, y: targetY },
                                true
                            );

                        if (waypointResult.requiresInsertion) {
                            const enforcedPoints =
                                orthogonalConstraintEngine.enforceOrthogonalConstraints(
                                    waypointResult.newControlPoints,
                                    { x: sourceX, y: sourceY },
                                    { x: targetX, y: targetY }
                                );
                            const pathResult = pathCalculator.calculatePath(
                                { x: sourceX, y: sourceY },
                                { x: targetX, y: targetY },
                                enforcedPoints,
                                { edgeType, cornerRadius: 8 }
                            );
                            setTempSegmentPath(pathResult.svgPath);
                            setTempSegments(pathResult.segments);
                        } else {
                            const pathResult =
                                pathCalculator.updatePathAfterSegmentDrag(
                                    currentSegments,
                                    isSegmentDragging,
                                    updatedDragState.constrainedPosition,
                                    { edgeType, cornerRadius: 8 }
                                );
                            setTempSegments(pathResult.segments);
                            setTempSegmentPath(pathResult.svgPath);
                        }
                    } else {
                        const pathResult =
                            pathCalculator.updatePathAfterSegmentDrag(
                                currentSegments,
                                isSegmentDragging,
                                updatedDragState.constrainedPosition,
                                { edgeType, cornerRadius: 8 }
                            );
                        setTempSegments(pathResult.segments);
                        setTempSegmentPath(pathResult.svgPath);
                    }
                }
            }, 16),
            [
                isSegmentDragging,
                segmentDragState,
                currentSegments,
                sourceX,
                sourceY,
                targetX,
                targetY,
                edgeType,
            ]
        );

        const handleSegmentDragEnd = useCallback(() => {
            if (!isSegmentDragging || !segmentDragState) return;

            const segment = currentSegments.find(
                (s) => s.id === isSegmentDragging
            );
            if (!segment) return;

            const sourcePoint = { x: sourceX, y: sourceY };
            const targetPoint = { x: targetX, y: targetY };

            let analysisControlPoints: { x: number; y: number }[] =
                currentControlPoints || [];
            if (tempSegments && tempSegments.length > 0) {
                analysisControlPoints =
                    pathCalculator.extractControlPointsFromSegments(
                        tempSegments
                    );
            } else if (currentSegments && currentSegments.length > 0) {
                analysisControlPoints =
                    pathCalculator.extractControlPointsFromSegments(
                        currentSegments
                    );
            }

            const segmentArrayIndex = currentSegments.findIndex(
                (s) => s.id === isSegmentDragging
            );
            const maxIndex = Math.max(0, analysisControlPoints.length);
            const clampedIndex = Math.min(
                Math.max(0, segmentArrayIndex),
                maxIndex
            );

            const isFirstSegment = segmentArrayIndex === 0;
            const isLastSegment =
                segmentArrayIndex === currentSegments.length - 1;

            const isConnectedToSource =
                Math.abs(segment.start.x - sourceX) < 1 &&
                Math.abs(segment.start.y - sourceY) < 1;
            const isConnectedToTarget =
                Math.abs(segment.end.x - targetX) < 1 &&
                Math.abs(segment.end.y - targetY) < 1;
            const isActuallyTerminal =
                isConnectedToSource || isConnectedToTarget;

            if ((isFirstSegment || isLastSegment) && isActuallyTerminal) {
                const waypointResult =
                    orthogonalWaypointManager.insertPreservationWaypoints(
                        clampedIndex,
                        segmentDragState.constrainedPosition,
                        analysisControlPoints,
                        sourcePoint,
                        targetPoint
                    );

                if (waypointResult.requiresInsertion) {
                    const enforced =
                        orthogonalConstraintEngine.enforceOrthogonalConstraints(
                            waypointResult.newControlPoints,
                            sourcePoint,
                            targetPoint
                        );
                    const updatedData = {
                        ...data,
                        controlPoints: enforced,
                    };
                    const command = commandController.createUpdateEdgeCommand(
                        id,
                        { data: updatedData }
                    );
                    commandController.execute(command);

                    segmentDragHandler.endSegmentDrag();
                    setIsSegmentDragging(null);
                    setSegmentDragState(null);
                    setTempSegmentPath(null);
                    setTempSegments(null);
                    document.body.style.cursor = "";
                    return;
                }
            }

            const controlPointsForUpdate = analysisControlPoints;
            const segmentForUpdate = {
                ...segment,
                id: `segment-${clampedIndex}`,
            } as EdgeSegment;
            let updatedControlPoints =
                segmentDragHandler.calculateUpdatedControlPoints(
                    controlPointsForUpdate,
                    segmentForUpdate,
                    segmentDragState.constrainedPosition,
                    sourcePoint,
                    targetPoint
                );

            updatedControlPoints =
                orthogonalConstraintEngine.enforceOrthogonalConstraints(
                    updatedControlPoints,
                    sourcePoint,
                    targetPoint
                );
            const updatedData = {
                ...data,
                controlPoints: updatedControlPoints,
            };
            const command = commandController.createUpdateEdgeCommand(id, {
                data: updatedData,
            });
            commandController.execute(command);

            segmentDragHandler.endSegmentDrag();
            setIsSegmentDragging(null);
            setSegmentDragState(null);
            setTempSegmentPath(null);
            setTempSegments(null);
            document.body.style.cursor = "";
        }, [
            isSegmentDragging,
            segmentDragState,
            currentSegments,
            currentControlPoints,
            sourceX,
            sourceY,
            targetX,
            targetY,
            data,
            id,
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

        useEffect(() => {
            if (isSegmentDragging) {
                window.addEventListener("mousemove", handleSegmentDrag as any);
                window.addEventListener("mouseup", handleSegmentDragEnd);

                return () => {
                    window.removeEventListener(
                        "mousemove",
                        handleSegmentDrag as any
                    );
                    window.removeEventListener("mouseup", handleSegmentDragEnd);
                };
            }
        }, [isSegmentDragging, handleSegmentDrag, handleSegmentDragEnd]);

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
                        {isSimpleMode && !orthogonalResult ? (
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
                                {/* Control Points */}
                                {!useOrthogonalRouting &&
                                    (() => {
                                        if (effectiveRoutingType === "bezier") {
                                            const base = (
                                                data?.controlPoints || [
                                                    defaultControlPoints.cp1,
                                                    defaultControlPoints.cp2,
                                                    defaultControlPoints.cp3,
                                                ]
                                            ).slice(0, 3);
                                            while (base.length < 3)
                                                base.push({
                                                    x: centerX,
                                                    y: centerY,
                                                });

                                            const s = {
                                                x: sourceX,
                                                y: sourceY,
                                            };
                                            const ept = {
                                                x: targetX,
                                                y: targetY,
                                            };
                                            const cp1 = base[0];
                                            const cp3 = base[2];

                                            const positions = [
                                                { t: BEZ_T_LEFT, idx: 1 },
                                                { t: BEZ_T_CENTER, idx: 2 },
                                                { t: BEZ_T_RIGHT, idx: 3 },
                                            ];

                                            return positions.map(
                                                ({ t, idx }) => {
                                                    const c1Render =
                                                        (tempControlPoints &&
                                                            tempControlPoints.length >=
                                                                1 &&
                                                            tempControlPoints[0]) ||
                                                        cp1;
                                                    const c3Render =
                                                        (tempControlPoints &&
                                                            tempControlPoints.length >=
                                                                3 &&
                                                            tempControlPoints[2]) ||
                                                        cp3;
                                                    const onCurve =
                                                        bezierPointAtT(
                                                            s,
                                                            c1Render,
                                                            c3Render,
                                                            ept,
                                                            t
                                                        );

                                                    return (
                                                        <div
                                                            key={`bezier-handle-${idx}`}
                                                            style={{
                                                                position:
                                                                    "absolute",
                                                                transform: `translate(-50%, -50%) translate(${onCurve.x}px,${onCurve.y}px)`,
                                                                pointerEvents:
                                                                    "all",
                                                                cursor:
                                                                    isDragging ===
                                                                    idx
                                                                        ? "grabbing"
                                                                        : "grab",
                                                            }}
                                                            className="nodrag nopan"
                                                            onMouseDown={handleDragStart(
                                                                idx
                                                            )}
                                                        >
                                                            <div
                                                                className={`w-3 h-3 rounded-full border-2 ${
                                                                    isDragging ===
                                                                    idx
                                                                        ? "bg-blue-500 border-blue-600"
                                                                        : "bg-white border-blue-500"
                                                                } shadow-md hover:scale-110 transition-transform hover:ring-2 hover:ring-blue-300 hover:bg-blue-50`}
                                                            />
                                                        </div>
                                                    );
                                                }
                                            );
                                        }

                                        const base =
                                            orthogonalResult?.controlPoints ||
                                            data?.controlPoints ||
                                            [];
                                        return base.map((cp, i) => {
                                            const isTempIdx = i + 1;
                                            const showPoint =
                                                isDragging === isTempIdx &&
                                                tempControlPoints.length > i &&
                                                tempControlPoints[i]
                                                    ? tempControlPoints[i]
                                                    : cp;
                                            if (!showPoint) return null;
                                            return (
                                                <div
                                                    key={`control-point-${i}`}
                                                    style={{
                                                        position: "absolute",
                                                        transform: `translate(-50%, -50%) translate(${showPoint.x}px,${showPoint.y}px)`,
                                                        pointerEvents: "all",
                                                        cursor:
                                                            isDragging ===
                                                            isTempIdx
                                                                ? "grabbing"
                                                                : "grab",
                                                    }}
                                                    className="nodrag nopan"
                                                    onMouseDown={handleDragStart(
                                                        isTempIdx
                                                    )}
                                                >
                                                    <div
                                                        className={`w-3 h-3 rounded-full border-2 ${
                                                            isDragging ===
                                                            isTempIdx
                                                                ? "bg-blue-500 border-blue-600"
                                                                : "bg-white border-blue-500"
                                                        } shadow-md hover:scale-110 transition-transform hover:ring-2 hover:ring-blue-300 hover:bg-blue-50`}
                                                    />
                                                </div>
                                            );
                                        });
                                    })()}

                                {/* Segment Midpoint Handles for Orthogonal Edges */}
                                {useOrthogonalRouting &&
                                    (() => {
                                        const segmentsToRender =
                                            tempSegments || currentSegments;
                                        return segmentsToRender &&
                                            segmentsToRender.length > 0
                                            ? segmentsToRender
                                                  .filter(
                                                      (segment, idx, arr) => {
                                                          const firstId =
                                                              "segment-0";
                                                          const lastId = `segment-${
                                                              arr.length - 1
                                                          }`;

                                                          const isTerminal =
                                                              segment.id ===
                                                                  firstId ||
                                                              segment.id ===
                                                                  lastId;
                                                          const MIN_LEN = 40;
                                                          return (
                                                              !isTerminal ||
                                                              segment.length >=
                                                                  MIN_LEN
                                                          );
                                                      }
                                                  )
                                                  .map((segment) => (
                                                      <div
                                                          key={`segment-handle-${segment.id}`}
                                                          style={{
                                                              position:
                                                                  "absolute",
                                                              transform: `translate(-50%, -50%) translate(${segment.midpoint.x}px,${segment.midpoint.y}px)`,
                                                              pointerEvents:
                                                                  "all",
                                                              cursor:
                                                                  isSegmentDragging ===
                                                                  segment.id
                                                                      ? "grabbing"
                                                                      : segment.direction ===
                                                                        "horizontal"
                                                                      ? "ns-resize"
                                                                      : "ew-resize",
                                                          }}
                                                          className="nodrag nopan"
                                                          onMouseDown={handleSegmentDragStart(
                                                              segment.id
                                                          )}
                                                      >
                                                          <div
                                                              className={`w-3 h-3 rounded-full border-2 ${
                                                                  isSegmentDragging ===
                                                                  segment.id
                                                                      ? "bg-blue-500 border-blue-600"
                                                                      : "bg-white border-blue-500"
                                                              } shadow-md hover:scale-110 transition-transform hover:ring-2 hover:ring-blue-300 hover:bg-blue-50 opacity-90`}
                                                          />
                                                      </div>
                                                  ))
                                            : null;
                                    })()}
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
                        isSimpleMode: isSimpleMode && !orthogonalResult,
                        centerX,
                        centerY,
                        currentControlPoints:
                            orthogonalResult?.controlPoints ||
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
    useOrthogonalRouting: true,
    edgeRoutingType: "orthogonal",
    routingType: undefined,
    routingMetrics: undefined,
    selectedHandles: undefined,
});

BaseEdgeComponent.displayName = "BaseEdgeComponent";

export default BaseEdgeComponent;
