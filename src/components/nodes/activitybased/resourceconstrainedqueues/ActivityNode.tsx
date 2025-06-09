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
    getAllHandleCoordinates,
} from "@/lib/utils/math";

const commandController = CommandController.getInstance();

interface ActivityNodeData {
    resources?: string[];
    duration?: string;
    updateNodeData?: (nodeId: string, data: any) => void;
    width?: number;
    height?: number;
}

interface ExtendedNodeProps extends NodeProps<ActivityNodeData> {
    name?: string;
}

interface ActivityNodeComponent
    extends React.NamedExoticComponent<ExtendedNodeProps> {
    defaultData: ActivityNodeData;
    displayName?: string;
    getGraphType?: () => string;
    addResource: (
        nodeData: ActivityNodeData,
        resource: string
    ) => ActivityNodeData;
    removeResource: (
        nodeData: ActivityNodeData,
        resourceIndex: number
    ) => ActivityNodeData;
    updateResource: (
        nodeData: ActivityNodeData,
        resourceIndex: number,
        newResource: string
    ) => ActivityNodeData;
}

interface ActivityNodeJSON {
    id: string;
    type: "activity";
    name?: string;
    data: {
        resources?: string[];
        duration?: string;
    };
    position: XYPosition;
}

export const createJSON = (
    props: NodeProps<ActivityNodeData>
): ActivityNodeJSON => {
    return {
        id: props.id,
        type: "activity",
        name: (props as any).name,
        data: {
            resources: props.data?.resources,
            duration: props.data?.duration,
        },
        position: {
            x: props.xPos,
            y: props.yPos,
        },
    };
};

export const ActivityNodePreview = () => {
    const previewWidth = 240;
    const previewHeight = 70;

    return (
        <div
            className="relative"
            style={{ width: `${previewWidth}px`, height: "140px" }}
        >
            {/* Resources */}
            <div className="absolute top-0 left-0 flex gap-1">
                <div className="px-2 py-1 bg-green-500 text-white text-xs rounded-sm font-medium">
                    RES (5AU)
                </div>
                <div className="px-2 py-1 bg-green-500 text-white text-xs rounded-sm font-medium">
                    ADV
                </div>
            </div>

            {/* Main Content Area */}
            <div
                className="absolute border-2 border-black dark:border-white bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center"
                style={{
                    top: "35px",
                    left: "0px",
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                }}
            >
                <div className="text-sm font-medium text-center dark:text-white text-black">
                    Activity Name
                </div>
            </div>

            {/* Duration */}
            <div
                className="absolute text-xs text-gray-600 dark:text-gray-400 text-center"
                style={{
                    top: `${35 + previewHeight + 10}px`,
                    left: "0px",
                    width: `${previewWidth}px`,
                }}
            >
                Duration: <span className="font-mono">op time</span>
            </div>
        </div>
    );
};

export const getDefaultData = (): ActivityNodeData => ({
    resources: [],
    duration: "op time",
    width: 240,
    height: 70,
});

