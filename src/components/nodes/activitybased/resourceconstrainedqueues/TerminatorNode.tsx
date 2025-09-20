"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
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
import {
    snapToGrid,
    getGridAlignedHandlePositions,
    generatePillPath,
    getPillHandlePositions,
} from "@/lib/utils/math";
import {
    getTypographyScale,
    getTypographyVariant,
    getVariantTypographyConfig,
} from "@/lib/utils/typography";
import { ResponsiveText } from "@/components/ui/ResponsiveText";

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
            {/* SVG Shape - Pill */}
            <svg
                width="200"
                height="120"
                viewBox="0 0 200 120"
                className="absolute inset-0"
            >
                <path
                    d={generatePillPath(200, 120)}
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
    width: 120,
    height: 50,
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
        const [isLocallySelected, setIsLocallySelected] = useState(false);

        const nodeRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            setIsLocallySelected(selected || false);
        }, [selected]);

        const storeNode = useStore((state) =>
            state.nodes.find((n) => n.id === id)
        );

        const nodeName = storeNode?.name || "Terminator Node";

        const storeData = storeNode?.data || {};
        const rawDimensions = {
            width: storeData?.width || 200,
            height: storeData?.height || 120,
        };

        const defaultData = TerminatorNode.getDefaultData();
        const defaultRatio =
            (defaultData.height || 50) / (defaultData.width || 120);

        let constrainedWidth = rawDimensions.width;
        let constrainedHeight = rawDimensions.height;

        const currentRatio = constrainedHeight / constrainedWidth;

        if (currentRatio > defaultRatio) {
            constrainedHeight = constrainedWidth * defaultRatio;
        }

        constrainedWidth = Math.max(constrainedWidth, defaultData.width || 120);
        constrainedHeight = Math.max(
            constrainedHeight,
            defaultData.height || 50
        );

        const dimensions = {
            width: constrainedWidth,
            height: constrainedHeight,
        };

        const variant = getTypographyVariant(dimensions.width);
        const typographyConfig = getVariantTypographyConfig(variant);
        const typography = getTypographyScale(
            dimensions.width,
            dimensions.height,
            typographyConfig
        );
        const contentWidth = dimensions.width * 0.7;
        const textMaxWidth = Math.max(0, contentWidth - 8);

        const pillHandles = getPillHandlePositions(
            dimensions.width,
            dimensions.height
        );

        const handleResize = useCallback(
            (event: any, params: { width: number; height: number }) => {
                const defaultData = TerminatorNode.getDefaultData();
                const defaultWidth = defaultData.width || 120;
                const defaultHeight = defaultData.height || 50;
                const defaultRatio = defaultHeight / defaultWidth;

                let constrainedWidth = params.width;
                let constrainedHeight = params.height;

                const currentRatio = constrainedHeight / constrainedWidth;

                if (currentRatio > defaultRatio) {
                    constrainedHeight = constrainedWidth * defaultRatio;
                }

                constrainedWidth = Math.max(constrainedWidth, defaultWidth);
                constrainedHeight = Math.max(constrainedHeight, defaultHeight);

                const command = commandController.createUpdateNodeCommand(id, {
                    data: {
                        ...storeData,
                        width: constrainedWidth,
                        height: constrainedHeight,
                    },
                });
                commandController.execute(command);
            },
            [id, storeData]
        );

        return (
            <div
                ref={nodeRef}
                className={`relative terminator-node ${
                    isLocallySelected ? "shadow-lg" : ""
                }`}
                style={{
                    width: `${dimensions.width + 2}px`,
                    height: `${dimensions.height + 2}px`,
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <NodeResizer
                    isVisible={isLocallySelected || isHovered}
                    minWidth={120}
                    minHeight={50}
                    onResize={handleResize}
                />

                {/* SVG Shape */}
                <svg
                    width={dimensions.width}
                    height={dimensions.height}
                    viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                    className="absolute"
                    style={{
                        left: "1px",
                        top: "1px",
                    }}
                >
                    <path
                        d={generatePillPath(
                            dimensions.width,
                            dimensions.height
                        )}
                        fill="white"
                        stroke={isLocallySelected ? "#3b82f6" : "currentColor"}
                        strokeWidth="2"
                        className="dark:fill-zinc-800"
                    />
                </svg>

                {/* Content Area */}
                <div
                    className="absolute flex items-center justify-center text-center dark:text-white text-black"
                    style={{
                        left: "1px",
                        top: "1px",
                        width: `${dimensions.width}px`,
                        height: `${dimensions.height}px`,
                    }}
                >
                    <div
                        className="dark:text-white text-black font-medium text-center"
                        style={{
                            fontSize: `${typography.fontSize}px`,
                            lineHeight: `${typography.lineHeight}px`,
                            letterSpacing: `${typography.letterSpacing}px`,
                            maxWidth: `${textMaxWidth}px`,
                            width: "100%",
                            padding: "0 4px",
                            margin: 0,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                        }}
                    >
                        {nodeName}
                    </div>
                </div>

                {id !== "preview" && (
                    <>
                        {/* Top Handles */}
                        {pillHandles.top.map((handle, index) => (
                            <Handle
                                key={`top-${index}`}
                                id={`${id}-top-${index}`}
                                type="source"
                                position={Position.Top}
                                className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                    isLocallySelected || isHovered
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

                        {/* Right Handles */}
                        {pillHandles.right.map((handle, index) => (
                            <Handle
                                key={`right-${index}`}
                                id={`${id}-right-${index}`}
                                type="source"
                                position={Position.Right}
                                className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                    isLocallySelected || isHovered
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
                        {pillHandles.bottom.map((handle, index) => (
                            <Handle
                                key={`bottom-${index}`}
                                id={`${id}-bottom-${index}`}
                                type="source"
                                position={Position.Bottom}
                                className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                    isLocallySelected || isHovered
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

                        {/* Left Handles */}
                        {pillHandles.left.map((handle, index) => (
                            <Handle
                                key={`left-${index}`}
                                id={`${id}-left-${index}`}
                                type="source"
                                position={Position.Left}
                                className={`!border-none !w-3 !h-3 before:content-[''] before:absolute before:w-full before:h-0.5 before:bg-blue-500 dark:before:bg-blue-400 before:top-1/2 before:left-0 before:-translate-y-1/2 before:rotate-45 after:content-[''] after:absolute after:w-0.5 after:h-full after:bg-blue-500 dark:after:bg-blue-400 after:left-1/2 after:top-0 after:-translate-x-1/2 after:rotate-45 ${
                                    isLocallySelected || isHovered
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

TerminatorNode.getDefaultData = (): TerminatorNodeData => ({
    width: 120,
    height: 50,
});

TerminatorNode.getGraphType = (): string => "rcq";

TerminatorNode.displayName = "TerminatorNode";

export default TerminatorNode;
