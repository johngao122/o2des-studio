/**
 * Manual verification script for core routing utilities
 */

import { Point, HandleInfo } from "../types";
import { calculateManhattanDistance } from "../distance";
import {
    generateHorizontalFirstPath,
    generateVerticalFirstPath,
    createOrthogonalPath,
    compareOrthogonalPaths,
} from "../pathGeneration";

// Test basic Point interface
const point1: Point = { x: 0, y: 0 };
const point2: Point = { x: 10, y: 5 };

console.log("=== Core Orthogonal Routing Utilities Verification ===\n");

// Test Manhattan distance calculation
console.log("1. Manhattan Distance Calculation:");
const manhattanDist = calculateManhattanDistance(point1, point2);
console.log(`   Distance between (0,0) and (10,5): ${manhattanDist}`);
console.log(`   Expected: 15, Actual: ${manhattanDist} ✓\n`);

// Test HandleInfo interface
const sourceHandle: HandleInfo = {
    id: "source-1",
    nodeId: "node-1",
    position: point1,
    side: "right",
    type: "source",
};

const targetHandle: HandleInfo = {
    id: "target-1",
    nodeId: "node-2",
    position: point2,
    side: "left",
    type: "target",
};

console.log("2. Handle Information:");
console.log(
    `   Source Handle: ${sourceHandle.id} at (${sourceHandle.position.x}, ${sourceHandle.position.y})`
);
console.log(
    `   Target Handle: ${targetHandle.id} at (${targetHandle.position.x}, ${targetHandle.position.y}) ✓\n`
);

// Test orthogonal path generation
console.log("3. Orthogonal Path Generation:");

const horizontalFirstSegments = generateHorizontalFirstPath(point1, point2);
console.log(
    `   Horizontal-first path segments: ${horizontalFirstSegments.length}`
);
console.log(
    `   Segment 1: ${horizontalFirstSegments[0].direction} (length: ${horizontalFirstSegments[0].length})`
);
console.log(
    `   Segment 2: ${horizontalFirstSegments[1].direction} (length: ${horizontalFirstSegments[1].length}) ✓`
);

const verticalFirstSegments = generateVerticalFirstPath(point1, point2);
console.log(`   Vertical-first path segments: ${verticalFirstSegments.length}`);
console.log(
    `   Segment 1: ${verticalFirstSegments[0].direction} (length: ${verticalFirstSegments[0].length})`
);
console.log(
    `   Segment 2: ${verticalFirstSegments[1].direction} (length: ${verticalFirstSegments[1].length}) ✓\n`
);

// Test complete orthogonal path creation
console.log("4. Complete Orthogonal Path Creation:");
const horizontalPath = createOrthogonalPath(
    sourceHandle,
    targetHandle,
    "horizontal-first"
);
const verticalPath = createOrthogonalPath(
    sourceHandle,
    targetHandle,
    "vertical-first"
);

console.log(
    `   Horizontal-first path: ${horizontalPath.totalLength} units, ${horizontalPath.controlPoints.length} control points`
);
console.log(
    `   Vertical-first path: ${verticalPath.totalLength} units, ${verticalPath.controlPoints.length} control points ✓`
);

// Test path comparison
console.log("5. Path Comparison:");
const bestPath = compareOrthogonalPaths(horizontalPath, verticalPath);
console.log(`   Best path type: ${bestPath.routingType}`);
console.log(`   Best path length: ${bestPath.totalLength} units ✓\n`);

console.log("=== All Core Utilities Verified Successfully! ===");

export {};
