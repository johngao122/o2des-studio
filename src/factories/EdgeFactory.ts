import { BaseEdge } from "../types/base";
import { nanoid } from "nanoid";
import { EdgeRegistry, EdgeCreator } from "./EdgeRegistry";

export class EdgeFactory {
    private registry: EdgeRegistry;

    constructor() {
        this.registry = EdgeRegistry.getInstance();
    }

    registerEdgeType(type: string, creator: EdgeCreator) {
        this.registry.register(type, creator);
    }

    createEdge(
        type: string,
        source: string,
        target: string,
        sourceHandle?: string,
        targetHandle?: string,
        data?: any
    ): BaseEdge {
        const creator = this.registry.getCreator(type);
        if (!creator) {
            throw new Error(`Edge type ${type} is not registered`);
        }

        const edge = creator(source, target, sourceHandle, targetHandle, data);
        return {
            ...edge,
            id: nanoid(),
        };
    }
}
