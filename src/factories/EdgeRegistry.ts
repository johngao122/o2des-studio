import { MarkerType } from "reactflow";
import { BaseEdge } from "../types/base";
import { edgeTypes } from "@/components/edges";
import { EDGE_TYPES } from "@/components/edges";

export type EdgeCreator = (
    source: string,
    target: string,
    sourceHandle?: string,
    targetHandle?: string,
    data?: any
) => Omit<BaseEdge, "id">;

export class EdgeRegistry {
    private static instance: EdgeRegistry;
    private edgeTypes: Map<string, EdgeCreator> = new Map();

    private constructor() {
        Object.entries(edgeTypes).forEach(([type, EdgeComponent]) => {
            const graphType = (EdgeComponent as any).getGraphType?.();

            this.register(
                type,
                (source, target, sourceHandle, targetHandle) => {
                    return {
                        source,
                        target,
                        sourceHandle,
                        targetHandle,
                        type,
                        graphType,
                        animated: graphType === "eventBased",

                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: "#ffffff",
                            width: 25,
                            height: 25
                        },

                        data: {
                            ...EdgeComponent.getDefaultData?.() || {},
                            arrowheadStyle: "filled",
                        },
                        conditions: [],
                    };
                }
            );
        });
    }

    static getInstance(): EdgeRegistry {
        if (!EdgeRegistry.instance) {
            EdgeRegistry.instance = new EdgeRegistry();
        }
        return EdgeRegistry.instance;
    }

    register(type: string, creator: EdgeCreator) {
        this.edgeTypes.set(type, creator);
    }

    getCreator(type: string): EdgeCreator | undefined {
        return this.edgeTypes.get(type);
    }

    hasType(type: string): boolean {
        return this.edgeTypes.has(type);
    }
}
