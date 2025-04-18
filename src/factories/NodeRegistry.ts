import { BaseNode } from "../types/base";
import { nodeTypes } from "@/components/nodes";
import { NODE_TYPES } from "@/components/nodes";

export type NodeCreator = (
    position: { x: number; y: number },
    data?: any
) => Omit<BaseNode, "id" | "type">;

export class NodeRegistry {
    private static instance: NodeRegistry;
    private nodeTypes: Map<string, NodeCreator> = new Map();

    private constructor() {
        Object.entries(nodeTypes).forEach(([type, NodeComponent]) => {
            this.register(type, (position) => {
                const graphType = (NodeComponent as any).getGraphType?.();

                return {
                    name: type.charAt(0).toUpperCase() + type.slice(1),
                    position,
                    graphType,

                    data: NodeComponent.getDefaultData?.() || {},
                };
            });
        });
    }

    static getInstance(): NodeRegistry {
        if (!NodeRegistry.instance) {
            NodeRegistry.instance = new NodeRegistry();
        }
        return NodeRegistry.instance;
    }

    register(type: string, creator: NodeCreator) {
        this.nodeTypes.set(type, creator);
    }

    getCreator(type: string): NodeCreator | undefined {
        return this.nodeTypes.get(type);
    }

    hasType(type: string): boolean {
        return this.nodeTypes.has(type);
    }
}
