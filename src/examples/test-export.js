const fs = require("fs");
const path = require("path");

const depotDemoPath = path.join(
    __dirname,
    "../data/sample_data/Depot-Demo.json"
);
const depotDemo = JSON.parse(fs.readFileSync(depotDemoPath, "utf8"));

console.log("Loaded Depot-Demo.json");
console.log("Nodes:", depotDemo.json.nodes.length);
console.log("Edges:", depotDemo.json.edges.length);

console.log("\n=== NODE TYPES ===");
const nodeTypes = {};
depotDemo.json.nodes.forEach((node) => {
    nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
});
console.log(nodeTypes);

console.log("\n=== GENERATORS ===");
const generators = depotDemo.json.nodes.filter((n) => n.type === "generator");
generators.forEach((gen) => console.log(`- ${gen.name} (${gen.id})`));

console.log("\n=== ACTIVITIES WITH RESOURCES ===");
const activities = depotDemo.json.nodes.filter((n) => n.type === "activity");
activities.forEach((activity) => {
    if (activity.data.resources && activity.data.resources.length > 0) {
        console.log(
            `- ${activity.name}: [${activity.data.resources.join(", ")}]`
        );
    }
});

console.log("\n=== EDGE CONDITIONS ===");
depotDemo.json.edges.forEach((edge) => {
    if (edge.data.condition && edge.data.condition !== "True") {
        const source = depotDemo.json.nodes.find((n) => n.id === edge.source);
        const target = depotDemo.json.nodes.find((n) => n.id === edge.target);
        console.log(
            `${source?.name} -> ${target?.name}: ${edge.data.condition}`
        );
    }
});

console.log("\n=== DEPENDENCY EDGES ===");
depotDemo.json.edges.forEach((edge) => {
    if (edge.data.isDependency) {
        const source = depotDemo.json.nodes.find((n) => n.id === edge.source);
        const target = depotDemo.json.nodes.find((n) => n.id === edge.target);
        console.log(`${source?.name} -> ${target?.name} (dependency)`);
    }
});

console.log("\n=== MANUAL CONVERSION TEST ===");

const resourceSet = new Set();
activities.forEach((activity) => {
    if (activity.data.resources) {
        activity.data.resources.forEach((resource) =>
            resourceSet.add(resource)
        );
    }
});

console.log("Resources found:", Array.from(resourceSet));

console.log("\n=== GRAPH TRAVERSAL APPROACH ===");

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
    console.log(`\nDirect connections from generator: ${generator.name}`);
    const directEdges = depotDemo.json.edges.filter(
        (edge) => edge.source === generator.id && !edge.data.isDependency
    );

    directEdges.forEach((edge) => {
        const targetNode = depotDemo.json.nodes.find(
            (n) => n.id === edge.target
        );
        if (targetNode?.type === "activity") {
            console.log(`    - ${targetNode.name} (direct)`);
            activityToHandler.set(edge.target, generator.name);
        }
    });
});

generators.forEach((generator) => {
    console.log(`\nTraversing from generator: ${generator.name}`);
    const reachableActivities = findReachableActivities(
        generator.id,
        depotDemo.json.nodes,
        depotDemo.json.edges
    );

    console.log(`  Found ${reachableActivities.size} reachable activities:`);
    reachableActivities.forEach((activityId) => {
        const activity = depotDemo.json.nodes.find((n) => n.id === activityId);
        if (activity) {
            if (!activityToHandler.has(activityId)) {
                console.log(`    - ${activity.name} (reachable)`);
                activityToHandler.set(activityId, generator.name);
            } else {
                console.log(
                    `    - ${
                        activity.name
                    } (already assigned to ${activityToHandler.get(
                        activityId
                    )})`
                );
            }
        }
    });
});

const graphTraversalHandlerTypes = {};
activities.forEach((activity) => {
    const handlerType = activityToHandler.get(activity.id) || "Unknown";
    graphTraversalHandlerTypes[activity.name] = handlerType;
});

console.log("\n=== FINAL HANDLER TYPE MAPPING (Graph Traversal) ===");
Object.entries(graphTraversalHandlerTypes).forEach(
    ([activityName, handlerType]) => {
        console.log(`- ${activityName}: ${handlerType}`);
    }
);

const finalGroupedActivities = {};
Object.entries(graphTraversalHandlerTypes).forEach(
    ([activityName, handlerType]) => {
        if (!finalGroupedActivities[handlerType]) {
            finalGroupedActivities[handlerType] = [];
        }
        finalGroupedActivities[handlerType].push(activityName);
    }
);

console.log("\n=== ACTIVITIES BY HANDLER TYPE (Final) ===");
Object.entries(finalGroupedActivities).forEach(
    ([handlerType, activityNames]) => {
        console.log(`\n${handlerType} (${activityNames.length} activities):`);
        activityNames.forEach((name) => console.log(`  - ${name}`));
    }
);

console.log("\n=== ENTITY RELATIONSHIPS INFERENCE ===");
const entityTypes = new Set(["Truck", "Container", "RS(BA)"]);

const containerActivities = finalGroupedActivities["Container"] || [];
const hasContainerUsingRS = containerActivities.some((activityName) => {
    const activity = activities.find((a) => a.name === activityName);
    return activity?.data.resources?.includes("RS (BA)");
});

if (hasContainerUsingRS) {
    console.log("Container -> RS(BA) (container uses RS resources)");
}

console.log("\n=== FLOW DEPENDENCY ANALYSIS ===");
depotDemo.json.edges.forEach((edge) => {
    if (edge.data.isDependency) return;

    const sourceNode = depotDemo.json.nodes.find((n) => n.id === edge.source);
    const targetNode = depotDemo.json.nodes.find((n) => n.id === edge.target);

    if (sourceNode?.type === "activity" && targetNode?.type === "activity") {
        const sourceHandler = graphTraversalHandlerTypes[sourceNode.name];
        const targetHandler = graphTraversalHandlerTypes[targetNode.name];

        if (sourceHandler && targetHandler && sourceHandler !== targetHandler) {
            console.log(
                `${sourceHandler} -> ${targetHandler} (${sourceNode.name} → ${targetNode.name})`
            );
        }
    }
});

console.log("\n=== RESOURCE USAGE ANALYSIS ===");
Object.entries(finalGroupedActivities).forEach(
    ([handlerType, activityNames]) => {
        console.log(`\n${handlerType} activities using resources:`);
        activityNames.forEach((activityName) => {
            const activity = activities.find((a) => a.name === activityName);
            if (
                activity?.data.resources &&
                activity.data.resources.length > 0
            ) {
                console.log(
                    `  - ${activityName}: [${activity.data.resources.join(
                        ", "
                    )}]`
                );
            }
        });
    }
);
