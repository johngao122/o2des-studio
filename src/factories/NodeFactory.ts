import { BaseNode } from "../types/base";
import { nanoid } from "nanoid";
import { NodeRegistry, NodeCreator } from "./NodeRegistry";

export class NodeFactory {
    private registry: NodeRegistry;

    constructor() {
        this.registry = NodeRegistry.getInstance();
    }

    registerNodeType(type: string, creator: NodeCreator) {
        this.registry.register(type, creator);
    }

    createNode(
        type: string,
        position: { x: number; y: number },
        data?: any
    ): BaseNode {
        const creator = this.registry.getCreator(type);
        if (!creator) {
            throw new Error(`Node type ${type} is not registered`);
        }

        const id = nanoid();
        const node = creator(position, data);
        return {
            ...node,
            id,
            type,
            name: `${
                type.charAt(0).toUpperCase() + type.slice(1)
            } ${id.substring(0, 6)}`,
        };
    }
}
