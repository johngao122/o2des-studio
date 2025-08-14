/**
 * Distance calculation utilities for orthogonal routing
 */

import { Point, HandleInfo } from "./types";

/**
 * Calculate Manhattan distance between two points
 * Manhattan distance is the sum of absolute differences of coordinates
 */
export function calculateManhattanDistance(
    point1: Point,
    point2: Point
): number {
    return Math.abs(point1.x - point2.x) + Math.abs(point1.y - point2.y);
}

/**
 * Calculate Manhattan distance between two handles
 */
export function calculateHandleManhattanDistance(
    sourceHandle: HandleInfo,
    targetHandle: HandleInfo
): number {
    return calculateManhattanDistance(
        sourceHandle.position,
        targetHandle.position
    );
}

/**
 * Calculate Euclidean distance between two points (for comparison purposes)
 */
export function calculateEuclideanDistance(
    point1: Point,
    point2: Point
): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the efficiency ratio of Manhattan vs Euclidean distance
 * Lower values indicate more efficient orthogonal routing
 */
export function calculateRoutingEfficiency(
    point1: Point,
    point2: Point
): number {
    const manhattanDist = calculateManhattanDistance(point1, point2);
    const euclideanDist = calculateEuclideanDistance(point1, point2);

    if (euclideanDist === 0) return 1;

    return manhattanDist / euclideanDist;
}
