import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AlertCircle, Plus, X } from "lucide-react";

interface MockProperty {
    key: string;
    value: string | number | boolean;
    type: "string" | "number" | "array" | "boolean" | "select" | "textarea";
    editable: boolean;
    options?: string[];
    arrayValue?: string[];
}

interface VisualPropertiesBarProps {
    className?: string;
    selectedComponent?: "generator" | "queue" | "server" | "multiple" | null;
    showMultiSelection?: boolean;
    multiSelectionInfo?: {
        nodes: number;
        edges: number;
    };
}

const mockProperties: Record<string, MockProperty[]> = {
    generator: [
        {
            key: "id",
            value: "generator_1",
            type: "string",
            editable: false,
        },
        {
            key: "label",
            value: "Customer Generator",
            type: "string",
            editable: true,
        },
        {
            key: "rate",
            value: 5,
            type: "number",
            editable: true,
        },
        {
            key: "units",
            value: "per minute",
            type: "select",
            editable: true,
            options: ["per second", "per minute", "per hour", "per day"],
        },
        {
            key: "enabled",
            value: true,
            type: "boolean",
            editable: true,
        },
        {
            key: "description",
            value: "Generates customer entities arriving at the system",
            type: "textarea",
            editable: true,
        },
    ],
    queue: [
        {
            key: "id",
            value: "queue_1",
            type: "string",
            editable: false,
        },
        {
            key: "label",
            value: "Waiting Queue",
            type: "string",
            editable: true,
        },
        {
            key: "capacity",
            value: 10,
            type: "number",
            editable: true,
        },
        {
            key: "discipline",
            value: "FIFO",
            type: "select",
            editable: true,
            options: ["FIFO", "LIFO", "Priority", "Random"],
        },
        {
            key: "enabled",
            value: true,
            type: "boolean",
            editable: true,
        },
        {
            key: "resources",
            value: "Staff, Equipment",
            type: "array",
            editable: true,
            arrayValue: ["Staff", "Equipment"],
        },
    ],
    server: [
        {
            key: "id",
            value: "server_1",
            type: "string",
            editable: false,
        },
        {
            key: "label",
            value: "Service Station",
            type: "string",
            editable: true,
        },
        {
            key: "serviceTime",
            value: 2.5,
            type: "number",
            editable: true,
        },
        {
            key: "distribution",
            value: "Exponential",
            type: "select",
            editable: true,
            options: ["Constant", "Exponential", "Normal", "Uniform"],
        },
        {
            key: "enabled",
            value: true,
            type: "boolean",
            editable: true,
        },
    ],
};

export function VisualPropertiesBar({
    className = "",
    selectedComponent = "generator",
    showMultiSelection = false,
    multiSelectionInfo = { nodes: 2, edges: 0 },
}: VisualPropertiesBarProps) {
    const [newResourceInput, setNewResourceInput] = React.useState("");

    const properties = selectedComponent
        ? mockProperties[selectedComponent] || []
        : [];

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
                                if (newResourceInput.trim()) {
                                    setNewResourceInput("");
                                }
                            }
                        }}
                    />
                    <Button
                        size="sm"
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
        if (!showMultiSelection) return null;

        const { nodes, edges } = multiSelectionInfo;

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

            {!showMultiSelection && properties.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No component selected</p>
                        <p className="text-xs">
                            Select a component to view properties
                        </p>
                    </div>
                </div>
            )}

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
                                        readOnly
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {property.key === "enabled"
                                            ? "Enabled"
                                            : "Active"}
                                    </span>
                                </div>
                            ) : property.type === "select" ? (
                                <Select
                                    value={String(property.value)}
                                    disabled={!property.editable}
                                >
                                    <SelectTrigger className="text-xs h-8 dark:bg-zinc-700 mt-1">
                                        <SelectValue
                                            placeholder={property.key}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {property.options?.map((opt) => (
                                            <SelectItem key={opt} value={opt}>
                                                {opt.charAt(0).toUpperCase() +
                                                    opt.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : property.type === "textarea" ? (
                                <Textarea
                                    value={String(property.value)}
                                    readOnly={true}
                                    className={cn(
                                        "mt-1 text-sm",
                                        !property.editable &&
                                            "bg-muted text-muted-foreground"
                                    )}
                                    rows={3}
                                />
                            ) : (
                                <Input
                                    type={
                                        property.type === "number"
                                            ? "number"
                                            : "text"
                                    }
                                    value={String(property.value)}
                                    readOnly={true}
                                    className={cn(
                                        "mt-1",
                                        !property.editable &&
                                            "bg-muted text-muted-foreground"
                                    )}
                                />
                            )}
                            <Separator className="mt-4" />
                        </div>
                    );
                })}
            </div>

            {/* Footer hint */}
            {!showMultiSelection && properties.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground text-center">
                        {selectedComponent &&
                            selectedComponent.charAt(0).toUpperCase() +
                                selectedComponent.slice(1)}{" "}
                        properties
                    </div>
                </div>
            )}
        </div>
    );
}
