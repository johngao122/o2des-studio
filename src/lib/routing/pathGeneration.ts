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
 * Generate path with perpendicular approach to target handle
 * This ensures the final segment always enters the target node perpendicular to its handle side
 */
export function generatePerpendicularApproachPath(
    sourceHandle: HandleInfo,
    targetHandle: HandleInfo,
    minApproachDistance: number = 30
): PathSegment[] {
    const segments: PathSegment[] = [];
    const start = sourceHandle.position;
    const end = targetHandle.position;

    if (start.x === end.x && start.y === end.y) {
        return segments;
    }

    // Calculate the approach point based on target handle side
    let approachPoint: Point;
    let finalSegmentDirection: "horizontal" | "vertical";

    switch (targetHandle.side) {
        case "right":
            // Approach from the right (horizontally)
            approachPoint = { x: end.x + minApproachDistance, y: end.y };
            finalSegmentDirection = "horizontal";
            break;
        case "left":
            // Approach from the left (horizontally)
            approachPoint = { x: end.x - minApproachDistance, y: end.y };
            finalSegmentDirection = "horizontal";
            break;
        case "top":
            // Approach from the top (vertically)
            approachPoint = { x: end.x, y: end.y - minApproachDistance };
            finalSegmentDirection = "vertical";
            break;
        case "bottom":
            // Approach from the bottom (vertically)
            approachPoint = { x: end.x, y: end.y + minApproachDistance };
            finalSegmentDirection = "vertical";
            break;
        default:
            approachPoint = { x: end.x + minApproachDistance, y: end.y };
            finalSegmentDirection = "horizontal";
    }

    // Check if we can go directly from source to approach point
    const needsIntermediate =
        Math.abs(start.x - approachPoint.x) > 0.1 &&
        Math.abs(start.y - approachPoint.y) > 0.1;

    if (!needsIntermediate) {
        // Direct path: source → approach point → target
        if (Math.abs(start.x - approachPoint.x) > 0.1) {
            // Horizontal segment to approach point
            segments.push({
                start,
                end: approachPoint,
                direction: "horizontal",
                length: Math.abs(approachPoint.x - start.x),
            });
        } else if (Math.abs(start.y - approachPoint.y) > 0.1) {
            // Vertical segment to approach point
            segments.push({
                start,
                end: approachPoint,
                direction: "vertical",
                length: Math.abs(approachPoint.y - start.y),
            });
        }
    } else {
        // Need intermediate corner: source → intermediate → approach point → target
        let intermediatePoint: Point;

        // Choose intermediate point based on final approach direction
        if (finalSegmentDirection === "horizontal") {
            // If final segment is horizontal, intermediate goes vertical first, then horizontal to approach
            intermediatePoint = { x: start.x, y: approachPoint.y };

            // Segment 1: source to intermediate (vertical)
            if (Math.abs(intermediatePoint.y - start.y) > 0.1) {
                segments.push({
                    start,
                    end: intermediatePoint,
                    direction: "vertical",
                    length: Math.abs(intermediatePoint.y - start.y),
                });
            }

            // Segment 2: intermediate to approach point (horizontal)
            if (Math.abs(approachPoint.x - intermediatePoint.x) > 0.1) {
                segments.push({
                    start: intermediatePoint,
                    end: approachPoint,
                    direction: "horizontal",
                    length: Math.abs(approachPoint.x - intermediatePoint.x),
                });
            }
        } else {
            // If final segment is vertical, intermediate goes horizontal first, then vertical to approach
            intermediatePoint = { x: approachPoint.x, y: start.y };

            // Segment 1: source to intermediate (horizontal)
            if (Math.abs(intermediatePoint.x - start.x) > 0.1) {
                segments.push({
                    start,
                    end: intermediatePoint,
                    direction: "horizontal",
                    length: Math.abs(intermediatePoint.x - start.x),
                });
            }

            // Segment 2: intermediate to approach point (vertical)
            if (Math.abs(approachPoint.y - intermediatePoint.y) > 0.1) {
                segments.push({
                    start: intermediatePoint,
                    end: approachPoint,
                    direction: "vertical",
                    length: Math.abs(approachPoint.y - intermediatePoint.y),
                });
            }
        }
    }

    // Final segment: approach point → target (perpendicular to handle)
    if (Math.abs(end.x - approachPoint.x) > 0.1 || Math.abs(end.y - approachPoint.y) > 0.1) {
        segments.push({
            start: approachPoint,
            end,
            direction: finalSegmentDirection,
            length: Math.abs(
                finalSegmentDirection === "horizontal"
                    ? end.x - approachPoint.x
                    : end.y - approachPoint.y
            ),
        });
    }

    return segments;
}

/**
 * Create orthogonal path with perpendicular approach to target
 */
export function createPerpendicularApproachPath(
    sourceHandle: HandleInfo,
    targetHandle: HandleInfo
): OrthogonalPath {
    const segments = generatePerpendicularApproachPath(
        sourceHandle,
        targetHandle
    );

    const totalLength = calculatePathLength(segments);
    let controlPoints = generateControlPoints(segments);

    // Handle edge case: same position
    if (segments.length === 0 &&
        sourceHandle.position.x === targetHandle.position.x &&
        sourceHandle.position.y === targetHandle.position.y) {
        controlPoints = [
            {
                x: sourceHandle.position.x,
                y: sourceHandle.position.y,
                type: "corner",
            },
        ];
    }

    const efficiency = calculateRoutingEfficiency(
        sourceHandle.position,
        targetHandle.position
    );

    return {
        segments,
        totalLength,
        routingType: "horizontal-first", // Not really used for perpendicular approach
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
