"use client";

import { memo, useState, useCallback, useEffect, useMemo } from "react";
import { Handle, Position, NodeProps, XYPosition } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";
import { getStandardHandlePositions } from "@/lib/utils/math";

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
        <div className="relative px-4 py-2 border-2 border-black dark:border-white bg-white dark:bg-zinc-800 min-w-[200px]">
            <div className="font-medium text-sm text-center mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                Initialization
            </div>
            <div className="mt-2 min-h-[40px] text-center dark:text-gray-300">
                <div className="my-1">
                    <span>s = 0</span>
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
        const node = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === id);
        const [isEditing, setIsEditing] = useState(false);
        const [editValue, setEditValue] = useState("");

        const nodeWidth = 200;
        const nodeHeight = 80;
        const handlePositions = getStandardHandlePositions(
            nodeWidth,
            nodeHeight
        );

        useEffect(() => {
            if (
                node?.data?.initializations &&
                Array.isArray(node.data.initializations)
            ) {
                const initialText = node.data.initializations
                    .filter(
                        (init: any) =>
                            init &&
                            typeof init === "string" &&
                            init.trim() !== ""
                    )
                    .join("\n");
                setEditValue(initialText);
            } else {
                setEditValue("");
            }
        }, [node?.data?.initializations]);

        const validItems = useMemo(() => {
            if (
                !node?.data?.initializations ||
                !Array.isArray(node.data.initializations)
            ) {
                return [];
            }
            return node.data.initializations.filter(
                (init: any) =>
                    init && typeof init === "string" && init.trim() !== ""
            );
        }, [node?.data?.initializations]);

        const handleDoubleClick = useCallback(() => {
            setIsEditing(true);
        }, []);

        const handleBlur = useCallback(() => {
            setIsEditing(false);

            const newInitializations = editValue
                .split("\n")
                .map((line: any) => line.trim())
                .filter((line: any) => line !== "");

            const command = commandController.createUpdateNodeCommand(id, {
                data: {
                    initializations: newInitializations,
                },
            });
            commandController.execute(command);
        }, [editValue, id]);

        const nodeName = node?.name || id;

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
                        {handlePositions.horizontal
                            .slice(0, 3)
                            .map((leftPos, index) => (
                                <Handle
                                    key={`top-${index}`}
                                    id={`${id}-top-${index}-source`}
                                    type="source"
                                    position={Position.Top}
                                    className="!bg-black dark:!bg-white !w-3 !h-3 !border-2 !border-white dark:!border-zinc-800"
                                    isConnectable={isConnectable}
                                    style={{
                                        left: `${leftPos}px`,
                                        top: "0px",
                                        transform: "translate(-50%, -50%)",
                                    }}
                                />
                            ))}

                        {/* Side Handles */}
                        <Handle
                            id={`${id}-left-source`}
                            type="source"
                            position={Position.Left}
                            className="!bg-black dark:!bg-white !w-3 !h-3 !border-2 !border-white dark:!border-zinc-800"
                            isConnectable={isConnectable}
                            style={{
                                left: "0px",
                                top: `${nodeHeight / 2}px`,
                                transform: "translate(-50%, -50%)",
                            }}
                        />

                        <Handle
                            id={`${id}-right-source`}
                            type="source"
                            position={Position.Right}
                            className="!bg-black dark:!bg-white !w-3 !h-3 !border-2 !border-white dark:!border-zinc-800"
                            isConnectable={isConnectable}
                            style={{
                                left: `${nodeWidth}px`,
                                top: `${nodeHeight / 2}px`,
                                transform: "translate(-50%, -50%)",
                            }}
                        />

                        {/* Bottom Handles */}
                        {handlePositions.horizontal
                            .slice(0, 3)
                            .map((leftPos, index) => (
                                <Handle
                                    key={`bottom-${index}`}
                                    id={`${id}-bottom-${index}-source`}
                                    type="source"
                                    position={Position.Bottom}
                                    className="!bg-black dark:!bg-white !w-3 !h-3 !border-2 !border-white dark:!border-zinc-800"
                                    isConnectable={isConnectable}
                                    style={{
                                        left: `${leftPos}px`,
                                        top: `${nodeHeight}px`,
                                        transform: "translate(-50%, -50%)",
                                    }}
                                />
                            ))}
                    </>
                )}

                {/* Content */}
                <div className="mt-2 min-h-[40px]">
                    {isEditing ? (
                        <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleBlur}
                            className="w-full min-h-[80px] p-2 border rounded dark:bg-zinc-700 dark:text-white nodrag"
                            placeholder="Enter initializations..."
                            autoFocus
                        />
                    ) : (
                        <div className="space-y-1">
                            {validItems.length > 0 ? (
                                validItems.map(
                                    (init: string, index: number) => (
                                        <div key={index} className="my-1">
                                            <div className="mathjax-content">
                                                <MathJax>{init}</MathJax>
                                            </div>
                                        </div>
                                    )
                                )
                            ) : (
                                <div className="text-gray-400 dark:text-gray-500 text-center">
                                    No initializations
                                </div>
                            )}
                        </div>
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
            JSON.stringify(prevNode?.data?.initializations) ===
                JSON.stringify(nextNode?.data?.initializations)
        );
    }
) as any;

InitializationNode.getDefaultData = (): InitializationNodeData => ({
    initializations: [],
});

InitializationNode.getGraphType = (): string => "eventBased";
InitializationNode.getType = (): string => "eventGraph";

InitializationNode.displayName = "InitializationNode";

export default InitializationNode;
