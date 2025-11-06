"use client";

import { memo, useState, useCallback, useEffect, useMemo, useRef } from "react";
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
import { getGridAlignedHandlePositions, HANDLE_RADIUS } from "@/lib/utils/math";
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
import { ErrorTooltip } from "@/components/ui/ErrorTooltip";

const commandController = CommandController.getInstance();

interface InitializationNodeData {
    initializations: string[];
    updateNodeData?: (nodeId: string, data: any) => void;
    width?: number;
    height?: number;

    initializationsPosition?: string;
    initializationsCollapsed?: boolean;
}

interface ExtendedNodeProps extends NodeProps<InitializationNodeData> {
    name?: string;
}

interface InitializationNodeComponent
    extends React.NamedExoticComponent<ExtendedNodeProps> {
    defaultData: InitializationNodeData;
    displayName?: string;
    getGraphType?: () => string;
    getType?: () => string;
}

interface InitializationNodeJSON {
    id: string;
    type: "initialization";
    name?: string;
    data: {
        initializations: string[];
    };
    position: XYPosition;
}

export const createJSON = (
    props: NodeProps<InitializationNodeData>
): InitializationNodeJSON => {
    const inputData = props.data?.initializations || [];

    const processedInitializations = Array.isArray(inputData)
        ? inputData.flatMap((init: any) => {
              if (!init || init.trim() === "") {
                  return [];
              }

              const parts = init
                  .split("$")
                  .filter((part: any) => part.trim() !== "");

              if (parts.length === 0) {
                  return [];
              }

              return parts.map((part: any) => `$${part.trim()}$`);
          })
        : [];

    return {
        id: props.id,
        type: "initialization",
        name: (props as any).name,
        data: {
            initializations: processedInitializations,
        },
        position: {
            x: props.xPos,
            y: props.yPos,
        },
    };
};

export const InitializationNodePreview = () => {
    return (
        <div
            className="relative border-2 border-black dark:border-white bg-white dark:bg-zinc-800"
            style={{ width: "120px", height: "50px" }}
        >
            <div className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black">
                <span className="font-medium text-sm">Initialization</span>
            </div>
        </div>
    );
};

export const getDefaultData = (): InitializationNodeData => ({
    initializations: [],
    width: 120,
    height: 50,
    initializationsPosition: "right",
    initializationsCollapsed: false,
});

