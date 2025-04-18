import { useStore } from "../store";
import { BaseNode } from "../types/base";
import { NODE_TYPES, nodeTypes } from "@/components/nodes";

export class NodeController {
    addNode(node: BaseNode) {
        if (!node.graphType) {
            const nodeComponent =
                nodeTypes[node.type as keyof typeof nodeTypes];
            if (nodeComponent && (nodeComponent as any).getGraphType) {
                node.graphType = (nodeComponent as any).getGraphType();
            }
        }

        useStore.setState((state) => ({
            nodes: [...state.nodes, node],
        }));
    }

    removeNode(nodeId: string) {
        useStore.setState((state) => ({
            nodes: state.nodes.filter((node) => node.id !== nodeId),
        }));
    }

    updateNode(nodeId: string, updates: Partial<BaseNode>) {
        useStore.setState((state) => ({
            nodes: state.nodes.map((node) => {
                if (node.id === nodeId) {
                    const updatedNode = { ...node, ...updates };

                    if (!updatedNode.graphType) {
                        const nodeComponent =
                            nodeTypes[
                                updatedNode.type as keyof typeof nodeTypes
                            ];
                        if (
                            nodeComponent &&
                            (nodeComponent as any).getGraphType
                        ) {
                            updatedNode.graphType = (
                                nodeComponent as any
                            ).getGraphType();
                        }
                    }

                    return updatedNode;
                }
                return node;
            }),
        }));
    }

    getNode(nodeId: string): BaseNode | undefined {
        return useStore.getState().nodes.find((node) => node.id === nodeId);
    }

    updateAllNodesGraphType() {
        useStore.setState((state) => ({
            nodes: state.nodes.map((node) => {
                if (!node.graphType) {
                    const nodeComponent =
                        nodeTypes[node.type as keyof typeof nodeTypes];
                    if (nodeComponent && (nodeComponent as any).getGraphType) {
                        return {
                            ...node,
                            graphType: (nodeComponent as any).getGraphType(),
                        };
                    }
                }
                return node;
            }),
        }));
    }
}
