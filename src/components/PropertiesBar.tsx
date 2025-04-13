import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Property {
    key: string;
    value: string | number;
    type: "string" | "number";
    editable: boolean;
}

interface PropertiesBarProps {
    properties: Property[];
    onPropertyChange: (key: string, value: string | number) => void;
    className?: string;
}

export function PropertiesBar({
    properties,
    onPropertyChange,
    className,
}: PropertiesBarProps) {
    console.log("PropertiesBar Render:", {
        receivedProperties: properties,
        propertyKeys: properties.map((p) => p.key),
        propertyTypes: properties.map((p) => p.type),
    });

    return (
        <div className={cn("w-64 bg-background p-4 border-l", className)}>
            <h3 className="text-lg font-semibold mb-4">Properties</h3>
            <div className="space-y-4">
                {properties.map((property) => {
                    console.log("Rendering property:", property);
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
                                            ? parseFloat(e.target.value) || 0
                                            : e.target.value;
                                    console.log("Property change:", {
                                        key: property.key,
                                        oldValue: property.value,
                                        newValue,
                                        type: property.type,
                                    });
                                    onPropertyChange(property.key, newValue);
                                }}
                            />
                            <Separator className="mt-4" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
