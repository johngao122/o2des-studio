"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, NodeProps, XYPosition } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";

const commandController = CommandController.getInstance();

interface GeneratorNodeData {
    updateNodeData?: (nodeId: string, data: any) => void;
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
            <div className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black px-8">
                <span>Load 1</span>
            </div>
        </div>
    );
};

export const getDefaultData = (): GeneratorNodeData => ({});

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
        const node = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === id);

        const nodeName = node?.name || "Generator Node";

        return (
            <div
                className={`relative ${selected ? "shadow-lg" : ""}`}
                style={{ width: "200px", height: "120px" }}
            >
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
                        {/* Top Handle */}
                        <Handle
                            id={`${id}-top-source`}
                            type="source"
                            position={Position.Top}
                            className="!dark:hidden"
                            isConnectable={isConnectable}
                            style={{
                                left: "50%",
                                top: "12.5%",
                                transform: "translateX(-50%)",
                            }}
                        />

                        {/* Left Handle - positioned in the crevice */}
                        <Handle
                            id={`${id}-left-source`}
                            type="source"
                            position={Position.Left}
                            className="!dark:hidden"
                            isConnectable={isConnectable}
                            style={{
                                left: "20%",
                                top: "50%",
                                transform: "translateY(-50%)",
                            }}
                        />

                        {/* Right Handle - at the arrow point */}
                        <Handle
                            id={`${id}-right-source`}
                            type="source"
                            position={Position.Right}
                            className="!dark:hidden"
                            isConnectable={isConnectable}
                            style={{
                                right: "5%",
                                top: "50%",
                                transform: "translateY(-50%)",
                            }}
                        />

                        {/* Bottom Handle */}
                        <Handle
                            id={`${id}-bottom-source`}
                            type="source"
                            position={Position.Bottom}
                            className="!dark:hidden"
                            isConnectable={isConnectable}
                            style={{
                                left: "50%",
                                bottom: "12.5%",
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

GeneratorNode.getDefaultData = (): GeneratorNodeData => ({});

GeneratorNode.getGraphType = (): string => "activityBased";

GeneratorNode.displayName = "GeneratorNode";

export default GeneratorNode;
