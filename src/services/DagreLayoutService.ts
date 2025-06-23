import dagre from "dagre";
import { BaseNode, BaseEdge } from "@/types/base";
import { snapToGrid } from "@/lib/utils/math";
import { redistributeControlPointsEvenly } from "@/lib/utils/edge";

export type FlowDirection = "TB" | "BT" | "LR" | "RL";

export interface DagreLayoutConfig {
    direction: FlowDirection;
    nodeSpacing: number;
    rankSpacing: number;
    marginX: number;
    marginY: number;
}

export class DagreLayoutService {
    private static instance: DagreLayoutService;

    private readonly defaultConfig: DagreLayoutConfig = {
        direction: "LR",
        nodeSpacing: 50,
        rankSpacing: 200,
        marginX: 50,
        marginY: 50,
    };

    private constructor() {}

    static getInstance(): DagreLayoutService {
        if (!DagreLayoutService.instance) {
            DagreLayoutService.instance = new DagreLayoutService();
        }
        return DagreLayoutService.instance;
    }

    /**
     * Get node dimensions safely
     */
    private getNodeDimensions(node: BaseNode): {
        width: number;
        height: number;
    } {
        return {
            width:
                node.data?.width ||
                (typeof node.style?.width === "number"
                    ? node.style.width
                    : 240),
            height:
                node.data?.height ||
                (typeof node.style?.height === "number"
                    ? node.style.height
                    : 120),
        };
    }

    /**
     * Layout nodes using Dagre algorithm
     */
    layoutNodes(
        nodes: BaseNode[],
        edges: BaseEdge[],
        config: Partial<DagreLayoutConfig> = {}
    ): { nodes: BaseNode[]; edges: BaseEdge[] } {
        const layoutConfig = { ...this.defaultConfig, ...config };

        const g = new dagre.graphlib.Graph();

        g.setGraph({
            rankdir: layoutConfig.direction,
            nodesep: layoutConfig.nodeSpacing,
            ranksep: layoutConfig.rankSpacing,
            marginx: layoutConfig.marginX,
            marginy: layoutConfig.marginY,

            acyclicer: "greedy",
            ranker: "tight-tree",
            align: "UL",
        });

        g.setDefaultEdgeLabel(() => ({}));

        nodes.forEach((node) => {
            const dimensions = this.getNodeDimensions(node);
            g.setNode(node.id, {
                width: dimensions.width,
                height: dimensions.height,
                label: node.id,
            });
        });

        edges.forEach((edge) => {
            if (!edge.data?.isDependency) {
                g.setEdge(edge.source, edge.target);
            }
        });

        dagre.layout(g);

        const layoutedNodes = nodes.map((node) => {
            const nodeLayout = g.node(node.id);
            if (nodeLayout) {
                const position = {
                    x: snapToGrid(nodeLayout.x - nodeLayout.width / 2),
                    y: snapToGrid(nodeLayout.y - nodeLayout.height / 2),
                };

                return {
                    ...node,
                    position,
                };
            }
            return node;
        });

        const straightenedEdges = this.straightenAllEdges(edges, layoutedNodes);

        return { nodes: layoutedNodes, edges: straightenedEdges };
    }

    /**
     * Straighten all edges by redistributing control points evenly
     * This runs AFTER Dagre positioning to ensure clean, straight connections
     */
    private straightenAllEdges(
        edges: BaseEdge[],
        nodes: BaseNode[]
    ): BaseEdge[] {
        return edges.map((edge) => {
            const sourceNode = nodes.find((node) => node.id === edge.source);
            const targetNode = nodes.find((node) => node.id === edge.target);

            if (!sourceNode || !targetNode) {
                return edge;
            }

            const sourceCoords = {
                x: sourceNode.position.x + (sourceNode.data?.width || 240) / 2,
                y: sourceNode.position.y + (sourceNode.data?.height || 120) / 2,
            };
            const targetCoords = {
                x: targetNode.position.x + (targetNode.data?.width || 240) / 2,
                y: targetNode.position.y + (targetNode.data?.height || 120) / 2,
            };

            const existingControlPoints = edge.data?.controlPoints || [];

            if (existingControlPoints.length > 0) {
                const redistributedPoints = redistributeControlPointsEvenly(
                    sourceCoords.x,
                    sourceCoords.y,
                    targetCoords.x,
                    targetCoords.y,
                    existingControlPoints
                );

                const resetData = { ...edge.data };

                if ("conditionLabelOffset" in resetData) {
                    resetData.conditionLabelOffset = { x: 0, y: -30 };
                }

                if ("delayPosition" in resetData) {
                    resetData.delayPosition = 0.25;
                }
                if ("parameterPosition" in resetData) {
                    resetData.parameterPosition = 0.75;
                }

                return {
                    ...edge,
                    data: {
                        ...resetData,
                        controlPoints: redistributedPoints,
                        edgeType: "straight",
                    },
                };
            }

            return edge;
        });
    }

    /**
     * Auto-layout selected nodes or all nodes if none selected
     */
    autoLayout(
        nodes: BaseNode[],
        edges: BaseEdge[],
        selectedNodeIds: string[] = [],
        config: Partial<DagreLayoutConfig> = {}
    ): { nodes: BaseNode[]; edges: BaseEdge[] } {
        const nodesToLayout =
            selectedNodeIds.length > 0
                ? nodes.filter((node) => selectedNodeIds.includes(node.id))
                : nodes;

        if (nodesToLayout.length === 0) {
            return { nodes, edges };
        }

        return this.layoutNodes(nodesToLayout, edges, config);
    }

    /**
     * Get optimal config based on graph characteristics
     */
    getOptimalConfig(
        nodes: BaseNode[],
        edges: BaseEdge[],
        direction: FlowDirection = "LR"
    ): DagreLayoutConfig {
        const avgNodeHeight =
            nodes.reduce((sum, node) => {
                const dims = this.getNodeDimensions(node);
                return sum + dims.height;
            }, 0) / nodes.length;

        const avgNodeWidth =
            nodes.reduce((sum, node) => {
                const dims = this.getNodeDimensions(node);
                return sum + dims.width;
            }, 0) / nodes.length;

        return {
            direction,
            nodeSpacing: Math.max(avgNodeHeight * 0.4, 50),
            rankSpacing:
                direction === "LR" || direction === "RL"
                    ? Math.max(avgNodeWidth * 1.5, 200)
                    : Math.max(avgNodeHeight * 1.5, 150),
            marginX: 50,
            marginY: 50,
        };
    }
}
