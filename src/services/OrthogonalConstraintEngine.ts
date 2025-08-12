import { Point } from "../lib/routing/types";
import { EdgeSegment, SegmentDragConstraints } from "./SegmentDragHandler";
import { snapToGrid } from "../lib/utils/math";

export interface MovementConstraint {
    axis: "x" | "y" | "both" | "none";
    snapToGrid: boolean;
    preserveLength?: boolean;
    minDistance?: number;
    maxDistance?: number;
}

export interface ConstraintValidationResult {
    isValid: boolean;
    adjustedPosition: Point;
    violatedConstraints: string[];
    suggestions: string[];
}

export interface OrthogonalValidation {
    isOrthogonal: boolean;
    nonOrthogonalSegments: string[];
    correctionSuggestions: { segmentId: string; suggestedFix: Point }[];
}

export class OrthogonalConstraintEngine {
    private static instance: OrthogonalConstraintEngine;
    private readonly GRID_SIZE = 20;
    private readonly MIN_SEGMENT_LENGTH = 40;
    private readonly ORTHOGONAL_TOLERANCE = 2;

    public static getInstance(): OrthogonalConstraintEngine {
        if (!OrthogonalConstraintEngine.instance) {
            OrthogonalConstraintEngine.instance =
                new OrthogonalConstraintEngine();
        }
        return OrthogonalConstraintEngine.instance;
    }

    /**
     * Apply movement constraints based on segment type and direction
     */
    public applyMovementConstraints(
        originalPosition: Point,
        proposedPosition: Point,
        segment: EdgeSegment,
        constraints: MovementConstraint
    ): ConstraintValidationResult {
        let adjustedPosition = { ...proposedPosition };
        const violatedConstraints: string[] = [];
        const suggestions: string[] = [];

        if (segment.direction === "horizontal" && constraints.axis !== "both") {
            adjustedPosition.x = originalPosition.x;
            if (proposedPosition.x !== originalPosition.x) {
                violatedConstraints.push("horizontal-segment-x-movement");
                suggestions.push(
                    "Horizontal segments can only move up or down"
                );
            }
        } else if (
            segment.direction === "vertical" &&
            constraints.axis !== "both"
        ) {
            adjustedPosition.y = originalPosition.y;
            if (proposedPosition.y !== originalPosition.y) {
                violatedConstraints.push("vertical-segment-y-movement");
                suggestions.push(
                    "Vertical segments can only move left or right"
                );
            }
        }

        if (constraints.snapToGrid) {
            adjustedPosition = this.snapToGrid(adjustedPosition);
        }

        if (constraints.minDistance !== undefined) {
            const distance = this.calculateDistance(
                originalPosition,
                adjustedPosition
            );
            if (distance < constraints.minDistance) {
                violatedConstraints.push("minimum-distance");
                suggestions.push(
                    `Movement must be at least ${constraints.minDistance}px`
                );
            }
        }

        if (constraints.maxDistance !== undefined) {
            const distance = this.calculateDistance(
                originalPosition,
                adjustedPosition
            );
            if (distance > constraints.maxDistance) {
                const direction = this.normalizeVector({
                    x: adjustedPosition.x - originalPosition.x,
                    y: adjustedPosition.y - originalPosition.y,
                });

                adjustedPosition = {
                    x:
                        originalPosition.x +
                        direction.x * constraints.maxDistance,
                    y:
                        originalPosition.y +
                        direction.y * constraints.maxDistance,
                };
                violatedConstraints.push("maximum-distance");
                suggestions.push(
                    `Movement limited to ${constraints.maxDistance}px`
                );
            }
        }

        return {
            isValid: violatedConstraints.length === 0,
            adjustedPosition,
            violatedConstraints,
            suggestions,
        };
    }

