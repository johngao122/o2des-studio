const fs = require("fs");
const path = require("path");

class ProjectExportService {
    static convertToStructuredModel(projectData) {
        const { nodes, edges } = projectData.json;

        const generators = nodes.filter((node) => node.type === "generator");
        const activities = nodes.filter((node) => node.type === "activity");

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

    static extractEntityRelationships(nodes, edges) {
        const relationships = [];
        const generators = nodes.filter((n) => n.type === "generator");
        const activities = nodes.filter((n) => n.type === "activity");

        const activityToHandler = new Map();

        generators.forEach((generator) => {
            const directEdges = edges.filter(
                (edge) =>
                    edge.source === generator.id && !edge.data.isDependency
            );
            directEdges.forEach((edge) => {
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (targetNode?.type === "activity") {
                    activityToHandler.set(edge.target, generator.name);
                }
            });
        });

        generators.forEach((generator) => {
            const reachableActivities = this.findReachableActivities(
                generator.id,
                nodes,
                edges
            );
            reachableActivities.forEach((activityId) => {
                if (!activityToHandler.has(activityId)) {
                    activityToHandler.set(activityId, generator.name);
                }
            });
        });

        activities.forEach((activity) => {
            const activityHandler = activityToHandler.get(activity.id);
            if (activityHandler && activity.data.resources) {
                activity.data.resources.forEach((resourceType) => {
                    const resourceGenerator = generators.find(
                        (g) => g.name === resourceType
                    );
                    if (resourceGenerator && activityHandler !== resourceType) {
                        const exists = relationships.some(
                            (rel) =>
                                rel.owner === activityHandler &&
                                rel.component === resourceType
                        );
                        if (!exists) {
                            relationships.push({
                                owner: activityHandler,
                                component: resourceType,
                            });
                        }
                    }
                });
            }
        });

        return relationships;
    }

    static extractResources(activities) {
        const resourceTypes = new Set();
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

    static convertActivities(nodes, edges) {
        const activities = nodes.filter((node) => node.type === "activity");
        const generators = nodes.filter((node) => node.type === "generator");

        const activityToHandler = new Map();

        generators.forEach((generator) => {
            const directEdges = edges.filter(
                (edge) =>
                    edge.source === generator.id && !edge.data.isDependency
            );
            directEdges.forEach((edge) => {
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (targetNode?.type === "activity") {
                    activityToHandler.set(edge.target, generator.name);
                }
            });
        });

        generators.forEach((generator) => {
            const reachableActivities = this.findReachableActivities(
                generator.id,
                nodes,
                edges
            );
            reachableActivities.forEach((activityId) => {
                if (!activityToHandler.has(activityId)) {
                    activityToHandler.set(activityId, generator.name);
                }
            });
        });

        return activities.map((node) => {
            const handlerType = activityToHandler.get(node.id) || "Unknown";
            const isInitial = this.isInitialActivity(node, edges, nodes);
            const requirements = this.extractRequirements(node);

            return {
                id: node.name,
                handlerType,
                attributes: isInitial ? { initial: true } : {},
                conditions: [],
                requirements,
                duration: {},
            };
        });
    }

    static findReachableActivities(startNodeId, nodes, edges) {
        const visited = new Set();
        const reachableActivities = new Set();
        const queue = [startNodeId];

        while (queue.length > 0) {
            const currentId = queue.shift();
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

    static isInitialActivity(node, edges, nodes) {
        const incomingEdges = edges.filter((edge) => edge.target === node.id);
        return incomingEdges.some((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            return sourceNode?.type === "generator";
        });
    }

    static extractRequirements(node) {
        if (!node.data.resources || node.data.resources.length === 0) {
            return [];
        }

        const resourceGroups = [...new Set(node.data.resources)];
        return resourceGroups.map((group) => ({
            resourceGroups: [group],
            quantity: 1,
        }));
    }

    static convertConnections(edges, nodes) {
        const connections = [];

        for (const edge of edges) {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);

            if (!sourceNode || !targetNode) continue;

            if (
                sourceNode.type === "terminator" ||
                targetNode.type === "terminator"
            )
                continue;

            if (edge.data.isDependency) continue;

            if (
                sourceNode.type === "generator" &&
                targetNode.type === "activity"
            )
                continue;

            connections.push({
                type: "",
                from: sourceNode.name,
                to: targetNode.name,
            });
        }

        return connections;
    }
}

const queueDemoPath = path.join(__dirname, "Queue_Demo.json");
const queueDemo = JSON.parse(fs.readFileSync(queueDemoPath, "utf8"));

console.log("=== CONVERTING QUEUE DEMO TO STRUCTURED MODEL ===");
const result = ProjectExportService.convertToStructuredModel(queueDemo);

console.log(JSON.stringify(result, null, 2));
