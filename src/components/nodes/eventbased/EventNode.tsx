"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, XYPosition } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";

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
        const [editValue, setEditValue] = useState(data?.stateUpdate || "");
        const [editParams, setEditParams] = useState(
            data?.eventParameters || ""
        );

        const handleDoubleClick = useCallback(() => {
            setIsEditing(true);
            setEditValue(data?.stateUpdate || "");
            setEditParams(data?.eventParameters || "");
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
                        stateUpdate: editValue,
                        eventParameters: editParams,
                    },
                });
                commandController.execute(command);
            },
            [editValue, editParams, id, data]
        );

        const node = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === id);
        const nodeName = node?.name || id;

        const handlePositions = [
            {
                position: Position.Top,
                style: { left: "50%", transform: "translateX(-50%)" },
            },
            {
                position: Position.Top,
                style: {
                    left: "15%",
                    transform: "translateX(-50%) rotate(-45deg)",
                },
            },
            {
                position: Position.Top,
                style: {
                    left: "85%",
                    transform: "translateX(-50%) rotate(45deg)",
                },
            },

            {
                position: Position.Left,
                style: { top: "50%", transform: "translateY(-50%)" },
            },
            {
                position: Position.Right,
                style: { top: "50%", transform: "translateY(-50%)" },
            },

            {
                position: Position.Bottom,
                style: { left: "50%", transform: "translateX(-50%)" },
            },
            {
                position: Position.Bottom,
                style: {
                    left: "15%",
                    transform: "translateX(-50%) rotate(45deg)",
                },
            },
            {
                position: Position.Bottom,
                style: {
                    left: "85%",
                    transform: "translateX(-50%) rotate(-45deg)",
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
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleBlur}
                                className="w-full min-h-[80px] p-2 border rounded dark:bg-zinc-700 dark:text-white event-node-input focus:outline-none focus:border-blue-500 nodrag"
                                placeholder="State Update"
                                autoFocus
                            />
                            <input
                                type="text"
                                value={editParams}
                                onChange={(e) => setEditParams(e.target.value)}
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
                    handlePositions.map((handleConfig, index) => {
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
