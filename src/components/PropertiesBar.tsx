import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Property {
    key: string;
    value: string | number;
    type: "string" | "number";
    editable: boolean;
    isTextArea?: boolean;
    options?: string[];
}

interface PropertiesBarProps {
    properties: Property[];
    onPropertyChange: (key: string, value: string | number) => void;
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
        <div className={cn("w-64 bg-background p-4 border-l", className)}>
            <h3 className="text-lg font-semibold mb-4">Properties</h3>

            {renderMultiSelectionMessage()}

            <div className="space-y-4">
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
                            {property.options ? (
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
                                    type={property.type}
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
            </div>
        </div>
    );
}
