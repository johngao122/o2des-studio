"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, XYPosition } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { GripIcon } from "lucide-react";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";
import { snapToGrid, getGridAlignedHandlePositions } from "@/lib/utils/math";

const commandController = CommandController.getInstance();

interface EventNodeData {
    stateUpdate: string;
    eventParameters?: string;
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
        dragging,
        xPos,
        yPos,
    }: ExtendedNodeProps) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editStateUpdate, setEditStateUpdate] = useState(
            data?.stateUpdate || ""
        );
        const [editEventParameters, setEditEventParameters] = useState(
            data?.eventParameters || ""
        );
        const [isHovered, setIsHovered] = useState(false);
        const [isResizing, setIsResizing] = useState(false);
        const [resizeDimensions, setResizeDimensions] = useState<{
            width: number;
            height: number;
        } | null>(null);

        const nodeRef = useRef<HTMLDivElement>(null);
        const initialMousePos = useRef<{ x: number; y: number } | null>(null);
        const initialDimensions = useRef<{
            width: number;
            height: number;
        } | null>(null);

        const storeNode = useStore((state) =>
            state.nodes.find((n) => n.id === id)
        );

        const nodeName = storeNode?.name || "Event Node";

        const storeData = storeNode?.data || {};
        const dimensions =
            isResizing && resizeDimensions
                ? resizeDimensions
                : {
                      width: storeData?.width || 200,
                      height: storeData?.height || 120,
                  };

        const handleMouseDown = useCallback(
            (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizing(true);
                initialMousePos.current = { x: e.clientX, y: e.clientY };
                const currentDimensions = {
                    width: storeData?.width || 200,
                    height: storeData?.height || 130,
                };
                initialDimensions.current = currentDimensions;
                setResizeDimensions(currentDimensions);
            },
            [storeData?.width, storeData?.height]
        );

        const handleMouseMove = useCallback(
            (e: MouseEvent) => {
                if (
                    !isResizing ||
                    !initialMousePos.current ||
                    !initialDimensions.current
                )
                    return;

                const deltaX = e.clientX - initialMousePos.current.x;
                const deltaY = e.clientY - initialMousePos.current.y;

                const newWidth = Math.max(
                    200,
                    snapToGrid(initialDimensions.current.width + deltaX)
                );
                const newHeight = Math.max(
                    130,
                    snapToGrid(initialDimensions.current.height + deltaY)
                );

                setResizeDimensions({ width: newWidth, height: newHeight });
            },
            [isResizing]
        );

        const handleMouseUp = useCallback(() => {
            if (isResizing && resizeDimensions) {
                setIsResizing(false);
                initialMousePos.current = null;
                initialDimensions.current = null;

                const command = commandController.createUpdateNodeCommand(id, {
                    data: {
                        ...storeData,
                        width: resizeDimensions.width,
                        height: resizeDimensions.height,
                    },
                });
                commandController.execute(command);
                setResizeDimensions(null);
            }
        }, [isResizing, resizeDimensions, storeData, id]);

        useEffect(() => {
            if (isResizing) {
                window.addEventListener("mousemove", handleMouseMove);
                window.addEventListener("mouseup", handleMouseUp);
                return () => {
                    window.removeEventListener("mousemove", handleMouseMove);
                    window.removeEventListener("mouseup", handleMouseUp);
                };
            }
        }, [isResizing, handleMouseMove, handleMouseUp]);

        const handleDoubleClick = useCallback(() => {
            setIsEditing(true);
            setEditStateUpdate(data?.stateUpdate || "");
            setEditEventParameters(data?.eventParameters || "");
        }, [data?.stateUpdate, data?.eventParameters]);

        const handleBlur = useCallback(
            (e: React.FocusEvent) => {
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (relatedTarget?.classList.contains("event-node-input")) {
                    return;
                }

                setIsEditing(false);
                const command = commandController.createUpdateNodeCommand(id, {
                    data: {
                        ...data,
                        stateUpdate: editStateUpdate,
                        eventParameters: editEventParameters,
                    },
                });
                commandController.execute(command);
            },
            [editStateUpdate, editEventParameters, id, data]
        );

        const getHandlePositions = () => {
            return getGridAlignedHandlePositions(
                dimensions.width,
                dimensions.height,
                0
            );
        };

        const handlePositions = getHandlePositions();

        return (
            <div
                ref={nodeRef}
                className={`relative ${selected ? "shadow-lg" : ""}`}
                style={{
                    width: `${dimensions.width}px`,
                    height: `${dimensions.height}px`,
                }}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Main Content Area */}
                <div
                    className={`absolute px-4 py-2 border-2 rounded-[40px] ${
                        selected
                            ? "border-blue-500"
                            : "border-black dark:border-white"
                    } bg-white dark:bg-zinc-800`}
                    style={{
                        top: "0px",
                        left: "0px",
                        width: `${dimensions.width}px`,
                        height: `${dimensions.height}px`,
                    }}
                >
                    {/* Node Name/Title */}
                    <div className="font-medium text-sm text-center mb-2 pb-1 dark:text-white text-black">
                        <MathJax>{nodeName}</MathJax>
                        {data?.eventParameters &&
                            data.eventParameters.trim() !== "" && (
                                <span> ({data.eventParameters})</span>
                            )}
                    </div>

                    {/* Content */}
                    <div className="space-y-2 flex-1 flex flex-col justify-center">
                        {isEditing ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editStateUpdate}
                                    onChange={(e) =>
                                        setEditStateUpdate(e.target.value)
                                    }
                                    onBlur={handleBlur}
                                    className="w-full min-h-[60px] p-2 border rounded dark:bg-zinc-700 dark:text-white event-node-input focus:outline-none focus:border-blue-500 nodrag"
                                    placeholder="State Update"
                                    autoFocus
                                />
                                <input
                                    type="text"
                                    value={editEventParameters}
                                    onChange={(e) =>
                                        setEditEventParameters(e.target.value)
                                    }
                                    onBlur={handleBlur}
                                    className="w-full p-1 border rounded dark:bg-zinc-700 dark:text-white event-node-input nodrag"
                                    placeholder="Event Parameters (optional)"
                                />
                            </div>
                        ) : (
                            <div className="space-y-1 flex flex-col items-center justify-center">
                                {data?.stateUpdate &&
                                data.stateUpdate.trim() !== "" ? (
                                    data.stateUpdate
                                        .split("\n")
                                        .map((line, index) => (
                                            <div key={index} className="my-1">
                                                {line.trim() !== "" ? (
                                                    <MathJax>{line}</MathJax>
                                                ) : (
                                                    <span> </span>
                                                )}
                                            </div>
                                        ))
                                ) : (
                                    <div className="text-gray-400 dark:text-gray-500">
                                        No state update
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Handles */}
                {id !== "preview" && (
                    <>
                        {/* Top handles */}
                        {handlePositions.top.map((leftPos, index) => (
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
                                    left: `${leftPos}px`,
                                    top: "0px",
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}

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
                                    left: `${dimensions.width}px`,
                                    top: `${topPos}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}

                        {/* Bottom handles */}
                        {handlePositions.bottom.map((leftPos, index) => (
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
                                    left: `${leftPos}px`,
                                    top: `${dimensions.height}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}

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
                                    left: "0px",
                                    top: `${topPos}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}
                    </>
                )}

                {/* Resize handle */}
                {(selected || isHovered) && (
                    <div
                        className="absolute w-6 h-6 cursor-se-resize nodrag flex items-center justify-center bg-white dark:bg-zinc-800 rounded-bl border-l border-t border-gray-300 dark:border-gray-600"
                        style={{
                            right: -3,
                            bottom: -3,
                            zIndex: 1,
                            pointerEvents: "auto",
                        }}
                        onMouseDown={handleMouseDown}
                    >
                        <GripIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 nodrag" />
                    </div>
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
            prev.xPos === next.xPos &&
            prev.yPos === next.yPos &&
            prevName === nextName &&
            prev.data.stateUpdate === next.data.stateUpdate &&
            prev.data.eventParameters === next.data.eventParameters &&
            prev.data.width === next.data.width &&
            prev.data.height === next.data.height
        );
    }
) as any;

EventNode.getDefaultData = (): EventNodeData => ({
    stateUpdate: "",
    eventParameters: "",
    width: 200,
    height: 120,
});

EventNode.getGraphType = (): string => "eventBased";
EventNode.getType = (): string => "eventGraph";

EventNode.displayName = "EventNode";

export const EventNodePreview = () => {
    return (
        <div className="relative px-4 py-2 border-2 rounded-[40px] border-black dark:border-white bg-white dark:bg-zinc-800 min-w-[200px] aspect-[2/1]">
            <div className="font-medium text-sm text-center mb-2 pb-1 dark:text-white text-black">
                <span>Event</span>
            </div>
            <div className="space-y-2">
                <div className="space-y-1 flex flex-col items-center justify-center">
                    <span>s = s + 1</span>
                </div>
            </div>
        </div>
    );
};

export default EventNode;