const InitializationNode = memo(
    ({
        id,
        data = { initializations: [] } as InitializationNodeData,
        selected,
        isConnectable,
        dragging,
    }: ExtendedNodeProps) => {
        const storeNode = useStore((state) =>
            state.nodes.find((n: BaseNode) => n.id === id)
        );
        const storeData = (storeNode?.data || {}) as InitializationNodeData;

        // Get validation errors for this node
        const validationErrors = useStore((state) =>
            state.getValidationErrors(id)
        );

        const [isEditing, setIsEditing] = useState(false);
        const [editValue, setEditValue] = useState("");
        const [isHovered, setIsHovered] = useState(false);
        const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
        const nodeRef = useRef<HTMLDivElement>(null);

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

        const handleResize = useCallback(
            (event: any, params: { width: number; height: number }) => {
                const command = commandController.createUpdateNodeCommand(id, {
                    data: {
                        ...storeData,
                        width: params.width,
                        height: params.height,
                    },
                });
                commandController.execute(command);
            },
            [id, storeData]
        );

        const nodeWidth = storeData?.width || 120;
        const nodeHeight = storeData?.height || 50;
        const handlePositions = getGridAlignedHandlePositions(
            nodeWidth,
            nodeHeight,
            0
        );

        const paddingConfig = getNodeTypePaddingConfig("initialization");
        const paddingStyles = getDynamicPaddingStyles(
            nodeWidth,
            nodeHeight,
            paddingConfig
        );
        const contentArea = getContentAreaDimensions(
            nodeWidth,
            nodeHeight,
            2,
            "initialization"
        );
        const variant = getTypographyVariant(nodeWidth);
        const typographyConfig = getVariantTypographyConfig(variant);
        const typography = getTypographyScale(
            nodeWidth,
            nodeHeight,
            typographyConfig
        );

        useEffect(() => {
            const current = (storeNode?.data?.initializations ||
                []) as string[];
            if (Array.isArray(current)) {
                const initialText = current
                    .filter(
                        (init) => typeof init === "string" && init.trim() !== ""
                    )
                    .join("\n");
                setEditValue(initialText);
            } else {
                setEditValue("");
            }
        }, [storeNode?.data?.initializations]);

        const validItems = useMemo(() => {
            const arr = (storeNode?.data?.initializations || []) as string[];
            if (!Array.isArray(arr)) return [];
            return arr.filter(
                (init) => typeof init === "string" && init.trim() !== ""
            );
        }, [storeNode?.data?.initializations]);

        const [isDraggingBadge, setIsDraggingBadge] = useState(false);
        const [dragBadgePos, setDragBadgePos] = useState<{
            left: number;
            top: number;
        } | null>(null);
        const [draggedAnchor, setDraggedAnchor] = useState<string>("right");

        const getInitializationsAnchor = useCallback(() => {
            return storeData?.initializationsPosition || "right";
        }, [storeData?.initializationsPosition]);

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
                setDragBadgePos({ left: snappedPos.left, top: snappedPos.top });
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
                    initializationsPosition: bestAnchor,
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
            const newInitializations = editValue
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line !== "");

            const command = commandController.createUpdateNodeCommand(id, {
                data: {
                    ...storeData,
                    initializations: newInitializations,
                },
            });
            commandController.execute(command);
        }, [editValue, id, storeData]);

        const nodeName = storeNode?.name || id;

        const hasErrors = validationErrors.length > 0;

        const isCollapsed = storeData?.initializationsCollapsed ?? false;

        const handleToggleCollapse = useCallback(
            (e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                const command = commandController.createUpdateNodeCommand(id, {
                    data: {
                        ...storeData,
                        initializationsCollapsed: !isCollapsed,
                    },
                });
                commandController.execute(command);
            },
            [id, storeData, isCollapsed]
        );

        return (
            <ErrorTooltip errors={validationErrors}>
                <div
                    ref={nodeRef}
                    className={`relative border-2 ${
                        hasErrors
                            ? "border-red-500 ring-2 ring-red-300 ring-opacity-50"
                            : selected
                            ? "border-blue-500"
                            : "border-black dark:border-white"
                    } bg-white dark:bg-zinc-800 ${
                        selected ? "shadow-lg" : ""
                    } ${hasErrors ? "shadow-red-200" : ""}`}
                    style={{
                        width: nodeWidth,
                        height: nodeHeight,
                        minWidth: 120,
                        minHeight: 50,
                        ...paddingStyles,
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Centered name */}
                    <div className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black">
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

                    {/* External initializations badge */}
                    {(isEditing || validItems.length > 0) && !isCollapsed && (
                        <div
                            className="absolute text-sm select-none cursor-move nodrag"
                            style={{
                                left:
                                    dragBadgePos?.left ??
                                    getAnchorCoordinates(
                                        getInitializationsAnchor(),
                                        nodeWidth,
                                        nodeHeight
                                    ).left,
                                top:
                                    dragBadgePos?.top ??
                                    getAnchorCoordinates(
                                        getInitializationsAnchor(),
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
                                          getInitializationsAnchor(),
                                          nodeWidth,
                                          nodeHeight
                                      ).transform,
                                maxWidth: Math.max(120, nodeWidth * 0.8),
                            }}
                            onMouseDown={startBadgeDrag}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                setIsEditing(true);
                                setEditValue(validItems.join("\n"));
                            }}
                        >
                            {isEditing ? (
                                <textarea
                                    value={editValue}
                                    onChange={(e) =>
                                        setEditValue(e.target.value)
                                    }
                                    onBlur={handleBlur}
                                    className="event-node-input nodrag p-1 border rounded dark:bg-zinc-700 dark:text-white bg-white text-black"
                                    style={{
                                        minWidth: 120,
                                        maxWidth: Math.max(
                                            120,
                                            nodeWidth * 0.8
                                        ),
                                        fontSize: `${Math.max(
                                            12,
                                            typography.fontSize - 2
                                        )}px`,
                                    }}
                                    placeholder="Initializations"
                                    autoFocus
                                />
                            ) : (
                                <div className="relative">
                                    <div className="dark:text-white text-black whitespace-pre text-center font-mono text-sm flex items-stretch">
                                        <span className="text-blue-400 dark:text-blue-300 text-lg mr-1 flex items-center">
                                            {"{"}
                                        </span>
                                        <div className="flex flex-col justify-center">
                                            {validItems.map((line, index) => (
                                                <div
                                                    key={index}
                                                    className="text-center"
                                                >
                                                    <ReactKatex>
                                                        {line}
                                                    </ReactKatex>
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-blue-400 dark:text-blue-300 text-lg ml-1 flex items-center">
                                            {"}"}
                                        </span>
                                    </div>
                                    {/* Collapse button */}
                                    <button
                                        className="absolute -top-5 -right-1 w-4 h-4 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-bold nodrag cursor-pointer"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                        }}
                                        onClick={handleToggleCollapse}
                                        title="Collapse"
                                    >
                                        -
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Expand button when collapsed */}
                    {isCollapsed && validItems.length > 0 && (
                        <div
                            className="absolute"
                            style={{
                                left: getAnchorCoordinates(
                                    getInitializationsAnchor(),
                                    nodeWidth,
                                    nodeHeight
                                ).left,
                                top: getAnchorCoordinates(
                                    getInitializationsAnchor(),
                                    nodeWidth,
                                    nodeHeight
                                ).top,
                                transform: getAnchorCoordinates(
                                    getInitializationsAnchor(),
                                    nodeWidth,
                                    nodeHeight
                                ).transform,
                            }}
                        >
                            <button
                                className="w-4 h-4 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-bold nodrag cursor-pointer"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                }}
                                onClick={handleToggleCollapse}
                                title="Expand"
                            >
                                +
                            </button>
                        </div>
                    )}

                    {/* Handles */}
                    {id !== "preview" && (
                        <>
                            {/* Top handles */}
                            {handlePositions.top.map((leftPos, index) => {
                                let handleId = `${id}-top-${index}`;
                                if (index === 0) {
                                    handleId = `${id}-top-left-${index}`;
                                } else if (
                                    index ===
                                    handlePositions.top.length - 1
                                ) {
                                    handleId = `${id}-top-right-${index}`;
                                }

                                return (
                                    <Handle
                                        key={`top-${index}`}
                                        id={handleId}
                                        type="source"
                                        position={Position.Top}
                                        className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                            selected || isHovered
                                                ? "!bg-transparent"
                                                : "!bg-transparent !opacity-0"
                                        }`}
                                        isConnectable={isConnectable}
                                        style={{
                                            left: `${leftPos}px`,
                                            top: `${
                                                handlePositions.headerHeight +
                                                HANDLE_RADIUS
                                            }px`,
                                            transform: "translate(-50%, -50%)",
                                        }}
                                    />
                                );
                            })}

                            {/* Right handles */}
                            {handlePositions.right.map((topPos, index) => (
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
                                        left: `${nodeWidth - HANDLE_RADIUS}px`,
                                        top: `${topPos}px`,
                                        transform: "translate(-50%, -50%)",
                                    }}
                                />
                            ))}

                            {/* Bottom handles */}
                            {handlePositions.bottom.map((leftPos, index) => {
                                let handleId = `${id}-bottom-${index}`;
                                if (index === 0) {
                                    handleId = `${id}-bottom-right-${index}`;
                                } else if (
                                    index ===
                                    handlePositions.bottom.length - 1
                                ) {
                                    handleId = `${id}-bottom-left-${index}`;
                                }

                                return (
                                    <Handle
                                        key={`bottom-${index}`}
                                        id={handleId}
                                        type="source"
                                        position={Position.Bottom}
                                        className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                            selected || isHovered
                                                ? "!bg-transparent"
                                                : "!bg-transparent !opacity-0"
                                        }`}
                                        isConnectable={isConnectable}
                                        style={{
                                            left: `${leftPos}px`,
                                            top: `${
                                                handlePositions.headerHeight +
                                                nodeHeight -
                                                HANDLE_RADIUS
                                            }px`,
                                            transform: "translate(-50%, -50%)",
                                        }}
                                    />
                                );
                            })}

                            {/* Left handles */}
                            {handlePositions.left.map((topPos, index) => (
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
                                        left: `${HANDLE_RADIUS}px`,
                                        top: `${topPos}px`,
                                        transform: "translate(-50%, -50%)",
                                    }}
                                />
                            ))}
                        </>
                    )}
                </div>
            </ErrorTooltip>
        );
    },
    (prev, next) => {
        if (next.dragging) {
            return true;
        }

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
            prev.xPos === next.xPos &&
            prev.yPos === next.yPos &&
            prevName === nextName &&
            prev.data?.width === next.data?.width &&
            prev.data?.height === next.data?.height &&
            (prevNode?.data as any)?.initializationsPosition ===
                (nextNode?.data as any)?.initializationsPosition &&
            JSON.stringify(prevNode?.data?.initializations) ===
                JSON.stringify(nextNode?.data?.initializations)
        );
    }
) as any;

InitializationNode.getDefaultData = (): InitializationNodeData => ({
    initializations: [],
    width: 120,
    height: 50,
    initializationsPosition: "right",
    initializationsCollapsed: false,
});

InitializationNode.getGraphType = (): string => "eventBased";
InitializationNode.getType = (): string => "eventGraph";

InitializationNode.displayName = "InitializationNode";

export default InitializationNode;
