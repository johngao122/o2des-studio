"use client";

import { memo, useState, useCallback, useRef } from "react";
import {
    Handle,
    Position,
    NodeProps,
    XYPosition,
    NodeResizer,
} from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";
import { getStandardHandlePositions, snapToGrid } from "@/lib/utils/math";

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
    }: ExtendedNodeProps) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editStateUpdate, setEditStateUpdate] = useState(
            data?.stateUpdate || ""
        );
        const [editEventParameters, setEditEventParameters] = useState(
            data?.eventParameters || ""
        );
        const [isHovered, setIsHovered] = useState(false);
        const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

        const handleResize = useCallback(
            (event: any, params: { width: number; height: number }) => {
                const command = commandController.createUpdateNodeCommand(id, {
                    data: {
                        ...data,
                        width: params.width,
                        height: params.height,
                    },
                });
                commandController.execute(command);
            },
            [id, data]
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

        const node = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === id);

        const nodeName = node?.name || "Event Node";

        const nodeWidth = data?.width || 200;
        const nodeHeight = data?.height || 120;
        const handlePositions = getStandardHandlePositions(
            nodeWidth,
            nodeHeight
        );

        return (
            <div
                className={`relative px-4 py-2 border-2 rounded-[40px] ${
                    selected
                        ? "border-blue-500"
                        : "border-black dark:border-white"
                } bg-white dark:bg-zinc-800 ${selected ? "shadow-lg" : ""}`}
                style={{
                    width: nodeWidth,
                    height: nodeHeight,
                    minWidth: 200,
                    minHeight: 120,
                }}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <NodeResizer
                    isVisible={selected || isHovered}
                    minWidth={200}
                    minHeight={120}
                    onResize={handleResize}
                />

                {/* Node Name/Title */}
                <div className="font-medium text-sm text-center mb-2 pb-1 dark:text-white text-black">
                    <MathJax>
                        {nodeName +
                            (data?.eventParameters &&
                            data.eventParameters.trim() !== ""
                                ? ` (${data.eventParameters})`
                                : "")}
                    </MathJax>
                </div>

                {/* Content */}
                <div className="space-y-2" style={{ height: nodeHeight - 60 }}>
                    {isEditing ? (
                        <div className="space-y-2 h-full">
                            <textarea
                                value={editStateUpdate}
                                onChange={(e) =>
                                    setEditStateUpdate(e.target.value)
                                }
                                onBlur={handleBlur}
                                className="w-full flex-1 p-2 border rounded dark:bg-zinc-700 dark:text-white event-node-input focus:outline-none focus:border-blue-500 nodrag resize-none"
                                style={{ height: nodeHeight - 100 }}
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
                        <div className="space-y-1 flex flex-col items-center justify-center h-full overflow-hidden">
                            {data?.stateUpdate &&
                            data.stateUpdate.trim() !== "" ? (
                                data.stateUpdate
                                    .split("\n")
                                    .map((line, index) => (
                                        <div key={index} className="my-1">
                                            <div className="mathjax-content">
                                                {line.trim() !== "" ? (
                                                    <MathJax>{line}</MathJax>
                                                ) : (
                                                    <span> </span>
                                                )}
                                            </div>
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

                {/* Handles */}
                {id !== "preview" && (
                    <>
                        {/* Top handles */}
                        {handlePositions.horizontal
                            .slice(1, -1)
                            .map((leftPos, index) => (
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
                                        top: "5px",
                                        transform: "translate(-50%, -50%)",
                                    }}
                                />
                            ))}

                        {/* Right handles */}
                        {handlePositions.vertical.map((topPos, index) => (
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
                                    left: `${nodeWidth - 10}px`,
                                    top: `${topPos - 10}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}

                        {/* Bottom handles */}
                        {handlePositions.horizontal
                            .slice(1, -1)
                            .map((leftPos, index) => (
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
                                        top: `${nodeHeight - 10}px`,
                                        transform: "translate(-50%, -50%)",
                                    }}
                                />
                            ))}

                        {/* Left handles */}
                        {handlePositions.vertical.map((topPos, index) => (
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
                                    left: "5px",
                                    top: `${topPos - 10}px`,
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
            prev.data.eventParameters === next.data.eventParameters
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
