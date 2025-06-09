import { BaseNode, BaseEdge } from "@/types/base";
import { snapToGrid, getAllHandleCoordinates } from "@/lib/utils/math";
import { redistributeControlPointsEvenly } from "@/lib/utils/edge";

export interface LayoutConfig {
    generatorSpacing: number;
    horizontalSpacing: number;
    verticalSpacing: number;
    startX: number;
    startY: number;
}

export interface FlowChain {
    generator: BaseNode;
    nodes: BaseNode[];
    depth: number;
}

export class LayoutService {
    private static instance: LayoutService;

    private readonly defaultConfig: LayoutConfig = {
        generatorSpacing: 300,
        horizontalSpacing: 400,
        verticalSpacing: 200,
        startX: 100,
        startY: 100,
    };

    private constructor() {}

    static getInstance(): LayoutService {
        if (!LayoutService.instance) {
            LayoutService.instance = new LayoutService();
        }
        return LayoutService.instance;
    }

    /**
     * Layout nodes based on flow structure
     * Generators are aligned vertically, then their flows are laid out horizontally
     * Also straightens all edges by redistributing control points evenly
     */
    layoutNodes(
        nodes: BaseNode[],
        edges: BaseEdge[],
        config: Partial<LayoutConfig> = {}
    ): { nodes: BaseNode[]; edges: BaseEdge[] } {
        const layoutConfig = { ...this.defaultConfig, ...config };

        const generators = nodes.filter((node) => node.type === "generator");

        if (generators.length === 0) {
            return { nodes, edges };
        }

        const flowChains = generators.map((generator) =>
            this.buildFlowChain(generator, nodes, edges)
        );

        const positionedNodes = new Map<string, BaseNode>();

        flowChains.forEach((chain, index) => {
            const y =
                layoutConfig.startY + index * layoutConfig.generatorSpacing;
            const snappedY = snapToGrid(y);

            positionedNodes.set(chain.generator.id, {
                ...chain.generator,
                position: {
                    x: snapToGrid(layoutConfig.startX),
                    y: snappedY,
                },
            });
        });

        flowChains.forEach((chain) => {
            this.layoutFlowChain(chain, positionedNodes, layoutConfig, edges);
        });

        const layoutedNodes = nodes.map(
            (node) => positionedNodes.get(node.id) || node
        );

        const straightenedEdges = this.straightenAllEdges(edges, layoutedNodes);

        return { nodes: layoutedNodes, edges: straightenedEdges };
    }

    /**
     * Build a flow chain starting from a generator node
     */
    private buildFlowChain(
        generator: BaseNode,
        nodes: BaseNode[],
        edges: BaseEdge[]
    ): FlowChain {
        const visited = new Set<string>();
        const flowNodes: BaseNode[] = [];
        const nodeMap = new Map<string, BaseNode>(
            nodes.map((node) => [node.id, node])
        );

        const traverse = (nodeId: string, depth: number) => {
            if (visited.has(nodeId)) return depth;

            visited.add(nodeId);
            const node = nodeMap.get(nodeId);
            if (!node) return depth;

            flowNodes.push(node);

            const outgoingEdges = edges.filter(
                (edge) => edge.source === nodeId && !edge.data?.isDependency
            );

            let maxDepth = depth;
            outgoingEdges.forEach((edge) => {
                const childDepth = traverse(edge.target, depth + 1);
                maxDepth = Math.max(maxDepth, childDepth);
            });

            return maxDepth;
        };

        const maxDepth = traverse(generator.id, 0);

        return {
            generator,
            nodes: flowNodes,
            depth: maxDepth,
        };
    }

    /**
     * Layout nodes in a flow chain horizontally
     */
    private layoutFlowChain(
        chain: FlowChain,
        positionedNodes: Map<string, BaseNode>,
        config: LayoutConfig,
        edges: BaseEdge[]
    ): void {
        const { generator, nodes } = chain;
        const generatorNode = positionedNodes.get(generator.id);

        if (!generatorNode) return;

        const nodesByLevel = new Map<number, BaseNode[]>();
        const nodeDepths = new Map<string, number>();

        const queue = [{ nodeId: generator.id, depth: 0 }];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const { nodeId, depth } = queue.shift()!;

            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            const node = nodes.find((n) => n.id === nodeId);
            if (!node) continue;

            nodeDepths.set(nodeId, depth);

            if (!nodesByLevel.has(depth)) {
                nodesByLevel.set(depth, []);
            }
            nodesByLevel.get(depth)!.push(node);

            const outgoingEdges = edges.filter(
                (edge) => edge.source === nodeId && !edge.data?.isDependency
            );

            outgoingEdges.forEach((edge) => {
                if (!visited.has(edge.target)) {
                    queue.push({ nodeId: edge.target, depth: depth + 1 });
                }
            });
        }

