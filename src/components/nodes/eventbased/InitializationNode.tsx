"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { Handle, Position, NodeProps, XYPosition } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";

const commandController = CommandController.getInstance();

interface InitializationNodeData {
    initializations: string[];
    updateNodeData?: (nodeId: string, data: any) => void;
}

interface ExtendedNodeProps extends NodeProps<InitializationNodeData> {
    name?: string;
}

interface InitializationNodeComponent
    extends React.NamedExoticComponent<ExtendedNodeProps> {
    defaultData: InitializationNodeData;
    displayName?: string;
    getGraphType?: () => string;
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
    return {
        id: props.id,
        type: "initialization",
        name: (props as any).name,
        data: {
            initializations: props.data.initializations.flatMap((init) => {
                const parts = init
                    .split("$")
                    .filter((part) => part.trim() !== "");
                return parts.map((part) => `$${part.trim()}$`);
            }),
        },
        position: {
            x: props.xPos,
            y: props.yPos,
        },
    };
};

export const InitializationNodePreview = () => {
    return (
        <div className="relative px-4 py-2 border-2 border-black dark:border-white bg-white dark:bg-zinc-800 min-w-[200px]">
            <div className="font-medium text-sm text-center mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                Initialization
            </div>
            <div className="mt-2 min-h-[40px] text-center dark:text-gray-300">
                <div className="my-1">
                    <MathJax>{""}</MathJax>
                </div>
            </div>
        </div>
    );
};

export const getDefaultData = (): InitializationNodeData => ({
    initializations: [],
});

const InitializationNode = memo(
    ({
        id,
        data = { initializations: [] } as InitializationNodeData,
        selected,
        isConnectable,
        dragging,
        xPos,
        yPos,
    }: ExtendedNodeProps) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editValue, setEditValue] = useState(
            data?.initializations?.join("\n") || ""
        );

        const handleDoubleClick = useCallback(() => {
            setIsEditing(true);
            setEditValue(data?.initializations?.join("\n") || "");
        }, [data?.initializations]);

        const handleBlur = useCallback(() => {
            setIsEditing(false);
            const newInitializations = editValue
                .split("\n")
                .filter((line) => line.trim() !== "");

            const command = commandController.createUpdateNodeCommand(id, {
                data: {
                    ...data,
                    initializations: newInitializations,
                },
            });
            commandController.execute(command);
        }, [editValue, id, data]);

        const node = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === id);
        const nodeName = node?.name || id;

        useEffect(() => {
            console.log("Node:", node);
        }, [node]);

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
                <div className="font-medium text-sm text-center mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 dark:text-white text-black">
                    {nodeName}
                </div>

                {id !== "preview" && (
                    <>
                        {/* Top Handles */}
                        <Handle
                            id={`${id}-top-source`}
                            type="source"
                            position={Position.Top}
                            className="!dark:hidden"
                            isConnectable={isConnectable}
                        />

                        {/* Left Handles */}
                        <Handle
                            id={`${id}-left-source`}
                            type="source"
                            position={Position.Left}
                            className="!dark:hidden"
                            isConnectable={isConnectable}
                        />

                        {/* Right Handles */}
                        <Handle
                            id={`${id}-right-source`}
                            type="source"
                            position={Position.Right}
                            className="!dark:hidden"
                            isConnectable={isConnectable}
                        />

                        {/* Bottom Handles */}
                        <Handle
                            id={`${id}-bottom-source`}
                            type="source"
                            position={Position.Bottom}
                            className="!dark:hidden"
                            isConnectable={isConnectable}
                        />
                    </>
                )}

                {/* Content Area */}
                <div className="mt-2 min-h-[40px] text-center dark:text-gray-300">
                    {isEditing ? (
                        <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleBlur}
                            className="w-full min-h-[100px] p-2 bg-transparent border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500 dark:text-white"
                            autoFocus
                        />
                    ) : (
                        data?.initializations?.map((init, index) => (
                            <div key={index} className="my-1">
                                <MathJax>{init || ""}</MathJax>
                            </div>
                        )) || null
                    )}
                </div>
            </div>
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
            JSON.stringify(prev.data.initializations) ===
                JSON.stringify(next.data.initializations)
        );
    }
) as any;

InitializationNode.getDefaultData = (): InitializationNodeData => ({
    initializations: [],
});

InitializationNode.getGraphType = (): string => "eventBased";

InitializationNode.displayName = "InitializationNode";

export default InitializationNode;
