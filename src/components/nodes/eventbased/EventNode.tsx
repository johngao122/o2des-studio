"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import {
    Handle,
    Position,
    NodeProps,
    XYPosition,
    NodeResizer,
} from "reactflow";
import ReactKatex from "@pkasila/react-katex";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";
import { getEllipseHandlePositions } from "@/lib/utils/math";
import {
    getDynamicPaddingStyles,
    getNodeTypePaddingConfig,
    getContentAreaDimensions,
} from "@/lib/utils/nodeStyles";
import {
    getTypographyScale,
    getTypographyVariant,
    getVariantTypographyConfig,
} from "@/lib/utils/typography";
import { ResponsiveText } from "@/components/ui/ResponsiveText";

const commandController = CommandController.getInstance();

interface EventNodeData {
    stateUpdate: string;
    
    stateUpdatePosition?: string;
    width?: number;
    height?: number;
}

interface ExtendedNodeProps extends NodeProps<EventNodeData> {
    name?: string;
}

interface EventNodeComponent
    extends React.NamedExoticComponent<ExtendedNodeProps> {
    defaultData: EventNodeData;
    displayName?: string;
    getGraphType?: () => string;
}

const EventNode = memo(
    ({
        id,
        data = {} as EventNodeData,
        selected,
        isConnectable,
    }: ExtendedNodeProps) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editStateUpdate, setEditStateUpdate] = useState(
            data?.stateUpdate || ""
        );
        const [isHovered, setIsHovered] = useState(false);
        const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
        const nodeRef = useRef<HTMLDivElement>(null);
        const isMountedRef = useRef(true);

        useEffect(() => {
            isMountedRef.current = true;
            return () => {
                isMountedRef.current = false;

                if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                    hoverTimeoutRef.current = null;
                }
            };
        }, []);

        const storeNode = useStore((state) =>
            state.nodes.find((n: BaseNode) => n.id === id)
        );

        const nodeName = storeNode?.name || "Event Node";
        const storeData = storeNode?.data || {};
        const rawDimensions = {
            width: storeData?.width || 120,
            height: storeData?.height || 50,
        };

        const defaultData = EventNode.getDefaultData();
        const defaultRatio =
            (defaultData.height || 50) / (defaultData.width || 120);

        let constrainedWidth = rawDimensions.width;
        let constrainedHeight = rawDimensions.height;

        const currentRatio = constrainedHeight / constrainedWidth;

        if (currentRatio > defaultRatio) {
            constrainedHeight = constrainedWidth * defaultRatio;
        }

        constrainedWidth = Math.max(constrainedWidth, defaultData.width || 120);
        constrainedHeight = Math.max(
            constrainedHeight,
            defaultData.height || 50
        );

        const dimensions = {
            width: constrainedWidth,
            height: constrainedHeight,
        };

        const nodeWidth = dimensions.width;
        const nodeHeight = dimensions.height;

        const paddingConfig = getNodeTypePaddingConfig("event");
        const paddingStyles = getDynamicPaddingStyles(
            nodeWidth,
            nodeHeight,
            paddingConfig
        );
        const contentArea = getContentAreaDimensions(
            nodeWidth,
            nodeHeight,
            2,
            "event"
        );
        const variant = getTypographyVariant(nodeWidth);
        const typographyConfig = getVariantTypographyConfig(variant);
        const typography = getTypographyScale(
            nodeWidth,
            nodeHeight,
            typographyConfig
        );

        
        const [isDraggingBadge, setIsDraggingBadge] = useState(false);
        const [dragBadgePos, setDragBadgePos] = useState<{
            left: number;
            top: number;
        } | null>(null);
        const [draggedAnchor, setDraggedAnchor] = useState<string>("right");

        const getStateUpdateAnchor = useCallback(() => {
            return data?.stateUpdatePosition || "right";
        }, [data?.stateUpdatePosition]);

        const getBadgeOffset = useCallback(() => 12, []);

        const getAnchorCoordinates = useCallback(
            (anchor: string, width: number, height: number) => {
                const offset = getBadgeOffset();

                const positions: Record<
                    string,
                    { left: number; top: number; transform?: string }
                > = {
                    top: {
                        left: width / 2,
                        top: -offset,
                        transform: "translate(-50%, -100%)",
                    },
                    topRight: {
                        left: width + offset,
                        top: -offset,
                        transform: "translate(0%, -100%)",
                    },
                    right: {
                        left: width + offset,
                        top: height / 2,
                        transform: "translate(0%, -50%)",
                    },
                    bottomRight: {
                        left: width + offset,
                        top: height + offset,
                        transform: "translate(0%, 0%)",
                    },
                    bottom: {
                        left: width / 2,
                        top: height + offset,
                        transform: "translate(-50%, 0%)",
                    },
                    bottomLeft: {
                        left: -offset,
                        top: height + offset,
                        transform: "translate(-100%, 0%)",
                    },
                    left: {
                        left: -offset,
                        top: height / 2,
                        transform: "translate(-100%, -50%)",
                    },
                    topLeft: {
                        left: -offset,
                        top: -offset,
                        transform: "translate(-100%, -100%)",
                    },
                };
                return positions[anchor] || positions.right;
            },
            [getBadgeOffset]
        );

        const getAllAnchors = useCallback(
            () => [
                "top",
                "topRight",
                "right",
                "bottomRight",
                "bottom",
                "bottomLeft",
                "left",
                "topLeft",
            ],
            []
        );

        const startBadgeDrag = useCallback((e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setIsDraggingBadge(true);

            const rect = (
                nodeRef.current as HTMLDivElement
            ).getBoundingClientRect();
            setDragBadgePos({
                left: e.clientX - rect.left,
                top: e.clientY - rect.top,
            });
        }, []);

        const onBadgeDrag = useCallback(
            (e: MouseEvent) => {
                if (!isDraggingBadge || !nodeRef.current) return;
                const rect = nodeRef.current.getBoundingClientRect();
                const rawPos = {
                    left: e.clientX - rect.left,
                    top: e.clientY - rect.top,
                };

                
                const anchors = getAllAnchors();
                let bestAnchor = anchors[0];
                let bestDist = Number.POSITIVE_INFINITY;

                anchors.forEach((a) => {
                    const pos = getAnchorCoordinates(a, nodeWidth, nodeHeight);
                    const dx = pos.left - rawPos.left;
                    const dy = pos.top - rawPos.top;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < bestDist) {
                        bestDist = d2;
                        bestAnchor = a;
                    }
                });

                
                const snappedPos = getAnchorCoordinates(
                    bestAnchor,
                    nodeWidth,
                    nodeHeight
                );
                setDragBadgePos({
                    left: snappedPos.left,
                    top: snappedPos.top,
                });

                
                setDraggedAnchor(bestAnchor);
            },
            [
                isDraggingBadge,
                getAllAnchors,
                getAnchorCoordinates,
                nodeWidth,
                nodeHeight,
            ]
        );

        const stopBadgeDrag = useCallback(() => {
            if (!isDraggingBadge || !dragBadgePos) return;
            setIsDraggingBadge(false);
            setDraggedAnchor("right"); 

            
            const anchors = getAllAnchors();
            let bestAnchor = anchors[0];
            let bestDist = Number.POSITIVE_INFINITY;

            anchors.forEach((a) => {
                const pos = getAnchorCoordinates(a, nodeWidth, nodeHeight);
                const dx = pos.left - dragBadgePos.left;
                const dy = pos.top - dragBadgePos.top;
                const d2 = dx * dx + dy * dy;
                if (d2 < bestDist) {
                    bestDist = d2;
                    bestAnchor = a;
                }
            });

            const command = commandController.createUpdateNodeCommand(id, {
                data: {
                    ...storeData,
                    stateUpdatePosition: bestAnchor,
                },
            });
            commandController.execute(command);

            setDragBadgePos(null);
        }, [
            dragBadgePos,
            getAllAnchors,
            getAnchorCoordinates,
            id,
            nodeHeight,
            nodeWidth,
            isDraggingBadge,
            storeData,
        ]);

        useEffect(() => {
            if (isDraggingBadge) {
                window.addEventListener("mousemove", onBadgeDrag);
                window.addEventListener("mouseup", stopBadgeDrag);
                return () => {
                    window.removeEventListener("mousemove", onBadgeDrag);
                    window.removeEventListener("mouseup", stopBadgeDrag);
                };
            }
        }, [isDraggingBadge, onBadgeDrag, stopBadgeDrag]);
        

        const handleBlur = useCallback(() => {
            setIsEditing(false);
            const command = commandController.createUpdateNodeCommand(id, {
                data: {
                    ...storeData,
                    stateUpdate: editStateUpdate,
                },
            });
            commandController.execute(command);
        }, [editStateUpdate, id, storeData]);

        const handleResize = useCallback(
            (event: any, params: { width: number; height: number }) => {
                const defaultData = EventNode.getDefaultData();
                const defaultWidth = defaultData.width || 200;
                const defaultHeight = defaultData.height || 120;
                const defaultRatio = defaultHeight / defaultWidth;

                let constrainedWidth = params.width;
                let constrainedHeight = params.height;

                const currentRatio = constrainedHeight / constrainedWidth;

                if (currentRatio > defaultRatio) {
                    constrainedHeight = constrainedWidth * defaultRatio;
                }

                constrainedWidth = Math.max(constrainedWidth, defaultWidth);
                constrainedHeight = Math.max(constrainedHeight, defaultHeight);

                const command = commandController.createUpdateNodeCommand(id, {
                    data: {
                        ...storeData,
                        width: constrainedWidth,
                        height: constrainedHeight,
                    },
                });
                commandController.execute(command);
            },
            [id, storeData]
        );

        const handleMouseEnter = useCallback(() => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
            }
            setIsHovered(true);
        }, []);

        const handleMouseLeave = useCallback(() => {
            hoverTimeoutRef.current = setTimeout(() => {
                setIsHovered(false);
            }, 200);
        }, []);

        const ellipseHandles = getEllipseHandlePositions(nodeWidth, nodeHeight);

        return (
            <div
                ref={nodeRef}
                className={`relative ${selected ? "shadow-lg" : ""}`}
                style={{
                    width: `${nodeWidth + 2}px`,
                    height: `${nodeHeight + 2}px`,
                    minWidth: 120,
                    minHeight: 50,
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* SVG Ellipse */}
                <svg
                    width={nodeWidth}
                    height={nodeHeight}
                    viewBox={`0 0 ${nodeWidth} ${nodeHeight}`}
                    className="absolute"
                    style={{ left: "1px", top: "1px" }}
                    preserveAspectRatio="none"
                >
                    <ellipse
                        cx={nodeWidth / 2}
                        cy={nodeHeight / 2}
                        rx={(nodeWidth - 2) / 2}
                        ry={(nodeHeight - 2) / 2}
                        fill="white"
                        stroke={selected ? "#3b82f6" : "currentColor"}
                        strokeWidth={2}
                        className="dark:fill-zinc-800"
                    />
                </svg>

                {/* Centered text */}
                <div
                    className="absolute flex items-center justify-center text-center dark:text-white text-black"
                    style={{
                        left: "1px",
                        top: "1px",
                        width: `${nodeWidth}px`,
                        height: `${nodeHeight}px`,
                    }}
                >
                    <ResponsiveText
                        nodeWidth={nodeWidth}
                        nodeHeight={nodeHeight}
                        maxWidth={Math.max(40, nodeWidth * 0.95)}
                        fontWeight="medium"
                        centerAlign
                        className="dark:text-white text-black"
                        style={{ lineHeight: 0.9, padding: 0, margin: 0 }}
                    >
                        {nodeName}
                    </ResponsiveText>
                </div>
                <NodeResizer
                    isVisible={selected || isHovered}
                    minWidth={120}
                    minHeight={50}
                    onResize={handleResize}
                    handleClassName="!w-3 !h-3 !border-2 !border-blue-500 !bg-white dark:!bg-zinc-700 !rounded-sm !opacity-100"
                    lineClassName="!border-blue-500 !border-2"
                />

                {/* External state-update badge */}
                {(isEditing ||
                    (data?.stateUpdate && data.stateUpdate.trim() !== "")) && (
                    <div
                        className="absolute text-sm select-none cursor-move nodrag"
                        style={{
                            left:
                                dragBadgePos?.left ??
                                getAnchorCoordinates(
                                    getStateUpdateAnchor(),
                                    nodeWidth,
                                    nodeHeight
                                ).left,
                            top:
                                dragBadgePos?.top ??
                                getAnchorCoordinates(
                                    getStateUpdateAnchor(),
                                    nodeWidth,
                                    nodeHeight
                                ).top,
                            transform: dragBadgePos
                                ? getAnchorCoordinates(
                                      draggedAnchor,
                                      nodeWidth,
                                      nodeHeight
                                  ).transform
                                : getAnchorCoordinates(
                                      getStateUpdateAnchor(),
                                      nodeWidth,
                                      nodeHeight
                                  ).transform,
                            maxWidth: Math.max(120, nodeWidth * 0.8),
                        }}
                        onMouseDown={startBadgeDrag}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                            setEditStateUpdate(data?.stateUpdate || "");
                        }}
                    >
                        {isEditing ? (
                            <textarea
                                value={editStateUpdate}
                                onChange={(e) =>
                                    setEditStateUpdate(e.target.value)
                                }
                                onBlur={handleBlur}
                                className="event-node-input nodrag p-1 border rounded dark:bg-zinc-700 dark:text-white bg-white text-black"
                                style={{
                                    minWidth: 120,
                                    maxWidth: Math.max(120, nodeWidth * 0.8),
                                    fontSize: `${Math.max(
                                        12,
                                        typography.fontSize - 2
                                    )}px`,
                                }}
                                placeholder="State update"
                                autoFocus
                            />
                        ) : (
                            <div className="dark:text-white text-black whitespace-pre text-center font-mono text-sm flex items-stretch">
                                <span className="text-blue-400 dark:text-blue-300 text-lg mr-1 flex items-center">
                                    {"{"}
                                </span>
                                <div className="flex flex-col justify-center">
                                    {String(data?.stateUpdate || "")
                                        .trim()
                                        .split("\n")
                                        .map((line, index) => (
                                            <div
                                                key={index}
                                                className="text-center"
                                            >
                                                <ReactKatex>{line}</ReactKatex>
                                            </div>
                                        ))}
                                </div>
                                <span className="text-blue-400 dark:text-blue-300 text-lg ml-1 flex items-center">
                                    {"}"}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Handles */}
                {id !== "preview" && (
                    <>
                        {/* Top handles (ellipse) */}
                        {ellipseHandles.top.map((h, index) => (
                            <Handle
                                key={`top-${index}`}
                                id={`${id}-top-${index}`}
                                type="source"
                                position={Position.Top}
                                className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                    selected || isHovered
                                        ? "!bg-transparent"
                                        : "!bg-transparent !opacity-0"
                                }`}
                                isConnectable={isConnectable}
                                style={{
                                    left: `${h.x}px`,
                                    top: `${h.y + 5}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}

                        {/* Right handles (ellipse) */}
                        {ellipseHandles.right.map((h, index) => (
                            <Handle
                                key={`right-${index}`}
                                id={`${id}-right-${index}`}
                                type="source"
                                position={Position.Right}
                                className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                    selected || isHovered
                                        ? "!bg-transparent"
                                        : "!bg-transparent !opacity-0"
                                }`}
                                isConnectable={isConnectable}
                                style={{
                                    left: `${h.x}px`,
                                    top: `${h.y}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}

                        {/* Bottom handles (ellipse) */}
                        {ellipseHandles.bottom.map((h, index) => (
                            <Handle
                                key={`bottom-${index}`}
                                id={`${id}-bottom-${index}`}
                                type="source"
                                position={Position.Bottom}
                                className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                    selected || isHovered
                                        ? "!bg-transparent"
                                        : "!bg-transparent !opacity-0"
                                }`}
                                isConnectable={isConnectable}
                                style={{
                                    left: `${h.x}px`,
                                    top: `${h.y - 5}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}

                        {/* Left handles (ellipse) */}
                        {ellipseHandles.left.map((h, index) => (
                            <Handle
                                key={`left-${index}`}
                                id={`${id}-left-${index}`}
                                type="target"
                                position={Position.Left}
                                className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                    selected || isHovered
                                        ? "!bg-transparent"
                                        : "!bg-transparent !opacity-0"
                                }`}
                                isConnectable={isConnectable}
                                style={{
                                    left: `${h.x}px`,
                                    top: `${h.y}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}
                    </>
                )}
            </div>
        );
    },
    (prev, next) => {
        if (next.dragging) return true;

        const prevNode = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === prev.id);
        const nextNode = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === next.id);
        const prevName = prevNode?.name;
        const nextName = nextNode?.name;

        return (
            prev.id === next.id &&
            prev.selected === next.selected &&
            prev.isConnectable === next.isConnectable &&
            prevName === nextName &&
            prev.data.stateUpdate === next.data.stateUpdate &&
            prev.data.stateUpdatePosition === next.data.stateUpdatePosition &&
            prev.data.width === next.data.width &&
            prev.data.height === next.data.height
        );
    }
) as any;

EventNode.getDefaultData = (): EventNodeData => ({
    stateUpdate: "",
    stateUpdatePosition: "right",
    width: 120,
    height: 50,
});

EventNode.getGraphType = (): string => "eventBased";
EventNode.getType = (): string => "eventGraph";

EventNode.displayName = "EventNode";

export const EventNodePreview = () => {
    return (
        <div className="relative" style={{ width: "120px", height: "50px" }}>
            {/* SVG Ellipse */}
            <svg
                width="120"
                height="50"
                viewBox="0 0 120 50"
                className="absolute inset-0"
                preserveAspectRatio="none"
            >
                <ellipse
                    cx="60"
                    cy="25"
                    rx="59"
                    ry="24"
                    fill="white"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="dark:fill-zinc-800"
                />
            </svg>

            {/* Content */}
            <div className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black">
                <span className="font-medium text-sm">Event</span>
            </div>
        </div>
    );
};

export default EventNode;