    /**
     * Validate that all segments maintain orthogonal properties
     */
    public validateOrthogonalPath(
        controlPoints: Point[],
        sourcePoint: Point,
        targetPoint: Point
    ): OrthogonalValidation {
        const allPoints = [sourcePoint, ...controlPoints, targetPoint];
        const nonOrthogonalSegments: string[] = [];
        const correctionSuggestions: {
            segmentId: string;
            suggestedFix: Point;
        }[] = [];

        for (let i = 0; i < allPoints.length - 1; i++) {
            const start = allPoints[i];
            const end = allPoints[i + 1];
            const segmentId = `segment-${i}`;

            if (!this.isOrthogonalSegment(start, end)) {
                nonOrthogonalSegments.push(segmentId);

                const suggestedFix = this.suggestOrthogonalCorrection(
                    start,
                    end
                );
                correctionSuggestions.push({ segmentId, suggestedFix });
            }
        }

        return {
            isOrthogonal: nonOrthogonalSegments.length === 0,
            nonOrthogonalSegments,
            correctionSuggestions,
        };
    }

    /**
     * Enforce orthogonal constraints on a path
     */
    public enforceOrthogonalConstraints(
        controlPoints: Point[],
        sourcePoint: Point,
        targetPoint: Point
    ): Point[] {
        const allPoints = [sourcePoint, ...controlPoints, targetPoint];
        const correctedPoints = [...allPoints];

        for (let i = 0; i < correctedPoints.length - 1; i++) {
            const start = correctedPoints[i];
            const end = correctedPoints[i + 1];

            if (!this.isOrthogonalSegment(start, end)) {
                const correctedEnd = this.makeSegmentOrthogonal(start, end);
                correctedPoints[i + 1] = correctedEnd;
            }
        }

        return correctedPoints.slice(1, -1);
    }

    /**
     * Calculate optimal constraints for a segment drag operation
     */
    public calculateSegmentConstraints(
        segment: EdgeSegment,
        allSegments: EdgeSegment[],
        sourcePoint: Point,
        targetPoint: Point
    ): SegmentDragConstraints {
        const isFirstSegment = segment.id === "segment-0";
        const isLastSegment =
            segment.id === `segment-${allSegments.length - 1}`;

        let axis: "x" | "y" | "both" | "none" = "both";

        if (segment.direction === "horizontal") {
            axis = "y";
        } else if (segment.direction === "vertical") {
            axis = "x";
        }

        const minDistance = this.MIN_SEGMENT_LENGTH / 4;
        const maxDistance = this.calculateMaxAllowedDistance(
            segment,
            allSegments
        );

        return {
            axis,
            snapToGrid: true,
            preserveLength: false,
            minDistance,
            maxDistance,
        };
    }

    /**
     * Validate that a proposed segment movement won't break the path
     */
    public validateSegmentMovement(
        segmentId: string,
        newMidpoint: Point,
        allSegments: EdgeSegment[],
        sourcePoint: Point,
        targetPoint: Point
    ): ConstraintValidationResult {
        const segment = allSegments.find((s) => s.id === segmentId);
        if (!segment) {
            return {
                isValid: false,
                adjustedPosition: newMidpoint,
                violatedConstraints: ["segment-not-found"],
                suggestions: ["Invalid segment ID"],
            };
        }

        const constraints = this.calculateSegmentConstraints(
            segment,
            allSegments,
            sourcePoint,
            targetPoint
        );
        return this.applyMovementConstraints(
            segment.midpoint,
            newMidpoint,
            segment,
            constraints
        );
    }

