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
 * Generate path with perpendicular approach to both source and target handles
 * This ensures edges always exit and enter nodes perpendicular to their handle sides
 */
export function generatePerpendicularApproachPath(
    sourceHandle: HandleInfo,
    targetHandle: HandleInfo,
    minExitDistance: number = 30,
    minApproachDistance: number = 30
): PathSegment[] {
    const segments: PathSegment[] = [];
    const start = sourceHandle.position;
    const end = targetHandle.position;

    if (start.x === end.x && start.y === end.y) {
        return segments;
    }

    let exitPoint: Point;
    let exitDirection: "horizontal" | "vertical";

    switch (sourceHandle.side) {
        case "right":
            exitPoint = { x: start.x + minExitDistance, y: start.y };
            exitDirection = "horizontal";
            break;
        case "left":
            exitPoint = { x: start.x - minExitDistance, y: start.y };
            exitDirection = "horizontal";
            break;
        case "top":
            exitPoint = { x: start.x, y: start.y - minExitDistance };
            exitDirection = "vertical";
            break;
        case "bottom":
            exitPoint = { x: start.x, y: start.y + minExitDistance };
            exitDirection = "vertical";
            break;
        default:
            exitPoint = { x: start.x + minExitDistance, y: start.y };
            exitDirection = "horizontal";
    }

    let approachPoint: Point;
    let approachDirection: "horizontal" | "vertical";

    switch (targetHandle.side) {
        case "right":
            approachPoint = { x: end.x + minApproachDistance, y: end.y };
            approachDirection = "horizontal";
            break;
        case "left":
            approachPoint = { x: end.x - minApproachDistance, y: end.y };
            approachDirection = "horizontal";
            break;
        case "top":
            approachPoint = { x: end.x, y: end.y - minApproachDistance };
            approachDirection = "vertical";
            break;
        case "bottom":
            approachPoint = { x: end.x, y: end.y + minApproachDistance };
            approachDirection = "vertical";
            break;
        default:
            approachPoint = { x: end.x + minApproachDistance, y: end.y };
            approachDirection = "horizontal";
    }

    segments.push({
        start,
        end: exitPoint,
        direction: exitDirection,
        length: Math.abs(
            exitDirection === "horizontal"
                ? exitPoint.x - start.x
                : exitPoint.y - start.y
        ),
    });

    const needsIntermediate =
        Math.abs(exitPoint.x - approachPoint.x) > 0.1 &&
        Math.abs(exitPoint.y - approachPoint.y) > 0.1;

    if (needsIntermediate) {
        if (exitDirection === approachDirection) {
            const midDirection: "horizontal" | "vertical" = exitDirection === "horizontal" ? "vertical" : "horizontal";
            const midPoint = exitDirection === "horizontal"
                ? { x: exitPoint.x, y: approachPoint.y }
                : { x: approachPoint.x, y: exitPoint.y };

            if (Math.abs(midPoint.x - exitPoint.x) > 0.1 || Math.abs(midPoint.y - exitPoint.y) > 0.1) {
                segments.push({
                    start: exitPoint,
                    end: midPoint,
                    direction: midDirection,
                    length: Math.abs(
                        midDirection === "horizontal"
                            ? midPoint.x - exitPoint.x
                            : midPoint.y - exitPoint.y
                    ),
                });
            }

            if (Math.abs(approachPoint.x - midPoint.x) > 0.1 || Math.abs(approachPoint.y - midPoint.y) > 0.1) {
                segments.push({
                    start: midPoint,
                    end: approachPoint,
                    direction: exitDirection,
                    length: Math.abs(
                        exitDirection === "horizontal"
                            ? approachPoint.x - midPoint.x
                            : approachPoint.y - midPoint.y
                    ),
                });
            }
        } else {
            const corner1 = exitDirection === "horizontal"
                ? { x: approachPoint.x, y: exitPoint.y }
                : { x: exitPoint.x, y: approachPoint.y };

            if (Math.abs(corner1.x - exitPoint.x) > 0.1 || Math.abs(corner1.y - exitPoint.y) > 0.1) {
                segments.push({
                    start: exitPoint,
                    end: corner1,
                    direction: exitDirection,
                    length: Math.abs(
                        exitDirection === "horizontal"
                            ? corner1.x - exitPoint.x
                            : corner1.y - exitPoint.y
                    ),
                });
            }

            if (Math.abs(approachPoint.x - corner1.x) > 0.1 || Math.abs(approachPoint.y - corner1.y) > 0.1) {
                segments.push({
                    start: corner1,
                    end: approachPoint,
                    direction: approachDirection,
                    length: Math.abs(
                        approachDirection === "horizontal"
                            ? approachPoint.x - corner1.x
                            : approachPoint.y - corner1.y
                    ),
                });
            }
        }
    } else if (Math.abs(exitPoint.x - approachPoint.x) > 0.1 || Math.abs(exitPoint.y - approachPoint.y) > 0.1) {
        segments.push({
            start: exitPoint,
            end: approachPoint,
            direction: exitDirection,
            length: Math.abs(
                exitDirection === "horizontal"
                    ? approachPoint.x - exitPoint.x
                    : approachPoint.y - exitPoint.y
            ),
        });
    }

    if (Math.abs(end.x - approachPoint.x) > 0.1 || Math.abs(end.y - approachPoint.y) > 0.1) {
        segments.push({
            start: approachPoint,
            end,
            direction: approachDirection,
            length: Math.abs(
                approachDirection === "horizontal"
                    ? end.x - approachPoint.x
                    : end.y - approachPoint.y
            ),
        });
    }

    return segments;
}

