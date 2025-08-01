"use client";

import { memo, useState, useCallback, useRef } from "react";
import {
    Handle,
    Position,
    NodeProps,
    XYPosition,
    NodeResizer,
} from "reactflow";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";
import { snapToGrid, getGridAlignedHandlePositions, generateArrowPath, getArrowHandlePositions } from "@/lib/utils/math";

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
                    d={generateArrowPath(200, 120)}
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

        const nodeRef = useRef<HTMLDivElement>(null);

        const storeNode = useStore((state) =>
            state.nodes.find((n) => n.id === id)
        );

        const nodeName = storeNode?.name || "Generator Node";

        const storeData = storeNode?.data || {};
        const dimensions = {
            width: storeData?.width || 200,
            height: storeData?.height || 120,
        };

        const handleResize = useCallback(
            (event: any, params: { width: number; height: number }) => {
                const command = commandController.createUpdateNodeCommand(id, {
                    data: {
                        ...storeData,
                        width: params.width,
                        height: params.height,
                    },
                });
                commandController.execute(command);
            },
            [id, storeData]
        );

        // Get arrow-specific handle positions
        const arrowHandles = getArrowHandlePositions(dimensions.width, dimensions.height);

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
                <NodeResizer
                    isVisible={selected || isHovered}
                    minWidth={150}
                    minHeight={80}
                    onResize={handleResize}
                />

                {/* SVG Shape */}
                <svg
                    width={dimensions.width}
                    height={dimensions.height}
                    viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                    className="absolute inset-0"
                >
                    <path
                        d={generateArrowPath(dimensions.width, dimensions.height)}
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
                    {nodeName}
                </div>

                {id !== "preview" && (
                    <>
                        {/* Top Handles */}
                        {arrowHandles.top.map((handle, index) => (
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
                                    left: `${handle.x}px`,
                                    top: `${handle.y}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}

                        {/* Right Handle - at the arrow tip */}
                        {arrowHandles.right.map((handle, index) => (
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
                                    left: `${handle.x}px`,
                                    top: `${handle.y}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}

                        {/* Bottom Handles */}
                        {arrowHandles.bottom.map((handle, index) => (
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
                                    left: `${handle.x}px`,
                                    top: `${handle.y}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}

                        {/* Left Handles - tail corners and indent */}
                        {arrowHandles.left.map((handle, index) => (
                            <Handle
                                key={`left-${index}`}
                                id={`${id}-left-${index}`}
                                type="source"
                                position={Position.Left}
                                className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                    selected || isHovered
                                        ? "!bg-transparent"
                                        : "!bg-transparent !opacity-0"
                                }`}
                                isConnectable={isConnectable}
                                style={{
                                    left: `${handle.x}px`,
                                    top: `${handle.y}px`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        ))}
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

GeneratorNode.getDefaultData = (): GeneratorNodeData => ({
    width: 200,
    height: 120,
});

GeneratorNode.getGraphType = (): string => "rcq";

GeneratorNode.displayName = "GeneratorNode";

export default GeneratorNode;
