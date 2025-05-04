"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { NodeProps, XYPosition } from "reactflow";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode, BaseEdge } from "@/types/base";
import { GripIcon, MoveIcon } from "lucide-react";

const commandController = CommandController.getInstance();

interface ModuleFrameData extends Partial<Pick<BaseNode, "name">> {
    model: {
        nodes: BaseNode[];
        edges: BaseEdge[];
    };
}

interface ExtendedNodeProps extends NodeProps<ModuleFrameData> {
    name?: string;
}

interface ModuleFrameComponent
    extends React.NamedExoticComponent<ExtendedNodeProps> {
    defaultData: ModuleFrameData;
    displayName?: string;
    getGraphType?: () => string;
}

interface ModuleFrameJSON {
    id: string;
    type: "moduleFrame";
    name?: string;
    data: ModuleFrameData;
    position: XYPosition;
}

export const createJSON = (
    props: NodeProps<ModuleFrameData>
): ModuleFrameJSON => {
    return {
        id: props.id,
        type: "moduleFrame",
        name: props.data?.name || "Module Frame",
        data: {
            model: {
                nodes: props.data?.model?.nodes || [],
                edges: props.data?.model?.edges || [],
            },
        },
        position: {
            x: props.xPos,
            y: props.yPos,
        },
    };
};

export const ModuleFramePreview = () => {
    return (
        <div
            className="relative border-2 border-dashed border-black/50 dark:border-white/50 bg-transparent rounded-lg"
            style={{
                width: 160,
                height: 80,
                minWidth: 160,
                minHeight: 80,
                zIndex: -10,
            }}
        >
            <div className="absolute bottom-1 left-2">
                <span className="text-xs font-medium dark:text-white">
                    Module Frame
                </span>
            </div>
        </div>
    );
};

