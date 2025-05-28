"use client";

import { memo, useState, useCallback, useEffect, useMemo, useRef } from "react";
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
import { getStandardHandlePositions } from "@/lib/utils/math";

const commandController = CommandController.getInstance();

interface InitializationNodeData {
    initializations: string[];
    updateNodeData?: (nodeId: string, data: any) => void;
    width?: number;
    height?: number;
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
    width: 200,
    height: 120,
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
        const [isHovered, setIsHovered] = useState(false);
        const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
                        ...data,
                        width: params.width,
                        height: params.height,
                    },
                });
                commandController.execute(command);
            },
            [id, data]
        );

        const nodeWidth = data?.width || 200;
        const nodeHeight = data?.height || 120;
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
                <div className="font-medium text-sm text-center mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 dark:text-white text-black">
                    {nodeName}
                </div>

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

                {/* Content */}
                <div className="mt-2" style={{ height: nodeHeight - 60 }}>
                    {isEditing ? (
                        <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleBlur}
                            className="w-full p-2 border rounded dark:bg-zinc-700 dark:text-white nodrag resize-none"
                            style={{ height: nodeHeight - 80 }}
                            placeholder="Enter initializations..."
                            autoFocus
                        />
                    ) : (
                        <div className="space-y-1 h-full overflow-hidden">
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
            prev.data?.width === next.data?.width &&
            prev.data?.height === next.data?.height &&
            JSON.stringify(prevNode?.data?.initializations) ===
                JSON.stringify(nextNode?.data?.initializations)
        );
    }
) as any;

InitializationNode.getDefaultData = (): InitializationNodeData => ({
    initializations: [],
    width: 200,
    height: 120,
});

InitializationNode.getGraphType = (): string => "eventBased";
InitializationNode.getType = (): string => "eventGraph";

InitializationNode.displayName = "InitializationNode";

export default InitializationNode;
