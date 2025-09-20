/**
 * Orthogonal path segment generation utilities
 */

import {
    Point,
    PathSegment,
    OrthogonalPath,
    ControlPoint,
    HandleInfo,
} from "./types";
import { calculateRoutingEfficiency } from "./distance";
import { ORTHOGONAL_ALIGNMENT_TOLERANCE } from "./constants";

function applyAlignmentTolerance(start: Point, end: Point): {
    start: Point;
    end: Point;
} {
    const adjustedStart = { ...start };
    const adjustedEnd = { ...end };

    if (Math.abs(adjustedStart.y - adjustedEnd.y) <= ORTHOGONAL_ALIGNMENT_TOLERANCE) {
        const alignedY = (adjustedStart.y + adjustedEnd.y) / 2;
        adjustedStart.y = alignedY;
        adjustedEnd.y = alignedY;
    }

    if (Math.abs(adjustedStart.x - adjustedEnd.x) <= ORTHOGONAL_ALIGNMENT_TOLERANCE) {
        const alignedX = (adjustedStart.x + adjustedEnd.x) / 2;
        adjustedStart.x = alignedX;
        adjustedEnd.x = alignedX;
    }

    return { start: adjustedStart, end: adjustedEnd };
}

/**
 * Generate horizontal-first orthogonal path between two points
 */
export function generateHorizontalFirstPath(
    start: Point,
    end: Point
): PathSegment[] {
    const segments: PathSegment[] = [];

    if (start.x === end.x && start.y === end.y) {
        return segments;
    }

    if (start.y === end.y) {
        segments.push({
            start,
            end,
            direction: "horizontal",
            length: Math.abs(end.x - start.x),
        });
        return segments;
    }

    if (start.x === end.x) {
        segments.push({
            start,
            end,
            direction: "vertical",
            length: Math.abs(end.y - start.y),
        });
        return segments;
    }

    const cornerPoint: Point = { x: end.x, y: start.y };

    segments.push({
        start,
        end: cornerPoint,
        direction: "horizontal",
        length: Math.abs(end.x - start.x),
    });

    segments.push({
        start: cornerPoint,
        end,
        direction: "vertical",
        length: Math.abs(end.y - start.y),
    });

    return segments;
}

/**
 * Generate vertical-first orthogonal path between two points
 */
export function generateVerticalFirstPath(
    start: Point,
    end: Point
): PathSegment[] {
    const segments: PathSegment[] = [];

    if (start.x === end.x && start.y === end.y) {
        return segments;
    }

    if (start.x === end.x) {
        segments.push({
            start,
            end,
            direction: "vertical",
            length: Math.abs(end.y - start.y),
        });
        return segments;
    }

    if (start.y === end.y) {
        segments.push({
            start,
            end,
            direction: "horizontal",
            length: Math.abs(end.x - start.x),
        });
        return segments;
    }

    const cornerPoint: Point = { x: start.x, y: end.y };

    segments.push({
        start,
        end: cornerPoint,
        direction: "vertical",
        length: Math.abs(end.y - start.y),
    });

    segments.push({
        start: cornerPoint,
        end,
        direction: "horizontal",
        length: Math.abs(end.x - start.x),
    });

    return segments;
}

/**
 * Calculate total length of path segments
 */
export function calculatePathLength(segments: PathSegment[]): number {
    return segments.reduce((total, segment) => total + segment.length, 0);
}

/**
 * Generate control points from path segments
 */
export function generateControlPoints(segments: PathSegment[]): ControlPoint[] {
    const controlPoints: ControlPoint[] = [];

    if (segments.length === 0) {
        return controlPoints;
    }

    controlPoints.push({
        x: segments[0].start.x,
        y: segments[0].start.y,
        type: "corner",
    });

    for (let i = 0; i < segments.length - 1; i++) {
        const currentSegment = segments[i];
        controlPoints.push({
            x: currentSegment.end.x,
            y: currentSegment.end.y,
            type: "corner",
        });
    }

    const lastSegment = segments[segments.length - 1];
    controlPoints.push({
        x: lastSegment.end.x,
        y: lastSegment.end.y,
        type: "corner",
    });

    return controlPoints;
}

/**
 * Create complete orthogonal path from handles
 */
export function createOrthogonalPath(
    sourceHandle: HandleInfo,
    targetHandle: HandleInfo,
    routingType: "horizontal-first" | "vertical-first"
): OrthogonalPath {
    const { start, end } = applyAlignmentTolerance(
        sourceHandle.position,
        targetHandle.position
    );

    const segments =
        routingType === "horizontal-first"
            ? generateHorizontalFirstPath(start, end)
            : generateVerticalFirstPath(start, end);

    const totalLength = calculatePathLength(segments);
    let controlPoints = generateControlPoints(segments);

    if (segments.length === 0 && start.x === end.x && start.y === end.y) {
        controlPoints = [
            {
                x: start.x,
                y: start.y,
                type: "corner",
            },
        ];
    }

    const efficiency = calculateRoutingEfficiency(start, end);

    return {
        segments,
        totalLength,
        routingType,
        efficiency,
        controlPoints,
    };
}

/**
 * Compare two orthogonal paths and return the more efficient one
 */
export function compareOrthogonalPaths(
    horizontalFirst: OrthogonalPath,
    verticalFirst: OrthogonalPath
): OrthogonalPath {
    if (horizontalFirst.totalLength < verticalFirst.totalLength) {
        return horizontalFirst;
    } else if (verticalFirst.totalLength < horizontalFirst.totalLength) {
        return verticalFirst;
    }

    return horizontalFirst;
}
