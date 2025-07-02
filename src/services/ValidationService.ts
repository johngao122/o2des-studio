import { BaseNode, BaseEdge } from "../types/base";

export class ValidationService {
    validateNode(node: BaseNode): boolean {
        if (!node.id || !node.type || !node.name) {
            return false;
        }

        if (
            typeof node.position.x !== "number" ||
            typeof node.position.y !== "number"
        ) {
            return false;
        }

        return true;
    }

    validateEdge(edge: BaseEdge): boolean {
        if (
            !edge.id ||
            !edge.source ||
            !edge.target ||
            !Array.isArray(edge.conditions)
        ) {
            return false;
        }

        return true;
    }

    validateModel(nodes: BaseNode[], edges: BaseEdge[]): boolean {
        if (!nodes.every((node) => this.validateNode(node))) {
            return false;
        }

        if (!edges.every((edge) => this.validateEdge(edge))) {
            return false;
        }

        const nodeIds = new Set(nodes.map((node) => node.id));
        if (
            !edges.every(
                (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
            )
        ) {
            return false;
        }

        return true;
    }
}
