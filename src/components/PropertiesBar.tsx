import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AlertCircle, Plus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/store";
import { nodeTypes } from "@/components/nodes";
import ActivityNode from "@/components/nodes/activitybased/resourceconstrainedqueues/ActivityNode";
import { CommandController } from "@/controllers/CommandController";
import { useState } from "react";

const commandController = CommandController.getInstance();

interface Property {
    key: string;
    value: string | number | boolean;
    type: "string" | "number" | "array" | "boolean";
    editable: boolean;
    isTextArea?: boolean;
    options?: string[];
    arrayValue?: string[];
}

interface PropertiesBarProps {
    properties: Property[];
    onPropertyChange: (key: string, value: string | number | boolean) => void;
    className?: string;
    selectionInfo?: {
        nodes: number;
        edges: number;
    };
}

export function PropertiesBar({
    properties,
    onPropertyChange,
    className,
    selectionInfo,
}: PropertiesBarProps) {
    const [newResourceInput, setNewResourceInput] = useState("");
    const selectedElements = useStore((state) => state.selectedElements);

    const handleAddResource = () => {
        if (newResourceInput.trim() === "") return;

        const { selectedElements, nodes } = useStore.getState();
        if (selectedElements.nodes.length === 1) {
            const nodeId = selectedElements.nodes[0];
            const node = nodes.find((n) => n.id === nodeId);

            if (node && node.type === "activity") {
                const updatedData = ActivityNode.addResource(
                    node.data,
                    newResourceInput.trim()
                );
                const command = commandController.createUpdateNodeCommand(
                    nodeId,
                    {
                        data: updatedData,
                    }
                );
                commandController.execute(command);
                setNewResourceInput("");
            }
        }
    };

    const handleRemoveResource = (resourceIndex: number) => {
        const { selectedElements, nodes } = useStore.getState();
        if (selectedElements.nodes.length === 1) {
            const nodeId = selectedElements.nodes[0];
            const node = nodes.find((n) => n.id === nodeId);

            if (node && node.type === "activity") {
                const updatedData = ActivityNode.removeResource(
                    node.data,
                    resourceIndex
                );
                const command = commandController.createUpdateNodeCommand(
                    nodeId,
                    {
                        data: updatedData,
                    }
                );
                commandController.execute(command);
            }
        }
    };

    const renderResourceManager = (resources: string[]) => {
        return (
            <div className="space-y-2">
                <div className="space-y-1">
                    {resources.map((resource, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-700 rounded"
                        >
                            <span className="flex-1 text-sm">{resource}</span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveResource(index)}
                                className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Input
                        value={newResourceInput}
                        onChange={(e) => setNewResourceInput(e.target.value)}
                        placeholder="Add resource..."
                        className="flex-1"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddResource();
                            }
                        }}
                    />
                    <Button
                        size="sm"
                        onClick={handleAddResource}
                        disabled={newResourceInput.trim() === ""}
                        className="h-8"
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>

                {resources.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-2">
                        No resources added
                    </div>
                )}
            </div>
        );
    };

    const renderMultiSelectionMessage = () => {
        if (!selectionInfo) return null;

        const { nodes, edges } = selectionInfo;

        if (nodes > 1 && edges === 0) {
            return (
                <div className="flex items-center p-3 mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                    <AlertCircle className="h-5 w-5 text-zinc-500 mr-2" />
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {nodes} nodes selected
                    </p>
                </div>
            );
        }

        if (edges > 1 && nodes === 0) {
            return (
                <div className="flex items-center p-3 mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                    <AlertCircle className="h-5 w-5 text-zinc-500 mr-2" />
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {edges} edges selected
                    </p>
                </div>
            );
        }

        if (nodes > 0 && edges > 0) {
            return (
                <div className="flex items-center p-3 mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                    <AlertCircle className="h-5 w-5 text-zinc-500 mr-2" />
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {nodes} nodes and {edges} edges selected
                    </p>
                </div>
            );
        }

        return null;
    };

    return (
        <div
            className={cn(
                "w-64 bg-background p-4 border-l flex flex-col h-full",
                className
            )}
        >
            <h3 className="text-lg font-semibold mb-4">Properties</h3>

            {renderMultiSelectionMessage()}

            <div className="space-y-4 overflow-y-auto flex-1">
                {properties.map((property) => {
                    return (
                        <div key={property.key}>
                            <Label className="text-sm font-medium flex items-center gap-2">
                                {property.key.charAt(0).toUpperCase() +
                                    property.key.slice(1)}
                                {!property.editable && (
                                    <span className="text-xs text-muted-foreground">
                                        (read-only)
                                    </span>
                                )}
                            </Label>
                            {property.type === "array" ? (
                                renderResourceManager(property.arrayValue || [])
                            ) : property.type === "boolean" ? (
                                <div className="flex items-center space-x-2 mt-1">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(property.value)}
                                        disabled={!property.editable}
                                        className={cn(
                                            "h-4 w-4 rounded border border-gray-300 dark:border-gray-600",
                                            !property.editable &&
                                                "opacity-50 cursor-not-allowed"
                                        )}
                                        onChange={(e) => {
                                            if (!property.editable) return;
                                            onPropertyChange(
                                                property.key,
                                                e.target.checked
                                            );
                                        }}
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {property.key === "isDependency"
                                            ? "Dependency"
                                            : "Enabled"}
                                    </span>
                                </div>
                            ) : property.options ? (
                                <Select
                                    value={String(property.value)}
                                    onValueChange={(value) => {
                                        if (!property.editable) return;
                                        onPropertyChange(property.key, value);
                                    }}
                                >
                                    <SelectTrigger className="nodrag text-xs h-6 dark:bg-zinc-700 mt-1">
                                        <SelectValue
                                            placeholder={property.key}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {property.options.map((opt) => (
                                            <SelectItem key={opt} value={opt}>
                                                {opt.charAt(0).toUpperCase() +
                                                    opt.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : property.isTextArea ? (
                                <Textarea
                                    value={String(property.value)}
                                    readOnly={!property.editable}
                                    className={cn(
                                        "mt-1",
                                        !property.editable &&
                                            "bg-muted text-muted-foreground"
                                    )}
                                    onChange={(e) => {
                                        if (!property.editable) return;
                                        onPropertyChange(
                                            property.key,
                                            e.target.value
                                        );
                                    }}
                                    rows={5}
                                />
                            ) : (
                                <Input
                                    type={
                                        property.type === "number"
                                            ? "number"
                                            : "text"
                                    }
                                    value={String(property.value)}
                                    readOnly={!property.editable}
                                    className={cn(
                                        "mt-1",
                                        !property.editable &&
                                            "bg-muted text-muted-foreground"
                                    )}
                                    onChange={(e) => {
                                        if (!property.editable) return;
                                        const newValue =
                                            property.type === "number"
                                                ? parseFloat(e.target.value) ||
                                                  0
                                                : e.target.value;
                                        onPropertyChange(
                                            property.key,
                                            newValue
                                        );
                                    }}
                                />
                            )}
                            <Separator className="mt-4" />
                        </div>
                    );
                })}

                {/* Special handling for ActivityNode resources */}
                {(() => {
                    const { selectedElements, nodes } = useStore.getState();
                    if (selectedElements.nodes.length === 1) {
                        const node = nodes.find(
                            (n) => n.id === selectedElements.nodes[0]
                        );
                        if (node && node.type === "activity") {
                            const resources = Array.isArray(
                                node.data?.resources
                            )
                                ? node.data.resources
                                : [];

                            const hasResourcesProperty = properties.some(
                                (p) => p.key === "resources"
                            );
                            if (!hasResourcesProperty) {
                                return (
                                    <div key="activity-resources">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            Resources
                                        </Label>
                                        {renderResourceManager(resources)}
                                        <Separator className="mt-4" />
                                    </div>
                                );
                            }
                        }
                    }
                    return null;
                })()}
            </div>
        </div>
    );
}