const ModuleFrameBase = memo(
    ({ id, data = {} as ModuleFrameData, selected }: ExtendedNodeProps) => {
        const nodeRef = useRef<HTMLDivElement>(null);
        const initialMousePos = useRef<{ x: number; y: number } | null>(null);
        const initialDimensions = useRef<{
            width: number;
            height: number;
        } | null>(null);
        const [isEditing, setIsEditing] = useState(false);
        const node = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === id);
        const nodeName = node?.name || id;
        const [editName, setEditName] = useState(nodeName);
        const [isResizing, setIsResizing] = useState(false);
        const [dimensions, setDimensions] = useState({
            width:
                typeof node?.style?.width === "number" ? node.style.width : 400,
            height:
                typeof node?.style?.height === "number"
                    ? node.style.height
                    : 300,
        });

        useEffect(() => {
            if (selected) {
                const zIndexValue = nodeRef.current?.style.zIndex || "-100";
                console.log(
                    `ModuleFrame selected - ID: ${id}, z-index: ${zIndexValue}`
                );

                if (data.model?.nodes?.length) {
                    console.log(
                        `Module contains ${data.model.nodes.length} nodes:`,
                        data.model.nodes.map((n) => n.id)
                    );
                }

                const allNodes = useStore.getState().nodes;
                const moduleIndex = allNodes.findIndex((n) => n.id === id);
                if (moduleIndex !== -1) {
                    console.log(
                        `ModuleFrame position in nodes array: ${moduleIndex} of ${allNodes.length}`
                    );

                    const moduleFramesBefore = allNodes
                        .slice(0, moduleIndex)
                        .filter((n) => n.type === "moduleFrame").length;
                    const otherNodesBefore = moduleIndex - moduleFramesBefore;

                    console.log(
                        `Nodes before this ModuleFrame: ${moduleIndex} (${moduleFramesBefore} frames, ${otherNodesBefore} other nodes)`
                    );

                    if (nodeRef.current) {
                        const computedStyle = window.getComputedStyle(
                            nodeRef.current
                        );
                        console.log(
                            `ModuleFrame computed z-index: ${computedStyle.zIndex}`
                        );

                        const edges = useStore.getState().edges;
                        console.log(`Total edges: ${edges.length}`);

                        setTimeout(() => {
                            const edgeElements =
                                document.querySelectorAll(".react-flow__edge");
                            if (edgeElements.length) {
                                const edgeStyle = window.getComputedStyle(
                                    edgeElements[0]
                                );
                                console.log(
                                    `Edge computed z-index: ${edgeStyle.zIndex}`
                                );
                            }
                        }, 100);
                    }
                }
            }
        }, [selected, id, data.model?.nodes]);

        useEffect(() => {
            if (!isResizing && node?.style) {
                const width =
                    typeof node.style.width === "number"
                        ? node.style.width
                        : dimensions.width;
                const height =
                    typeof node.style.height === "number"
                        ? node.style.height
                        : dimensions.height;
                setDimensions({ width, height });
            }
        }, [node?.style, isResizing, dimensions.width, dimensions.height]);

        const handleDoubleClick = useCallback(() => {
            setIsEditing(true);
        }, []);

        const handleBlur = useCallback(() => {
            setIsEditing(false);
            const command = commandController.createUpdateNodeCommand(id, {
                name: editName,
                data: {
                    ...data,
                },
            });
            commandController.execute(command);
        }, [editName, id, data]);

        const handleMouseDown = useCallback(
            (e: React.MouseEvent) => {
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
                    200,
                    initialDimensions.current.width + deltaX
                );
                const newHeight = Math.max(
                    150,
                    initialDimensions.current.height + deltaY
                );

                setDimensions({ width: newWidth, height: newHeight });
            },
            [isResizing]
        );

        const handleMouseUp = useCallback(() => {
            setIsResizing(false);

            const command = commandController.createUpdateNodeCommand(id, {
                style: {
                    width: dimensions.width,
                    height: dimensions.height,
                },
                data: {
                    ...data,
                },
            });
            commandController.execute(command);
        }, [id, dimensions, data]);

        useEffect(() => {
            if (isResizing) {
                window.addEventListener("mousemove", handleMouseMove);
                window.addEventListener("mouseup", handleMouseUp);
            }
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };
        }, [isResizing, handleMouseMove, handleMouseUp]);

        const handleFrameClick = useCallback((e: React.MouseEvent) => {
            e.stopPropagation();
        }, []);

        return (
            <div
                ref={nodeRef}
                className="relative module-frame-node"
                style={{
                    width: `${dimensions.width}px`,
                    height: `${dimensions.height}px`,
                    minWidth: 200,
                    minHeight: 150,
                    zIndex: -100,

                    pointerEvents: "none",
                }}
                onDoubleClick={handleDoubleClick}
            >
                {/* Completely transparent center */}
                <div
                    className="absolute inset-[5px]"
                    style={{
                        pointerEvents: "none",
                    }}
                />

                {/* Visual outline - only part that receives clicks for selection */}
                <div
                    className={`absolute inset-0 outline-2 outline-dashed rounded-lg ${
                        selected
                            ? "outline-blue-500"
                            : "outline-black/50 dark:outline-white/50"
                    }`}
                    style={{
                        pointerEvents: "auto",
                        cursor: "pointer",
                    }}
                    onClick={handleFrameClick}
                />

                {/* Move handle - the only element that can be dragged to move the frame */}
                <div
                    className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm nodrag"
                    style={{
                        pointerEvents: "auto",
                        cursor: "move",
                        zIndex: 2,
                    }}
                >
                    <MoveIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>

                {/* Resize handle */}
                <div
                    className="absolute w-6 h-6 cursor-se-resize nodrag flex items-center justify-center bg-white dark:bg-zinc-800 rounded-bl border-l border-t border-gray-300 dark:border-gray-600"
                    style={{
                        right: -3,
                        bottom: -3,
                        zIndex: 1,
                        pointerEvents: "auto",
                    }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMouseDown(e);
                    }}
                >
                    <GripIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 nodrag" />
                </div>

                {/* Module name */}
                <div
                    className="absolute bottom-2 left-2 px-1 py-0.5 bg-white/80 dark:bg-zinc-800/80 rounded"
                    style={{ zIndex: 1, pointerEvents: "auto" }}
                >
                    {isEditing ? (
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleBlur}
                            className="p-1 text-sm border rounded bg-white dark:bg-zinc-700 dark:text-white nodrag"
                            autoFocus
                        />
                    ) : (
                        <span className="text-sm font-medium dark:text-white">
                            {nodeName}
                        </span>
                    )}
                </div>
            </div>
        );
    },
    (prev, next) => {
        if (next.dragging) return true;

        const prevNode = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === prev.id);
        const nextNode = useStore
            .getState()
            .nodes.find((n: BaseNode) => n.id === next.id);

        const prevModel = prev.data?.model || { nodes: [], edges: [] };
        const nextModel = next.data?.model || { nodes: [], edges: [] };

        return (
            prev.id === next.id &&
            prev.selected === next.selected &&
            (prevNode?.name || "") === (nextNode?.name || "") &&
            JSON.stringify(prevModel) === JSON.stringify(nextModel)
        );
    }
);

ModuleFrameBase.displayName = "ModuleFrame";

const ModuleFrame = Object.assign(ModuleFrameBase, {
    defaultData: {
        name: "Module Frame",
        model: {
            nodes: [],
            edges: [],
        },
    },
    getGraphType: () => "eventBased",
}) as ModuleFrameComponent;

export default ModuleFrame;
