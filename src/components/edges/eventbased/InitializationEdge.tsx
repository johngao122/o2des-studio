/*eslint-disable */

"use client";

import React, { memo, useState, useCallback } from "react";
import { EdgeProps } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { Input } from "@/components/ui/input";
import BaseEdgeComponent, {
    BaseEdgeData,
    BaseEdgeProps,
} from "@/components/edges/BaseEdgeComponent";

const commandController = CommandController.getInstance();

interface InitializationEdgeData extends BaseEdgeData {
    parameter?: string;
}

interface ExtendedEdgeProps extends BaseEdgeProps<InitializationEdgeData> {
    onClick?: () => void;
}

interface InitializationEdgeComponent
    extends React.NamedExoticComponent<ExtendedEdgeProps> {
    getDefaultData?: () => InitializationEdgeData;
    getGraphType?: () => string;
    displayName?: string;
}

const InitializationEdge = memo(
    ({
        id,
        source,
        target,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        style = {},
        data = {} as InitializationEdgeData,
        markerEnd,
        selected,
        onClick,
    }: ExtendedEdgeProps) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editParameter, setEditParameter] = useState(
            data?.parameter || ""
        );

        const handleDoubleClick = () => {
            setIsEditing(true);
            setEditParameter(data?.parameter || "");
        };

        const handleSave = useCallback(() => {
            const command = commandController.createUpdateEdgeCommand(id, {
                data: {
                    ...data,
                    parameter: editParameter,
                },
            });
            commandController.execute(command);
            setIsEditing(false);
        }, [id, data, editParameter]);

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                handleSave();
            } else if (e.key === "Escape") {
                setIsEditing(false);
                setEditParameter(data?.parameter || "");
            }
        };

        const handleContainerBlur = () => {
            handleSave();
        };

        return (
            <BaseEdgeComponent
                id={id}
                source={source}
                target={target}
                sourceX={sourceX}
                sourceY={sourceY}
                targetX={targetX}
                targetY={targetY}
                sourcePosition={sourcePosition}
                targetPosition={targetPosition}
                style={style}
                data={data}
                markerEnd={markerEnd}
                selected={selected}
                onClick={onClick}
            >
                {({ labelX, labelY }: { labelX: number; labelY: number }) => (
                    <div
                        style={{
                            position: "absolute",
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: "all",
                        }}
                        className="nodrag nopan"
                        onMouseDown={
                            isEditing ? (e) => e.stopPropagation() : undefined
                        }
                    >
                        <div
                            onDoubleClick={
                                !isEditing ? handleDoubleClick : undefined
                            }
                            onClick={
                                isEditing
                                    ? (e) => e.stopPropagation()
                                    : undefined
                            }
                            onBlur={isEditing ? handleContainerBlur : undefined}
                            tabIndex={-1}
                            className={`init-edge-label flex flex-col items-center justify-center ${
                                selected
                                    ? "bg-blue-50 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600"
                                    : "bg-white/90 dark:bg-zinc-800/90 border-gray-300 dark:border-gray-600"
                            } p-1 rounded-none border-2 text-xs shadow ${
                                isEditing
                                    ? "min-w-[180px]"
                                    : "min-w-[20px] min-h-[20px]"
                            }`}
                            style={{
                                cursor: "default",
                            }}
                        >
                            {isEditing ? (
                                <div className="flex flex-col space-y-1 p-1 w-full">
                                    <Input
                                        type="text"
                                        value={editParameter}
                                        onChange={(e) =>
                                            setEditParameter(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        className="nodrag text-xs h-6 dark:bg-zinc-700"
                                        placeholder="Parameter"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            ) : (
                                <div className="parameter-box">
                                    <MathJax>
                                        {typeof data?.parameter === "string" &&
                                        data.parameter.trim() !== ""
                                            ? data.parameter
                                            : "1"}
                                    </MathJax>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </BaseEdgeComponent>
        );
    }
) as InitializationEdgeComponent;

InitializationEdge.getDefaultData = (): InitializationEdgeData => ({
    parameter: "1",
    edgeType: "straight",
});

InitializationEdge.getGraphType = (): string => "eventBased";

InitializationEdge.displayName = "InitializationEdge";

export default InitializationEdge;
