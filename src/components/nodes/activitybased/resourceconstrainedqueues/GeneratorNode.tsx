"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, XYPosition } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { GripIcon } from "lucide-react";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";
import { snapToGrid } from "@/lib/utils/math";

const commandController = CommandController.getInstance();

interface GeneratorNodeData {
    updateNodeData?: (nodeId: string, data: any) => void;
    width?: number;
    height?: number;
}

interface ExtendedNodeProps extends NodeProps<GeneratorNodeData> {
    name?: string;
}

interface GeneratorNodeComponent
    extends React.NamedExoticComponent<ExtendedNodeProps> {
    defaultData: GeneratorNodeData;
    displayName?: string;
    getGraphType?: () => string;
}

interface GeneratorNodeJSON {
    id: string;
    type: "generator";
    name?: string;
    data: {};
    position: XYPosition;
}

export const createJSON = (
    props: NodeProps<GeneratorNodeData>
): GeneratorNodeJSON => {
    return {
        id: props.id,
        type: "generator",
        name: (props as any).name,
        data: {},
        position: {
            x: props.xPos,
            y: props.yPos,
        },
    };
};

export const GeneratorNodePreview = () => {
    return (
        <div className="relative" style={{ width: "200px", height: "120px" }}>
            {/* SVG Shape */}
            <svg
                width="200"
                height="120"
                viewBox="0 0 200 120"
                className="absolute inset-0"
            >
                <path
                    d="M 0 15 L 150 15 L 190 60 L 150 105 L 0 105 L 40 60 Z"
                    fill="white"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="dark:fill-zinc-800"
                />
            </svg>

            {/* Content Area */}
            <div className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black px-4">
                <span>Load 1</span>
            </div>
        </div>
    );
};

export const getDefaultData = (): GeneratorNodeData => ({
    width: 200,
    height: 120,
});

const GeneratorNode = memo(
    ({
        id,
        data = {} as GeneratorNodeData,
        selected,
        isConnectable,
        dragging,
        xPos,
        yPos,
    }: ExtendedNodeProps) => {
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

        const nodeName = storeNode?.name || "Generator Node";

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
                    width: data?.width || 200,
                    height: data?.height || 120,
                };
                initialDimensions.current = currentDimensions;
                setResizeDimensions(currentDimensions);
            },
            [data?.width, data?.height]
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
                    150,
                    snapToGrid(initialDimensions.current.width + deltaX)
                );
                const newHeight = Math.max(
                    80,
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

        return (
            <div
                ref={nodeRef}
                className={`relative ${selected ? "shadow-lg" : ""}`}
                style={{
                    width: `${dimensions.width}px`,
                    height: `${dimensions.height}px`,
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* SVG Shape */}
                <svg
                    width={dimensions.width}
                    height={dimensions.height}
                    viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                    className="absolute inset-0"
                >
                    <path
                        d={`M 0 ${dimensions.height * 0.125} L ${
                            dimensions.width * 0.75
                        } ${dimensions.height * 0.125} L ${
                            dimensions.width * 0.95
                        } ${dimensions.height * 0.5} L ${
                            dimensions.width * 0.75
                        } ${dimensions.height * 0.875} L 0 ${
                            dimensions.height * 0.875
                        } L ${dimensions.width * 0.2} ${
                            dimensions.height * 0.5
                        } Z`}
                        fill="white"
                        stroke={selected ? "#3b82f6" : "currentColor"}
                        strokeWidth="2"
                        className="dark:fill-zinc-800"
                    />
                </svg>

                {/* Content Area */}
                <div
                    className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black right-12 text-sm"
                    style={{ left: `${dimensions.width * 0.2}px` }}
                >
                    <MathJax>{nodeName}</MathJax>
                </div>

                {id !== "preview" && (
                    <>
                        {/* Top Handles */}
                        <Handle
                            id={`${id}-top-left-source`}
                            type="source"
                            position={Position.Top}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "37.5%",
                                top: "17%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                        <Handle
                            id={`${id}-top-center-source`}
                            type="source"
                            position={Position.Top}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "75%",
                                top: "17%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />

                        {/* Left Handles - at the tail corners and indent */}
                        <Handle
                            id={`${id}-left-top-source`}
                            type="source"
                            position={Position.Left}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "3%",
                                top: "12.5%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                        <Handle
                            id={`${id}-left-source`}
                            type="source"
                            position={Position.Left}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "23%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                        <Handle
                            id={`${id}-left-bottom-source`}
                            type="source"
                            position={Position.Left}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "3%",
                                top: "87.5%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />

                        {/* Right Handle - at the tip */}
                        <Handle
                            id={`${id}-right-source`}
                            type="source"
                            position={Position.Right}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "93%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />

                        {/* Bottom Handles */}
                        <Handle
                            id={`${id}-bottom-left-source`}
                            type="source"
                            position={Position.Bottom}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "37.5%",
                                top: "83%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                        <Handle
                            id={`${id}-bottom-center-source`}
                            type="source"
                            position={Position.Bottom}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "75%",
                                top: "83%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
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
            JSON.stringify(prevNode?.data) === JSON.stringify(nextNode?.data)
        );
    }
) as any;

GeneratorNode.getDefaultData = (): GeneratorNodeData => ({
    width: 200,
    height: 120,
});

GeneratorNode.getGraphType = (): string => "rcq";

GeneratorNode.displayName = "GeneratorNode";

export default GeneratorNode;