const ActivityNode = memo(
    ({
        id,
        data = {} as ActivityNodeData,
        selected,
        isConnectable,
        dragging,
        xPos,
        yPos,
    }: ExtendedNodeProps) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editDuration, setEditDuration] = useState(
            data?.duration || "op time"
        );
        const [isHovered, setIsHovered] = useState(false);

        const nodeRef = useRef<HTMLDivElement>(null);

        const storeNode = useStore((state) =>
            state.nodes.find((n) => n.id === id)
        );

        const nodeName = storeNode?.name || "Activity Node";

        const storeData = storeNode?.data || {};
        const dimensions = {
            width: storeData?.width || 240,
            height: storeData?.height || 70,
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

        const handleDoubleClick = useCallback(() => {
            setIsEditing(true);
            setEditDuration(data?.duration || "op time");
        }, [data?.duration]);

        const handleBlur = useCallback(() => {
            setIsEditing(false);

            if (data?.updateNodeData) {
                data.updateNodeData(id, {
                    ...data,
                    duration: editDuration,
                });
            }
        }, [editDuration, id, data]);

        const getHandlePositions = () => {
            return getGridAlignedHandlePositions(
                dimensions.width,
                dimensions.height,
                35
            );
        };

        const handlePositions = getHandlePositions();

        const renderResourceRectangles = (resources: string[] | undefined) => {
            const safeResources = Array.isArray(resources) ? resources : [];

            if (safeResources.length === 0) {
                return null;
            }

            return safeResources.map((resource, index) => (
                <div
                    key={index}
                    className="px-2 py-1 bg-green-500 text-white text-xs rounded-sm font-medium"
                >
                    {String(resource)}
                </div>
            ));
        };

        return (
            <div
                ref={nodeRef}
                className={`relative ${selected ? "shadow-lg" : ""}`}
                style={{
                    width: `${dimensions.width}px`,
                    height: `${dimensions.height + 70}px`,
                }}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <NodeResizer
                    isVisible={selected || isHovered}
                    minWidth={180}
                    minHeight={50}
                    onResize={handleResize}
                />

                <div className="absolute top-0 left-0 flex flex-wrap gap-1">
                    {renderResourceRectangles(data?.resources || [])}
                </div>

                <div
                    className={`absolute border-2 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center ${
                        selected
                            ? "border-blue-500"
                            : "border-black dark:border-white"
                    }`}
                    style={{
                        top: "35px",
                        left: "0px",
                        width: `${dimensions.width}px`,
                        height: `${dimensions.height}px`,
                    }}
                >
                    <div className="text-sm font-medium text-center dark:text-white text-black px-4">
                        {nodeName}
                    </div>
                </div>

                {/* Duration */}
                {data?.duration && data.duration.trim() !== "" && (
                    <div
                        className="absolute text-xs text-center"
                        style={{
                            top: `${35 + dimensions.height + 10}px`,
                            left: "0px",
                            width: `${dimensions.width}px`,
                        }}
                    >
                        {isEditing ? (
                            <input
                                type="text"
                                value={editDuration}
                                onChange={(e) =>
                                    setEditDuration(e.target.value)
                                }
                                onBlur={handleBlur}
                                className="w-full p-1 text-xs border rounded dark:bg-zinc-700 dark:text-white nodrag text-center"
                                placeholder="Duration"
                                autoFocus
                            />
                        ) : (
                            <div className="text-gray-600 dark:text-gray-400">
                                Duration: {data?.duration}
                            </div>
                        )}
                    </div>
                )}

                {id !== "preview" && (
                    <>
                        {/* Top handles */}
                        {handlePositions.top.map((leftPos, index) => {
                            let handleId = `${id}-top-${index}`;
                            if (index === 0) {
                                handleId = `${id}-top-left-${index}`;
                            } else if (
                                index ===
                                handlePositions.top.length - 1
                            ) {
                                handleId = `${id}-top-right-${index}`;
                            }

                            return (
                                <Handle
                                    key={`top-${index}`}
                                    id={handleId}
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
                                        top: "35px",
                                        transform: "translate(-50%, -0%)",
                                    }}
                                />
                            );
                        })}

                        {/* Right handles */}
                        {handlePositions.right.map((topPos, index) => (
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
                                    left: `${dimensions.width}px`,
                                    top: `${topPos}px`,
                                    transform: "translate(-100%, -50%)",
                                }}
                            />
                        ))}

                        {/* Bottom handles */}
                        {handlePositions.bottom.map((leftPos, index) => {
                            let handleId = `${id}-bottom-${index}`;
                            if (index === 0) {
                                handleId = `${id}-bottom-right-${index}`;
                            } else if (
                                index ===
                                handlePositions.bottom.length - 1
                            ) {
                                handleId = `${id}-bottom-left-${index}`;
                            }

                            return (
                                <Handle
                                    key={`bottom-${index}`}
                                    id={handleId}
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
                                        top: `${35 + dimensions.height}px`,
                                        transform: "translate(-50%, -100%)",
                                    }}
                                />
                            );
                        })}

                        {/* Left handles */}
                        {handlePositions.left.map((topPos, index) => (
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
                                    left: "0px",
                                    top: `${topPos}px`,
                                    transform: "translate(0%, -50%)",
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
            JSON.stringify(prev.data?.resources) ===
                JSON.stringify(next.data?.resources) &&
            prev.data?.duration === next.data?.duration
        );
    }
) as any;

ActivityNode.getDefaultData = (): ActivityNodeData => ({
    resources: [],
    duration: "op time",
    width: 240,
    height: 70,
});

ActivityNode.getGraphType = (): string => "rcq";

ActivityNode.displayName = "ActivityNode";

ActivityNode.hiddenProperties = ["resources"];

ActivityNode.addResource = (
    nodeData: ActivityNodeData,
    resource: string
): ActivityNodeData => {
    const currentResources = Array.isArray(nodeData.resources)
        ? nodeData.resources
        : [];
    const trimmedResource = String(resource || "").trim();

    if (!currentResources.includes(trimmedResource) && trimmedResource !== "") {
        return {
            ...nodeData,
            resources: [...currentResources, trimmedResource],
        };
    }
    return nodeData;
};

ActivityNode.removeResource = (
    nodeData: ActivityNodeData,
    resourceIndex: number
): ActivityNodeData => {
    const currentResources = Array.isArray(nodeData.resources)
        ? nodeData.resources
        : [];

    if (resourceIndex >= 0 && resourceIndex < currentResources.length) {
        return {
            ...nodeData,
            resources: currentResources.filter(
                (_, index) => index !== resourceIndex
            ),
        };
    }
    return nodeData;
};

ActivityNode.updateResource = (
    nodeData: ActivityNodeData,
    resourceIndex: number,
    newResource: string
): ActivityNodeData => {
    const currentResources = Array.isArray(nodeData.resources)
        ? nodeData.resources
        : [];
    const trimmedResource = String(newResource || "").trim();

    if (
        resourceIndex >= 0 &&
        resourceIndex < currentResources.length &&
        trimmedResource !== ""
    ) {
        const updatedResources = [...currentResources];
        updatedResources[resourceIndex] = trimmedResource;
        return {
            ...nodeData,
            resources: updatedResources,
        };
    }
    return nodeData;
};

export default ActivityNode;
