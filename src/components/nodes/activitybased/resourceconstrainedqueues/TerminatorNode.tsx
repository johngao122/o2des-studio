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

interface TerminatorNodeData {
    updateNodeData?: (nodeId: string, data: any) => void;
    width?: number;
    height?: number;
}

interface ExtendedNodeProps extends NodeProps<TerminatorNodeData> {
    name?: string;
}

interface TerminatorNodeComponent
    extends React.NamedExoticComponent<ExtendedNodeProps> {
    defaultData: TerminatorNodeData;
    displayName?: string;
    getGraphType?: () => string;
}

interface TerminatorNodeJSON {
    id: string;
    type: "terminator";
    name?: string;
    data: {};
    position: XYPosition;
}

export const createJSON = (
    props: NodeProps<TerminatorNodeData>
): TerminatorNodeJSON => {
    return {
        id: props.id,
        type: "terminator",
        name: (props as any).name,
        data: {},
        position: {
            x: props.xPos,
            y: props.yPos,
        },
    };
};

export const TerminatorNodePreview = () => {
    return (
        <div className="relative" style={{ width: "200px", height: "120px" }}>
            {/* SVG Shape - Ellipse */}
            <svg
                width="200"
                height="120"
                viewBox="0 0 200 120"
                className="absolute inset-0"
            >
                <ellipse
                    cx="100"
                    cy="60"
                    rx="95"
                    ry="55"
                    fill="white"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="dark:fill-zinc-800"
                />
            </svg>

            {/* Content Area */}
            <div className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black px-8">
                <span>Terminator</span>
            </div>
        </div>
    );
};

export const getDefaultData = (): TerminatorNodeData => ({
    width: 200,
    height: 120,
});

const TerminatorNode = memo(
    ({
        id,
        data = {} as TerminatorNodeData,
        selected,
        isConnectable,
        dragging,
        xPos,
        yPos,
    }: ExtendedNodeProps) => {
        const [isHovered, setIsHovered] = useState(false);
        const [isResizing, setIsResizing] = useState(false);
        const [dimensions, setDimensions] = useState({
            width: data?.width || 200,
            height: data?.height || 120,
        });

        const nodeRef = useRef<HTMLDivElement>(null);
        const initialMousePos = useRef<{ x: number; y: number } | null>(null);
        const initialDimensions = useRef<{
            width: number;
            height: number;
        } | null>(null);

        const node = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === id);

        const nodeName = node?.name || "Terminator Node";

        const handleMouseDown = useCallback(
            (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizing(true);
                initialMousePos.current = { x: e.clientX, y: e.clientY };
                initialDimensions.current = {
                    width: dimensions.width,
                    height: dimensions.height,
                };
            },
            [dimensions]
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

                setDimensions({ width: newWidth, height: newHeight });
            },
            [isResizing]
        );

        const handleMouseUp = useCallback(() => {
            if (isResizing) {
                setIsResizing(false);
                initialMousePos.current = null;
                initialDimensions.current = null;

                const command = commandController.createUpdateNodeCommand(id, {
                    data: {
                        ...data,
                        width: dimensions.width,
                        height: dimensions.height,
                    },
                });
                commandController.execute(command);
            }
        }, [isResizing, dimensions, data, id]);

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
                    <ellipse
                        cx={dimensions.width / 2}
                        cy={dimensions.height / 2}
                        rx={dimensions.width * 0.475}
                        ry={dimensions.height * 0.458}
                        fill="white"
                        stroke={selected ? "#3b82f6" : "currentColor"}
                        strokeWidth="2"
                        className="dark:fill-zinc-800"
                    />
                </svg>

                {/* Content Area */}
                <div className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black px-8 text-sm">
                    <MathJax>{nodeName}</MathJax>
                </div>

                {id !== "preview" && (
                    <>
                        {/* Top Handles */}
                        <Handle
                            id={`${id}-top-left-target`}
                            type="target"
                            position={Position.Top}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "20%",
                                top: "20%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                        <Handle
                            id={`${id}-top-center-target`}
                            type="target"
                            position={Position.Top}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "50%",
                                top: "7%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                        <Handle
                            id={`${id}-top-right-target`}
                            type="target"
                            position={Position.Top}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "80%",
                                top: "20%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />

                        {/* Side Handles */}
                        <Handle
                            id={`${id}-left-target`}
                            type="target"
                            position={Position.Left}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "5%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                        <Handle
                            id={`${id}-right-target`}
                            type="target"
                            position={Position.Right}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "95%",
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />

                        {/* Bottom Handles */}
                        <Handle
                            id={`${id}-bottom-left-target`}
                            type="target"
                            position={Position.Bottom}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "20%",
                                top: "80%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                        <Handle
                            id={`${id}-bottom-center-target`}
                            type="target"
                            position={Position.Bottom}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "50%",
                                top: "95%",
                                transform: "translate(-50%, -50%)",
                            }}
                        />
                        <Handle
                            id={`${id}-bottom-right-target`}
                            type="target"
                            position={Position.Bottom}
                            className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                selected || isHovered
                                    ? "!bg-transparent"
                                    : "!bg-transparent !opacity-0"
                            }`}
                            isConnectable={isConnectable}
                            style={{
                                left: "80%",
                                top: "80%",
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

TerminatorNode.getDefaultData = (): TerminatorNodeData => ({
    width: 200,
    height: 120,
});

TerminatorNode.getGraphType = (): string => "rcq";

TerminatorNode.displayName = "TerminatorNode";

export default TerminatorNode;
