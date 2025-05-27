"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, XYPosition } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";

const commandController = CommandController.getInstance();

interface TerminatorNodeData {
    updateNodeData?: (nodeId: string, data: any) => void;
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

export const getDefaultData = (): TerminatorNodeData => ({});

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

        const node = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === id);

        const nodeName = node?.name || "Terminator Node";

        return (
            <div
                className={`relative ${selected ? "shadow-lg" : ""}`}
                style={{ width: "200px", height: "120px" }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
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
                        stroke={selected ? "#3b82f6" : "currentColor"}
                        strokeWidth="2"
                        className="dark:fill-zinc-800"
                    />
                </svg>

                {/* Content Area */}
                <div className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black px-8">
                    <MathJax>{nodeName}</MathJax>
                </div>

                {id !== "preview" && (
                    <>
                        {/* Top Handles - 3 handles */}
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
                                top: "15%",
                                transform: "translateX(-50%)",
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
                                top: "5%",
                                transform: "translateX(-50%)",
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
                                top: "15%",
                                transform: "translateX(-50%)",
                            }}
                        />

                        {/* Left Handle */}
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
                                left: "2.5%",
                                top: "50%",
                                transform: "translateY(-50%)",
                            }}
                        />

                        {/* Right Handle */}
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
                                right: "2.5%",
                                top: "50%",
                                transform: "translateY(-50%)",
                            }}
                        />

                        {/* Bottom Handles - 3 handles */}
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
                                bottom: "15%",
                                transform: "translateX(-50%)",
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
                                bottom: "5%",
                                transform: "translateX(-50%)",
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
                                bottom: "15%",
                                transform: "translateX(-50%)",
                            }}
                        />
                    </>
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

TerminatorNode.getDefaultData = (): TerminatorNodeData => ({});

TerminatorNode.getGraphType = (): string => "rcq";

TerminatorNode.displayName = "TerminatorNode";

export default TerminatorNode;