/**
 * Generate self-loop path for edges connecting a node to itself
 * Creates a rectangular loop that extends outward from the node
 */
export function generateSelfLoopPath(
    sourceHandle: HandleInfo,
    targetHandle: HandleInfo,
    loopExtension?: number,
    nodeBounds?: { width: number; height: number }
): PathSegment[] {
    // Calculate loop extension based on node size if not provided
    if (!loopExtension && nodeBounds) {
        // Use 100-120% of the average of width and height as extension
        // This creates a prominent, visible loop around the node
        const avgDimension = (nodeBounds.width + nodeBounds.height) / 2;
        loopExtension = avgDimension * 1.1; // 110% of average dimension
        // Clamp to reasonable bounds (minimum 60px, maximum 250px)
        loopExtension = Math.max(60, Math.min(loopExtension, 250));
    } else if (!loopExtension) {
        loopExtension = 80; // Default fallback (increased from 50)
    }
    const segments: PathSegment[] = [];
    const start = sourceHandle.position;
    const end = targetHandle.position;

    // Calculate loop extension based on handle positions and sides
    const sourceSide = sourceHandle.side;
    const targetSide = targetHandle.side;

    // Determine the loop rectangle corners based on handle sides
    let corner1: Point;
    let corner2: Point;

    if (sourceSide === "top" && targetSide === "top") {
        // Both on top - create upward loop
        corner1 = { x: start.x, y: start.y - loopExtension };
        corner2 = { x: end.x, y: end.y - loopExtension };
    } else if (sourceSide === "bottom" && targetSide === "bottom") {
        // Both on bottom - create downward loop
        corner1 = { x: start.x, y: start.y + loopExtension };
        corner2 = { x: end.x, y: end.y + loopExtension };
    } else if (sourceSide === "left" && targetSide === "left") {
        // Both on left - create leftward loop
        corner1 = { x: start.x - loopExtension, y: start.y };
        corner2 = { x: end.x - loopExtension, y: end.y };
    } else if (sourceSide === "right" && targetSide === "right") {
        // Both on right - create rightward loop
        corner1 = { x: start.x + loopExtension, y: start.y };
        corner2 = { x: end.x + loopExtension, y: end.y };
    } else if (sourceSide === "top" && targetSide === "left") {
        // Top to left - create corner loop
        corner1 = { x: start.x, y: start.y - loopExtension };
        corner2 = { x: end.x - loopExtension, y: corner1.y };
    } else if (sourceSide === "left" && targetSide === "top") {
        // Left to top - create corner loop
        corner1 = { x: start.x - loopExtension, y: start.y };
        corner2 = { x: corner1.x, y: end.y - loopExtension };
    } else if (sourceSide === "top" && targetSide === "right") {
        // Top to right - create corner loop
        corner1 = { x: start.x, y: start.y - loopExtension };
        corner2 = { x: end.x + loopExtension, y: corner1.y };
    } else if (sourceSide === "right" && targetSide === "top") {
        // Right to top - create corner loop
        corner1 = { x: start.x + loopExtension, y: start.y };
        corner2 = { x: corner1.x, y: end.y - loopExtension };
    } else if (sourceSide === "bottom" && targetSide === "left") {
        // Bottom to left - create corner loop
        corner1 = { x: start.x, y: start.y + loopExtension };
        corner2 = { x: end.x - loopExtension, y: corner1.y };
    } else if (sourceSide === "left" && targetSide === "bottom") {
        // Left to bottom - create corner loop
        corner1 = { x: start.x - loopExtension, y: start.y };
        corner2 = { x: corner1.x, y: end.y + loopExtension };
    } else if (sourceSide === "bottom" && targetSide === "right") {
        // Bottom to right - create corner loop
        corner1 = { x: start.x, y: start.y + loopExtension };
        corner2 = { x: end.x + loopExtension, y: corner1.y };
    } else if (sourceSide === "right" && targetSide === "bottom") {
        // Right to bottom - create corner loop
        corner1 = { x: start.x + loopExtension, y: start.y };
        corner2 = { x: corner1.x, y: end.y + loopExtension };
    } else if (sourceSide === "right" && targetSide === "left") {
        // Right to left - create rightward loop
        corner1 = { x: start.x + loopExtension, y: start.y };
        corner2 = { x: end.x - loopExtension, y: end.y };
    } else if (sourceSide === "left" && targetSide === "right") {
        // Left to right - create leftward loop
        corner1 = { x: start.x - loopExtension, y: start.y };
        corner2 = { x: end.x + loopExtension, y: end.y };
    } else if (sourceSide === "top" && targetSide === "bottom") {
        // Top to bottom - create upward loop
        corner1 = { x: start.x, y: start.y - loopExtension };
        corner2 = { x: end.x, y: end.y + loopExtension };
    } else if (sourceSide === "bottom" && targetSide === "top") {
        // Bottom to top - create downward loop
        corner1 = { x: start.x, y: start.y + loopExtension };
        corner2 = { x: end.x, y: end.y - loopExtension };
    } else {
        // Other combinations - create extended loop
        // Default to top-bottom loop
        corner1 = { x: start.x, y: start.y - loopExtension };
        corner2 = { x: end.x, y: end.y + loopExtension };
    }

    // Build the path segments
    // Segment 1: Exit from source
    const exitDirection = (sourceSide === "left" || sourceSide === "right") ? "horizontal" : "vertical";
    const exitLength = Math.abs(exitDirection === "horizontal" ? corner1.x - start.x : corner1.y - start.y);

    if (exitLength > 0.1) {
        segments.push({
            start,
            end: corner1,
            direction: exitDirection,
            length: exitLength,
        });
    }

    // Segment 2: Connect corners (if needed)
    const useExitDirection = exitLength > 0.1;
    const startPoint = useExitDirection ? corner1 : start;

    if (Math.abs(startPoint.x - corner2.x) > 0.1 && Math.abs(startPoint.y - corner2.y) > 0.1) {
        // Need an intermediate segment
        const intermediate = exitDirection === "horizontal"
            ? { x: corner2.x, y: startPoint.y }
            : { x: startPoint.x, y: corner2.y };

        const midLength = Math.abs(exitDirection === "horizontal" ? intermediate.y - startPoint.y : intermediate.x - startPoint.x);
        if (midLength > 0.1) {
            segments.push({
                start: startPoint,
                end: intermediate,
                direction: exitDirection === "horizontal" ? "vertical" : "horizontal",
                length: midLength,
            });
        }

        const finalLength = Math.abs(exitDirection === "horizontal" ? corner2.x - intermediate.x : corner2.y - intermediate.y);
        if (finalLength > 0.1) {
            segments.push({
                start: intermediate,
                end: corner2,
                direction: exitDirection,
                length: finalLength,
            });
        }
    } else if (Math.abs(startPoint.x - corner2.x) > 0.1 || Math.abs(startPoint.y - corner2.y) > 0.1) {
        // Direct connection between corners
        const direction = Math.abs(startPoint.x - corner2.x) > 0.1 ? "horizontal" : "vertical";
        const directLength = Math.abs(direction === "horizontal" ? corner2.x - startPoint.x : corner2.y - startPoint.y);
        if (directLength > 0.1) {
            segments.push({
                start: startPoint,
                end: corner2,
                direction,
                length: directLength,
            });
        }
    }

    // Final segment: Enter target
    const entryDirection = (targetSide === "left" || targetSide === "right") ? "horizontal" : "vertical";
    const entryLength = Math.abs(entryDirection === "horizontal" ? end.x - corner2.x : end.y - corner2.y);

    if (entryLength > 0.1) {
        segments.push({
            start: corner2,
            end,
            direction: entryDirection,
            length: entryLength,
        });
    }

    return segments;
}