        nodesByLevel.forEach((levelNodes, level) => {
            const x =
                generatorNode.position.x + level * config.horizontalSpacing;
            const snappedX = snapToGrid(x);

            levelNodes.forEach((node, index) => {
                let y = generatorNode.position.y;

                if (levelNodes.length > 1) {
                    const totalHeight =
                        (levelNodes.length - 1) * config.verticalSpacing;
                    const startY = generatorNode.position.y - totalHeight / 2;
                    y = startY + index * config.verticalSpacing;
                }

                positionedNodes.set(node.id, {
                    ...node,
                    position: {
                        x: snappedX,
                        y: snapToGrid(y),
                    },
                });
            });
        });
    }

    /**
     * Calculate the actual handle coordinates based on node position and handle ID
     */
    private getHandleCoordinates(
        node: BaseNode,
        handleId: string | null | undefined
    ): { x: number; y: number } {
        console.log(
            `getHandleCoordinates called for node ${node.id} with handleId: ${handleId}`
        );

        console.log(`Raw node.data:`, node.data);
        console.log(`node.data?.width:`, node.data?.width);
        console.log(`node.data?.height:`, node.data?.height);

        const nodeWidth = node.data?.width || 240;
        const nodeHeight = node.data?.height || 70;

        console.log(
            `Node dimensions: width=${nodeWidth}, height=${nodeHeight}, position=`,
            node.position
        );

        if (!handleId) {
            const centerCoords = {
                x: node.position.x + nodeWidth / 2,
                y: node.position.y + nodeHeight / 2,
            };
            console.log(
                `No handleId provided, returning center:`,
                centerCoords
            );
            return centerCoords;
        }

        const allHandles = getAllHandleCoordinates(
            node.position,
            { width: nodeWidth, height: nodeHeight },
            35
        );

        console.log(`All handles calculated:`, allHandles);

        const parts = handleId.split("-");
        const side = parts[1] as "top" | "bottom" | "left" | "right";
        const index = parseInt(parts[parts.length - 1]) || 0;

        console.log(
            `Parsed handleId "${handleId}": side=${side}, index=${index}, parts=`,
            parts
        );

        const sideHandles = allHandles[side];
        console.log(`Handles for side "${side}":`, sideHandles);

        if (sideHandles && index < sideHandles.length) {
            const handleCoords = sideHandles[index];
            console.log(`Found handle at index ${index}:`, handleCoords);
            return handleCoords;
        }

        const fallbackCoords = {
            x: node.position.x + nodeWidth / 2,
            y: node.position.y + nodeHeight / 2,
        };
        console.log(
            `Handle not found, returning fallback center:`,
            fallbackCoords
        );
        return fallbackCoords;
    }

    /**
     * Straighten all edges by redistributing their control points evenly along straight lines
     * Uses actual handle coordinates for dependency edges, node centers for flow edges
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

            const isDependencyEdge = edge.data?.isDependency === true;

            let sourceCoords: { x: number; y: number };
            let targetCoords: { x: number; y: number };

            if (isDependencyEdge) {
                sourceCoords = this.getHandleCoordinates(
                    sourceNode,
                    edge.sourceHandle
                );
                targetCoords = this.getHandleCoordinates(
                    targetNode,
                    edge.targetHandle
                );
            } else {
                sourceCoords = {
                    x:
                        sourceNode.position.x +
                        (sourceNode.data?.width || 200) / 2,
                    y:
                        sourceNode.position.y +
                        (sourceNode.data?.height || 120) / 2,
                };
                targetCoords = {
                    x:
                        targetNode.position.x +
                        (targetNode.data?.width || 200) / 2,
                    y:
                        targetNode.position.y +
                        (targetNode.data?.height || 120) / 2,
                };
            }

            const existingControlPoints = edge.data?.controlPoints || [];

            if (existingControlPoints.length > 0) {
                const redistributedPoints = redistributeControlPointsEvenly(
                    sourceCoords.x,
                    sourceCoords.y,
                    targetCoords.x,
                    targetCoords.y,
                    existingControlPoints
                );

                return {
                    ...edge,
                    data: {
                        ...edge.data,
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
        config: Partial<LayoutConfig> = {}
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
     * Get suggested layout config based on number of generators and flow depth
     */
    getOptimalConfig(nodes: BaseNode[], edges: BaseEdge[]): LayoutConfig {
        const generators = nodes.filter((node) => node.type === "generator");
        const maxFlowDepth = Math.max(
            ...generators.map(
                (gen) => this.buildFlowChain(gen, nodes, edges).depth
            )
        );

        return {
            ...this.defaultConfig,
            generatorSpacing: Math.max(200, generators.length > 5 ? 250 : 300),
            horizontalSpacing: Math.max(300, maxFlowDepth > 4 ? 350 : 400),
            verticalSpacing: 150,
            startX: 100,
            startY: 100,
        };
    }
}
