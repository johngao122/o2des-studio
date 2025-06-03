interface ProjectNode {
    id: string;
    type: string;
    name: string;
    data: {
        resources?: string[];
        duration?: string;
        width?: number;
        height?: number;
    };
    position: { x: number; y: number };
}

interface ProjectEdge {
    id: string;
    source: string;
    target: string;
    type: string;
    data: {
        edgeType?: string;
        condition?: string;
        isDependency?: boolean;
    };
}

interface ProjectGraph {
    nodes: ProjectNode[];
    edges: ProjectEdge[];
}

interface EntityRelationship {
    owner: string;
    component: string;
}

interface Resource {
    type: string;
    group: string;
    quantity: number;
}

interface ActivityRequirement {
    resourceGroups: string[];
    quantity: number;
}

interface Activity {
    id: string;
    handlerType: string;
    attributes: { initial?: boolean };
    conditions: Array<{ attribute: string; value: boolean | string }>;
    requirements: ActivityRequirement[];
    duration: object;
}

interface Connection {
    type: string;
    from: string;
    to: string;
}

interface OutputModel {
    scenario: string;
    description: string;
    model: {
        entityRelationships: EntityRelationship[];
        resources: Resource[];
        activities: Activity[];
        connections: Connection[];
    };
}

export class ProjectExportService {
    static convertToStructuredModel(projectData: {
        json: ProjectGraph;
    }): OutputModel {
        const { nodes, edges } = projectData.json;

        const generators = nodes.filter((node) => node.type === "generator");
        const activities = nodes.filter((node) => node.type === "activity");
        const terminators = nodes.filter((node) => node.type === "terminator");

        const entityRelationships = this.extractEntityRelationships(
            nodes,
            edges
        );
        const resources = this.extractResources(activities);
        const convertedActivities = this.convertActivities(nodes, edges);
        const connections = this.convertConnections(edges, nodes);

        return {
            scenario: "",
            description: "",
            model: {
                entityRelationships,
                resources,
                activities: convertedActivities,
                connections,
            },
        };
    }

    private static extractEntityRelationships(
        nodes: ProjectNode[],
        edges: ProjectEdge[]
    ): EntityRelationship[] {
        const relationships: EntityRelationship[] = [];
        const generators = nodes.filter((n) => n.type === "generator");
        const activities = nodes.filter((n) => n.type === "activity");

        const activityToHandler = new Map<string, string>();
        generators.forEach((generator) => {
            const reachableActivities = this.findAllReachableActivities(
                generator.id,
                nodes,
                edges
            );
            reachableActivities.forEach((activityId) => {
                activityToHandler.set(activityId, generator.name);
            });
        });

        const activeEntityTypes = new Set<string>();
        activityToHandler.forEach((handlerType) => {
            if (handlerType !== "Unknown") {
                activeEntityTypes.add(handlerType);
            }
        });

        for (const edge of edges) {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);

            if (
                sourceNode?.type === "activity" &&
                targetNode?.type === "generator" &&
                edge.data.isDependency
            ) {
                const sourceHandler = activityToHandler.get(sourceNode.id);

                if (
                    sourceHandler &&
                    sourceHandler !== targetNode.name &&
                    activeEntityTypes.has(sourceHandler) &&
                    activeEntityTypes.has(targetNode.name)
                ) {
                    const exists = relationships.some(
                        (rel) =>
                            rel.owner === sourceHandler &&
                            rel.component === targetNode.name
                    );

                    if (!exists) {
                        relationships.push({
                            owner: sourceHandler,
                            component: targetNode.name,
                        });
                    }
                }
            }

            if (
                sourceNode?.type === "generator" &&
                targetNode?.type === "activity"
            ) {
                const targetHandler = activityToHandler.get(targetNode.id);

                if (
                    targetHandler &&
                    sourceNode.name !== targetHandler &&
                    activeEntityTypes.has(sourceNode.name) &&
                    activeEntityTypes.has(targetHandler)
                ) {
                    const exists = relationships.some(
                        (rel) =>
                            rel.owner === sourceNode.name &&
                            rel.component === targetHandler
                    );

                    if (!exists) {
                        relationships.push({
                            owner: sourceNode.name,
                            component: targetHandler,
                        });
                    }
                }
            }
        }

