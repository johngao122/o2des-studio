"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, XYPosition } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";
import { getStandardHandlePositions, snapToGrid } from "@/lib/utils/math";

const commandController = CommandController.getInstance();

interface EventNodeData {
    stateUpdate: string;
    eventParameters?: string;
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

        const node = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === id);

        const nodeName = node?.name || "Event Node";

        const nodeSize = 120;
        const handlePositions = getStandardHandlePositions(nodeSize, nodeSize);

        const gridAlignedHandlePositions = [
            {
                position: Position.Top,
                style: {
                    left: `${snapToGrid(nodeSize * 0.5)}px`,
                    top: "0px",
                    transform: "translate(-50%, -50%)",
                },
            },
            {
                position: Position.Top,
                style: {
                    left: `${snapToGrid(nodeSize * 0.15)}px`,
                    top: "0px",
                    transform: "translate(-50%, -50%)",
                },
            },
            {
                position: Position.Top,
                style: {
                    left: `${snapToGrid(nodeSize * 0.85)}px`,
                    top: "0px",
                    transform: "translate(-50%, -50%)",
                },
            },

            {
                position: Position.Left,
                style: {
                    left: "0px",
                    top: `${snapToGrid(nodeSize * 0.5)}px`,
                    transform: "translate(-50%, -50%)",
                },
            },
            {
                position: Position.Right,
                style: {
                    left: `${nodeSize}px`,
                    top: `${snapToGrid(nodeSize * 0.5)}px`,
                    transform: "translate(-50%, -50%)",
                },
            },

            {
                position: Position.Bottom,
                style: {
                    left: `${snapToGrid(nodeSize * 0.5)}px`,
                    top: `${nodeSize}px`,
                    transform: "translate(-50%, -50%)",
                },
            },
            {
                position: Position.Bottom,
                style: {
                    left: `${snapToGrid(nodeSize * 0.15)}px`,
                    top: `${nodeSize}px`,
                    transform: "translate(-50%, -50%)",
                },
            },
            {
                position: Position.Bottom,
                style: {
                    left: `${snapToGrid(nodeSize * 0.85)}px`,
                    top: `${nodeSize}px`,
                    transform: "translate(-50%, -50%)",
                },
            },
        ];

        return (
            <div
                className={`relative px-4 py-2 border-2 rounded-[40px] ${
                    selected
                        ? "border-blue-500"
                        : "border-black dark:border-white"
                } bg-white dark:bg-zinc-800 min-w-[200px] ${
                    selected ? "shadow-lg" : ""
                } aspect-[2/1]`}
                onDoubleClick={handleDoubleClick}
            >
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
                <div className="space-y-2">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editStateUpdate}
                                onChange={(e) =>
                                    setEditStateUpdate(e.target.value)
                                }
                                onBlur={handleBlur}
                                className="w-full min-h-[80px] p-2 border rounded dark:bg-zinc-700 dark:text-white event-node-input focus:outline-none focus:border-blue-500 nodrag"
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
                {id !== "preview" &&
                    gridAlignedHandlePositions.map((handleConfig, index) => {
                        const handleId = `${id}-${handleConfig.position}-${index}`;
                        return (
                            <Handle
                                key={handleId}
                                id={handleId}
                                type="source"
                                position={handleConfig.position}
                                style={handleConfig.style}
                                className="!bg-black dark:!bg-white !w-3 !h-3 !border-2 !border-white dark:!border-zinc-800"
                                isConnectable={isConnectable}
                            />
                        );
                    })}
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
