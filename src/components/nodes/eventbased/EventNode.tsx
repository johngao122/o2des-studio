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

const EventNode = memo(
    ({ id, data, selected, isConnectable }: ExtendedNodeProps) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editValue, setEditValue] = useState(data.stateUpdate || "");
        const [editParams, setEditParams] = useState(
            data.eventParameters || ""
        );

        const handleDoubleClick = useCallback(() => {
            setIsEditing(true);
            setEditValue(data.stateUpdate || "");
            setEditParams(data.eventParameters || "");
        }, [data.stateUpdate, data.eventParameters]);

        const handleBlur = useCallback(() => {
            setIsEditing(false);
            const command = commandController.createUpdateNodeCommand(id, {
                data: {
                    ...data,
                    stateUpdate: editValue,
                    eventParameters: editParams,
                },
            });
            commandController.execute(command);
        }, [editValue, editParams, id, data]);

        const node = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === id);
        const nodeName = node?.name || id;

        const handlePositions = [
            { position: Position.Top, style: { left: "20%" } },
            { position: Position.Top, style: { left: "40%" } },
            { position: Position.Top, style: { left: "60%" } },
            { position: Position.Top, style: { left: "80%" } },
            { position: Position.Right, style: { top: "25%" } },
            { position: Position.Right, style: { top: "75%" } },
            { position: Position.Bottom, style: { left: "20%" } },
            { position: Position.Bottom, style: { left: "40%" } },
            { position: Position.Bottom, style: { left: "60%" } },
            { position: Position.Bottom, style: { left: "80%" } },
            { position: Position.Left, style: { top: "25%" } },
            { position: Position.Left, style: { top: "75%" } },
        ];

        return (
            <div
                className={`relative px-4 py-2 border-2 ${
                    selected
                        ? "border-blue-500"
                        : "border-black dark:border-white"
                } bg-white dark:bg-zinc-800 min-w-[200px] ${
                    selected ? "shadow-lg" : ""
                }`}
                onDoubleClick={handleDoubleClick}
            >
                {/* Node Name/Title */}
                <div className="font-medium text-sm text-center mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                    {nodeName}
                </div>

                {/* Content */}
                <div className="space-y-2">
                    {isEditing ? (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleBlur}
                                className="w-full p-1 border rounded dark:bg-zinc-700 dark:text-white"
                                placeholder="State Update"
                                autoFocus
                            />
                            <input
                                type="text"
                                value={editParams}
                                onChange={(e) => setEditParams(e.target.value)}
                                onBlur={handleBlur}
                                className="w-full p-1 border rounded dark:bg-zinc-700 dark:text-white"
                                placeholder="Event Parameters (optional)"
                            />
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <MathJax>{`\\[${
                                data.stateUpdate || ""
                            }\\]`}</MathJax>
                            {data.eventParameters && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Parameters: {data.eventParameters}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Handles */}
                {id !== "preview" &&
                    handlePositions.map((handleConfig, index) => (
                        <Handle
                            key={`${id}-${handleConfig.position}-${index}`}
                            type="source"
                            position={handleConfig.position}
                            style={handleConfig.style}
                            className="!bg-black dark:!bg-white !w-2 !h-2"
                            isConnectable={isConnectable}
                        />
                    ))}
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
);

EventNode.displayName = "EventNode";

export default EventNode;
