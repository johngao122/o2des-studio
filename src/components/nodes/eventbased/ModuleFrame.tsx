"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { NodeProps, XYPosition } from "reactflow";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode, BaseEdge } from "@/types/base";

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
                zIndex: -1,
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
                console.log("Mouse down event triggered", {
                    isResizing: false,
                });
                e.stopPropagation();
                setIsResizing(true);
                initialMousePos.current = { x: e.clientX, y: e.clientY };
                initialDimensions.current = {
                    width: dimensions.width,
                    height: dimensions.height,
                };
                console.log("isResizing set to true");
            },
            [dimensions]
        );

        const handleMouseMove = useCallback(
            (e: MouseEvent) => {
                console.log("Mouse move", { isResizing });
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

                console.log("New dimensions:", { newWidth, newHeight });
                setDimensions({ width: newWidth, height: newHeight });
            },
            [isResizing]
        );

        const handleMouseUp = useCallback(() => {
            console.log("Mouse up event triggered", { isResizing: true });
            setIsResizing(false);
            console.log("isResizing set to false");

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

        return (
            <div
                ref={nodeRef}
                className={`relative border-2 border-dashed ${
                    selected
                        ? "border-blue-500"
                        : "border-black/50 dark:border-white/50"
                } bg-transparent rounded-lg`}
                style={{
                    width: `${dimensions.width}px`,
                    height: `${dimensions.height}px`,
                    minWidth: 200,
                    minHeight: 150,
                    zIndex: -1,
                }}
                onDoubleClick={handleDoubleClick}
            >
                {/* Resize handle */}
                <div
                    className="absolute bottom-right w-4 h-4 cursor-se-resize nodrag"
                    style={{ right: -8, bottom: -8 }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMouseDown(e);
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        className="w-full h-full text-gray-500 nodrag"
                    >
                        <path
                            fill="currentColor"
                            d="M22 22H20V20H22V22ZM22 20H20V18H22V20ZM20 22H18V20H20V22ZM18 22H16V20H18V22Z"
                        />
                    </svg>
                </div>

                {/* Module name */}
                <div className="absolute bottom-2 left-2">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleBlur}
                            className="p-1 text-sm border rounded bg-white dark:bg-zinc-700 dark:text-white"
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
