import { useStore } from "../store";
import { BaseEdge } from "../types/base";
import { EDGE_TYPES, edgeTypes } from "@/components/edges";

export class EdgeController {
    addEdge(edge: BaseEdge) {
        if (!edge.graphType) {
            if (edge.type) {
                const edgeComponent =
                    edgeTypes[edge.type as keyof typeof edgeTypes];
                if (edgeComponent && (edgeComponent as any).getGraphType) {
                    edge.graphType = (edgeComponent as any).getGraphType();
                }
            }

            if (!edge.graphType && edge.type) {
                if (edge.type === "eventGraph") {
                    edge.graphType = "eventBased";
                }
            }
        }

        useStore.setState((state) => ({
            edges: [...state.edges, edge],
        }));
    }

    removeEdge(edgeId: string) {
        useStore.setState((state) => ({
            edges: state.edges.filter((edge) => edge.id !== edgeId),
        }));
    }

    updateEdge(edgeId: string, updates: Partial<BaseEdge>) {
        useStore.setState((state) => ({
            edges: state.edges.map((edge) => {
                if (edge.id === edgeId) {
                    const updatedEdge = { ...edge, ...updates };

                    if (!updatedEdge.graphType) {
                        const edgeComponent =
                            edgeTypes[
                                updatedEdge.type as keyof typeof edgeTypes
                            ];
                        if (
                            edgeComponent &&
                            (edgeComponent as any).getGraphType
                        ) {
                            updatedEdge.graphType = (
                                edgeComponent as any
                            ).getGraphType();
                        }
                    }

                    return updatedEdge;
                }
                return edge;
            }),
        }));
    }

    getEdge(edgeId: string): BaseEdge | undefined {
        return useStore.getState().edges.find((edge) => edge.id === edgeId);
    }

    getConnectedEdges(nodeId: string): BaseEdge[] {
        return useStore
            .getState()
            .edges.filter(
                (edge) => edge.source === nodeId || edge.target === nodeId
            );
    }

    updateAllEdgesGraphType() {
        useStore.setState((state) => ({
            edges: state.edges.map((edge) => {
                if (!edge.graphType) {
                    const edgeComponent =
                        edgeTypes[edge.type as keyof typeof edgeTypes];
                    if (edgeComponent && (edgeComponent as any).getGraphType) {
                        return {
                            ...edge,
                            graphType: (edgeComponent as any).getGraphType(),
                        };
                    }
                }
                return edge;
            }),
        }));
    }
}