    /**
     * Check if moving a segment would create path intersections
     */
    public checkPathIntersections(
        segmentId: string,
        newMidpoint: Point,
        allSegments: EdgeSegment[]
    ): { hasIntersections: boolean; intersectingSegments: string[] } {
        const segment = allSegments.find((s) => s.id === segmentId);
        if (!segment) {
            return { hasIntersections: false, intersectingSegments: [] };
        }

        const offset = {
            x: newMidpoint.x - segment.midpoint.x,
            y: newMidpoint.y - segment.midpoint.y,
        };

        const newSegment: EdgeSegment = {
            ...segment,
            start: {
                x: segment.start.x + offset.x,
                y: segment.start.y + offset.y,
            },
            end: {
                x: segment.end.x + offset.x,
                y: segment.end.y + offset.y,
            },
            midpoint: newMidpoint,
        };

        const intersectingSegments: string[] = [];

        for (const otherSegment of allSegments) {
            if (
                otherSegment.id !== segmentId &&
                this.doSegmentsIntersect(newSegment, otherSegment)
            ) {
                intersectingSegments.push(otherSegment.id);
            }
        }

        return {
            hasIntersections: intersectingSegments.length > 0,
            intersectingSegments,
        };
    }

    private snapToGrid(point: Point): Point {
        return {
            x: Math.round(point.x / this.GRID_SIZE) * this.GRID_SIZE,
            y: Math.round(point.y / this.GRID_SIZE) * this.GRID_SIZE,
        };
    }

    private calculateDistance(point1: Point, point2: Point): number {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
        );
    }

    private normalizeVector(vector: Point): Point {
        const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (magnitude === 0) return { x: 0, y: 0 };

        return {
            x: vector.x / magnitude,
            y: vector.y / magnitude,
        };
    }

    private isOrthogonalSegment(start: Point, end: Point): boolean {
        const deltaX = Math.abs(end.x - start.x);
        const deltaY = Math.abs(end.y - start.y);

        return (
            deltaX <= this.ORTHOGONAL_TOLERANCE ||
            deltaY <= this.ORTHOGONAL_TOLERANCE
        );
    }

    private suggestOrthogonalCorrection(start: Point, end: Point): Point {
        const deltaX = Math.abs(end.x - start.x);
        const deltaY = Math.abs(end.y - start.y);

        if (deltaX > deltaY) {
            return { x: end.x, y: start.y };
        } else {
            return { x: start.x, y: end.y };
        }
    }

    private makeSegmentOrthogonal(start: Point, end: Point): Point {
        const deltaX = Math.abs(end.x - start.x);
        const deltaY = Math.abs(end.y - start.y);

        if (deltaX > deltaY) {
            return { x: end.x, y: start.y };
        } else {
            return { x: start.x, y: end.y };
        }
    }

    private calculateMaxAllowedDistance(
        segment: EdgeSegment,
        allSegments: EdgeSegment[]
    ): number {
        return 500;
    }

    private doSegmentsIntersect(
        segment1: EdgeSegment,
        segment2: EdgeSegment
    ): boolean {
        const p1 = segment1.start;
        const q1 = segment1.end;
        const p2 = segment2.start;
        const q2 = segment2.end;

        const orientation = (p: Point, q: Point, r: Point): number => {
            const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
            if (val === 0) return 0;
            return val > 0 ? 1 : 2;
        };

        const onSegment = (p: Point, q: Point, r: Point): boolean => {
            return (
                q.x <= Math.max(p.x, r.x) &&
                q.x >= Math.min(p.x, r.x) &&
                q.y <= Math.max(p.y, r.y) &&
                q.y >= Math.min(p.y, r.y)
            );
        };

        const o1 = orientation(p1, q1, p2);
        const o2 = orientation(p1, q1, q2);
        const o3 = orientation(p2, q2, p1);
        const o4 = orientation(p2, q2, q1);

        if (o1 !== o2 && o3 !== o4) return true;

        if (o1 === 0 && onSegment(p1, p2, q1)) return true;
        if (o2 === 0 && onSegment(p1, q2, q1)) return true;
        if (o3 === 0 && onSegment(p2, p1, q2)) return true;
        if (o4 === 0 && onSegment(p2, q1, q2)) return true;

        return false;
    }
}

export const orthogonalConstraintEngine =
    OrthogonalConstraintEngine.getInstance();