        activities.forEach((activity) => {
            const activityHandler = activityToHandler.get(activity.id);

            if (activityHandler && activity.data.resources) {
                activity.data.resources.forEach((resourceType) => {
                    if (
                        activeEntityTypes.has(resourceType) ||
                        activeEntityTypes.has(resourceType.replace(" ", ""))
                    ) {
                        const normalizedResourceType = activeEntityTypes.has(
                            resourceType
                        )
                            ? resourceType
                            : Array.from(activeEntityTypes).find(
                                  (et) =>
                                      et.replace("(", "").replace(")", "") ===
                                      resourceType
                                          .replace(" ", "")
                                          .replace("(", "")
                                          .replace(")", "")
                              ) || resourceType;

                        if (
                            activityHandler !== normalizedResourceType &&
                            activeEntityTypes.has(normalizedResourceType)
                        ) {
                            const exists = relationships.some(
                                (rel) =>
                                    rel.owner === activityHandler &&
                                    rel.component === normalizedResourceType
                            );

                            if (!exists) {
                                relationships.push({
                                    owner: activityHandler,
                                    component: normalizedResourceType,
                                });
                            }
                        }
                    }
                });
            }
        });

        return relationships;
    }

    private static extractResources(activities: ProjectNode[]): Resource[] {
        const resourceTypes = new Set<string>();

        activities.forEach((activity) => {
            if (activity.data.resources) {
                activity.data.resources.forEach((resource) => {
                    resourceTypes.add(resource);
                });
            }
        });

        return Array.from(resourceTypes).map((type) => ({
            type,
            group: type,
            quantity: 0,
        }));
    }

    private static convertActivities(
        nodes: ProjectNode[],
        edges: ProjectEdge[]
    ): Activity[] {
        const activities = nodes.filter((node) => node.type === "activity");
        const generators = nodes.filter((node) => node.type === "generator");

        const activityToHandler = new Map<string, string>();

        generators.forEach((generator) => {
            const reachableActivities = this.findAllReachableActivities(
                generator.id,
                nodes,
                edges
            );
            reachableActivities.forEach((activityId) => {
                activityToHandler.set(activityId, generator.name);
            });
        });

        return activities.map((node) => {
            const handlerType = activityToHandler.get(node.id) || "Unknown";
            const isInitial = this.isInitialActivity(node, edges, nodes);
            const conditions = this.extractConditions(node, edges);
            const requirements = this.extractRequirements(node);

            return {
                id: node.name,
                handlerType,
                attributes: isInitial ? { initial: true } : {},
                conditions,
                requirements,
                duration: {},
            };
        });
    }

    private static findAllReachableActivities(
        startNodeId: string,
        nodes: ProjectNode[],
        edges: ProjectEdge[]
    ): Set<string> {
        const visited = new Set<string>();
        const reachableActivities = new Set<string>();
        const queue = [startNodeId];

        while (queue.length > 0) {
            const currentId = queue.shift()!;

            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const currentNode = nodes.find((n) => n.id === currentId);
            if (currentNode?.type === "activity") {
                reachableActivities.add(currentId);
            }

            const outgoingEdges = edges.filter(
                (edge) => edge.source === currentId && !edge.data.isDependency
            );

            outgoingEdges.forEach((edge) => {
                const targetNode = nodes.find((n) => n.id === edge.target);

                if (targetNode && targetNode.type !== "terminator") {
                    queue.push(edge.target);
                }
            });
        }

        return reachableActivities;
    }

    private static inferHandlerType(
        activityNode: ProjectNode,
        nodes: ProjectNode[],
        edges: ProjectEdge[]
    ): string {
        return "Unknown";
    }

    private static isInitialActivity(
        node: ProjectNode,
        edges: ProjectEdge[],
        nodes: ProjectNode[]
    ): boolean {
        const incomingEdges = edges.filter((edge) => edge.target === node.id);
        return incomingEdges.some((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            return sourceNode?.type === "generator";
        });
    }

    private static extractConditions(
        node: ProjectNode,
        edges: ProjectEdge[]
    ): Array<{ attribute: string; value: boolean | string }> {
        const conditions: Array<{
            attribute: string;
            value: boolean | string;
        }> = [];

        const incomingEdges = edges.filter((edge) => edge.target === node.id);

        for (const edge of incomingEdges) {
            if (edge.data.condition && edge.data.condition !== "True") {
                const conditionText = edge.data.condition;

                const match = conditionText.match(/(.+?)\s*=\s*(.+)/);
                if (match) {
                    const attribute = match[1].trim();
                    const valueStr = match[2].trim();
                    const value =
                        valueStr === "True"
                            ? true
                            : valueStr === "False"
                            ? false
                            : valueStr;

                    conditions.push({ attribute, value });
                }
            }
        }

        return conditions;
    }

    private static extractRequirements(
        node: ProjectNode
    ): ActivityRequirement[] {
        if (!node.data.resources || node.data.resources.length === 0) {
            return [];
        }

        const resourceGroups = [...new Set(node.data.resources)];
        return resourceGroups.map((group) => ({
            resourceGroups: [group],
            quantity: 1,
        }));
    }

    private static convertConnections(
        edges: ProjectEdge[],
        nodes: ProjectNode[]
    ): Connection[] {
        const connections: Connection[] = [];

        const startToInflowConnections = this.findStartToInflowConnections(
            edges,
            nodes
        );
        connections.push(...startToInflowConnections);

        const dependencyConnections = this.convertDependencyConnections(
            edges,
            nodes
        );
        connections.push(...dependencyConnections);

        const flowConnections = this.convertFlowConnections(edges, nodes);
        connections.push(...flowConnections);

        return connections;
    }

    private static findStartToInflowConnections(
        edges: ProjectEdge[],
        nodes: ProjectNode[]
    ): Connection[] {
        const connections: Connection[] = [];
        const connectionSet = new Set<string>();

        for (const edge1 of edges) {
            const sourceNode = nodes.find((n) => n.id === edge1.source);
            const intermediateNode = nodes.find((n) => n.id === edge1.target);

            if (
                sourceNode?.type === "activity" &&
                intermediateNode?.type === "generator"
            ) {
                for (const edge2 of edges) {
                    if (edge2.data.isDependency) continue;

                    if (edge2.source === intermediateNode.id) {
                        const targetNode = nodes.find(
                            (n) => n.id === edge2.target
                        );

                        if (targetNode?.type === "activity") {
                            const connectionKey = `${sourceNode.name}->${targetNode.name}`;
                            if (!connectionSet.has(connectionKey)) {
                                connectionSet.add(connectionKey);
                                connections.push({
                                    type: "StartToInflow",
                                    from: sourceNode.name,
                                    to: targetNode.name,
                                });
                            }
                        }
                    }
                }
            }
        }

        return connections;
    }

    private static convertDependencyConnections(
        edges: ProjectEdge[],
        nodes: ProjectNode[]
    ): Connection[] {
        const connections: Connection[] = [];

        for (const edge of edges) {
            if (!edge.data.isDependency) continue;

            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);

            if (!sourceNode || !targetNode) continue;
            if (
                sourceNode.type !== "activity" ||
                targetNode.type !== "activity"
            )
                continue;

            let connectionType = "FinishToFinish";

            const sourceHandle = (edge as any).sourceHandle || "";
            const targetHandle = (edge as any).targetHandle || "";

            if (
                this.isLeftHandle(sourceHandle) &&
                this.isLeftHandle(targetHandle)
            ) {
                connectionType = "StartToStart";
            } else if (
                this.isRightHandle(sourceHandle) &&
                this.isRightHandle(targetHandle)
            ) {
                connectionType = "FinishToFinish";
            }

            connections.push({
                type: connectionType,
                from: sourceNode.name,
                to: targetNode.name,
            });
        }

        return connections;
    }

    private static isLeftHandle(handle: string): boolean {
        const leftIndicators = ["left"];
        return leftIndicators.some((indicator) =>
            handle.toLowerCase().includes(indicator)
        );
    }

    private static isRightHandle(handle: string): boolean {
        const rightIndicators = ["right"];
        return rightIndicators.some((indicator) =>
            handle.toLowerCase().includes(indicator)
        );
    }

    private static convertFlowConnections(
        edges: ProjectEdge[],
        nodes: ProjectNode[]
    ): Connection[] {
        const connections: Connection[] = [];

        for (const edge of edges) {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);

            if (!sourceNode || !targetNode) continue;

            if (edge.data.isDependency) continue;

            if (
                sourceNode.type === "terminator" ||
                targetNode.type === "terminator"
            )
                continue;

            if (
                sourceNode.type === "generator" &&
                targetNode.type === "activity"
            )
                continue;

            if (
                sourceNode.type === "activity" &&
                targetNode.type === "activity"
            ) {
                connections.push({
                    type: "Flow",
                    from: sourceNode.name,
                    to: targetNode.name,
                });
            }
        }

        return connections;
    }

    private static getResourceRequirements(
        nodes: ProjectNode[]
    ): Record<string, Set<string>> {
        const requirements: Record<string, Set<string>> = {};

        nodes
            .filter((n) => n.type === "activity")
            .forEach((node) => {
                const handlerType = this.inferHandlerType(node, nodes, []);
                if (!requirements[handlerType]) {
                    requirements[handlerType] = new Set();
                }

                if (node.data.resources) {
                    node.data.resources.forEach((resource) => {
                        requirements[handlerType].add(resource);
                    });
                }
            });

        return Object.fromEntries(
            Object.entries(requirements).map(([key, value]) => [key, value])
        );
    }
}
