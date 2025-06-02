const fs = require("fs");
const path = require("path");

const depotDemoPath = path.join(
    __dirname,
    "../data/sample_data/Depot-Demo.json"
);
const depotDemo = JSON.parse(fs.readFileSync(depotDemoPath, "utf8"));

const nodeTypes = {};
depotDemo.json.nodes.forEach((node) => {
    nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
});

const generators = depotDemo.json.nodes.filter((n) => n.type === "generator");

const activities = depotDemo.json.nodes.filter((n) => n.type === "activity");

depotDemo.json.edges.forEach((edge) => {
    if (edge.data.condition && edge.data.condition !== "True") {
        const source = depotDemo.json.nodes.find((n) => n.id === edge.source);
        const target = depotDemo.json.nodes.find((n) => n.id === edge.target);
    }
});

depotDemo.json.edges.forEach((edge) => {
    if (edge.data.isDependency) {
        const source = depotDemo.json.nodes.find((n) => n.id === edge.source);
        const target = depotDemo.json.nodes.find((n) => n.id === edge.target);
    }
});

const resourceSet = new Set();
activities.forEach((activity) => {
    if (activity.data.resources) {
        activity.data.resources.forEach((resource) =>
            resourceSet.add(resource)
        );
    }
});

function findReachableActivities(startNodeId, nodes, edges) {
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

const activityToHandler = new Map();

generators.forEach((generator) => {
    const directEdges = depotDemo.json.edges.filter(
        (edge) => edge.source === generator.id && !edge.data.isDependency
    );

    directEdges.forEach((edge) => {
        const targetNode = depotDemo.json.nodes.find(
            (n) => n.id === edge.target
        );
        if (targetNode?.type === "activity") {
            activityToHandler.set(edge.target, generator.name);
        }
    });
});

generators.forEach((generator) => {
    const reachableActivities = findReachableActivities(
        generator.id,
        depotDemo.json.nodes,
        depotDemo.json.edges
    );

    reachableActivities.forEach((activityId) => {
        const activity = depotDemo.json.nodes.find((n) => n.id === activityId);
        if (activity) {
            if (!activityToHandler.has(activityId)) {
                activityToHandler.set(activityId, generator.name);
            }
        }
    });
});

const graphTraversalHandlerTypes = {};
activities.forEach((activity) => {
    const handlerType = activityToHandler.get(activity.id) || "Unknown";
    graphTraversalHandlerTypes[activity.name] = handlerType;
});

const finalGroupedActivities = {};
Object.entries(graphTraversalHandlerTypes).forEach(
    ([activityName, handlerType]) => {
        if (!finalGroupedActivities[handlerType]) {
            finalGroupedActivities[handlerType] = [];
        }
        finalGroupedActivities[handlerType].push(activityName);
    }
);

const entityTypes = new Set(["Truck", "Container", "RS(BA)"]);

const containerActivities = finalGroupedActivities["Container"] || [];
const hasContainerUsingRS = containerActivities.some((activityName) => {
    const activity = activities.find((a) => a.name === activityName);
    return activity?.data.resources?.includes("RS (BA)");
});

depotDemo.json.edges.forEach((edge) => {
    if (edge.data.isDependency) return;

    const sourceNode = depotDemo.json.nodes.find((n) => n.id === edge.source);
    const targetNode = depotDemo.json.nodes.find((n) => n.id === edge.target);

    if (sourceNode?.type === "activity" && targetNode?.type === "activity") {
        const sourceHandler = graphTraversalHandlerTypes[sourceNode.name];
        const targetHandler = graphTraversalHandlerTypes[targetNode.name];
    }
});

Object.entries(finalGroupedActivities).forEach(
    ([handlerType, activityNames]) => {
        activityNames.forEach((activityName) => {
            const activity = activities.find((a) => a.name === activityName);
        });
    }
);