/**
 * Create orthogonal path with perpendicular approach to both source and target
 */
export function createPerpendicularApproachPath(
    sourceHandle: HandleInfo,
    targetHandle: HandleInfo,
    sourceNodeBounds?: { width: number; height: number },
    targetNodeBounds?: { width: number; height: number }
): OrthogonalPath {
    const isSelfLoop = sourceHandle.nodeId === targetHandle.nodeId;

    let segments: PathSegment[];

    if (isSelfLoop) {
        segments = generateSelfLoopPath(sourceHandle, targetHandle, undefined, sourceNodeBounds);
    } else {
        const calculateExtension = (bounds?: { width: number; height: number }): number => {
            if (!bounds) return 30;
            const avgDimension = (bounds.width + bounds.height) / 2;
            const extension = avgDimension * 0.2;
            return Math.max(20, Math.min(extension, 80));
        };

        const minExitDistance = calculateExtension(sourceNodeBounds);
        const minApproachDistance = calculateExtension(targetNodeBounds);

        segments = generatePerpendicularApproachPath(
            sourceHandle,
            targetHandle,
            minExitDistance,
            minApproachDistance
        );
    }

    const totalLength = calculatePathLength(segments);
    let controlPoints = generateControlPoints(segments);

    // Handle edge case: same position (shouldn't happen for self-loops)
    if (!isSelfLoop && segments.length === 0 &&
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
