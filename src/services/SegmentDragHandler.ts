import { Point } from "../lib/routing/types";
import { snapToGrid } from "../lib/utils/math";

export interface EdgeSegment {
    id: string;
    start: Point;
    end: Point;
    direction: "horizontal" | "vertical";
    length: number;
    midpoint: Point;
}

export interface SegmentDragState {
    segmentId: string;
    startPosition: Point;
    currentPosition: Point;
    constrainedPosition: Point;
    dragOffset: Point;
}

export interface SegmentDragConstraints {
    axis: "x" | "y" | "both" | "none";
    snapToGrid: boolean;
    preserveLength?: boolean;
    minDistance?: number;
    maxDistance?: number;
}

export class SegmentDragHandler {
    private static instance: SegmentDragHandler;
    private currentDragState: SegmentDragState | null = null;
    private readonly GRID_SIZE = 20;
    private readonly MIN_SEGMENT_LENGTH = 40;

    public static getInstance(): SegmentDragHandler {
        if (!SegmentDragHandler.instance) {
            SegmentDragHandler.instance = new SegmentDragHandler();
        }
        return SegmentDragHandler.instance;
    }

    /**
     * Calculate segments from control points for an orthogonal edge
     */
    public calculateSegments(
        controlPoints: Point[],
        sourcePoint: Point,
        targetPoint: Point
    ): EdgeSegment[] {
        const allPoints = [sourcePoint, ...controlPoints, targetPoint];
        const segments: EdgeSegment[] = [];

        for (let i = 0; i < allPoints.length - 1; i++) {
            const start = allPoints[i];
            const end = allPoints[i + 1];
            const direction = this.determineSegmentDirection(start, end);
            const length = this.calculateSegmentLength(start, end);
            const midpoint = this.calculateMidpoint(start, end);

            segments.push({
                id: `segment-${i}`,
                start,
                end,
                direction,
                length,
                midpoint,
            });
        }

        return segments;
    }

    /**
     * Determine if a point is near a segment midpoint for interaction
     */
    public isNearSegmentMidpoint(
        point: Point,
        segment: EdgeSegment,
        threshold: number = 15
    ): boolean {
        const distance = Math.sqrt(
            Math.pow(point.x - segment.midpoint.x, 2) +
                Math.pow(point.y - segment.midpoint.y, 2)
        );
        return distance <= threshold;
    }

    /**
     * Find which segment (if any) is being targeted for dragging
     */
    public findTargetSegment(
        mousePoint: Point,
        segments: EdgeSegment[]
    ): EdgeSegment | null {
        return (
            segments.find((segment) =>
                this.isNearSegmentMidpoint(mousePoint, segment)
            ) || null
        );
    }

    /**
     * Start dragging a segment
     */
    public startSegmentDrag(
        segment: EdgeSegment,
        mousePosition: Point
    ): SegmentDragState {
        const dragOffset = {
            x: mousePosition.x - segment.midpoint.x,
            y: mousePosition.y - segment.midpoint.y,
        };

        this.currentDragState = {
            segmentId: segment.id,
            startPosition: segment.midpoint,
            currentPosition: mousePosition,
            constrainedPosition: mousePosition,
            dragOffset,
        };

        return this.currentDragState;
    }

    /**
     * Update segment drag position with constraints
     */
    public updateSegmentDrag(
        mousePosition: Point,
        segment: EdgeSegment,
        constraints: SegmentDragConstraints
    ): SegmentDragState | null {
        if (
            !this.currentDragState ||
            this.currentDragState.segmentId !== segment.id
        ) {
            return null;
        }

        let constrainedPosition: Point;

        if (segment.direction === "horizontal") {
            constrainedPosition = {
                x: segment.midpoint.x,
                y: mousePosition.y - this.currentDragState.dragOffset.y,
            };
        } else {
            constrainedPosition = {
                x: mousePosition.x - this.currentDragState.dragOffset.x,
                y: segment.midpoint.y,
            };
        }

        if (constraints.snapToGrid) {
            const start = this.currentDragState.startPosition;
            if (segment.direction === "horizontal") {
                const deltaY = constrainedPosition.y - start.y;
                const steppedDeltaY =
                    Math.round(deltaY / this.GRID_SIZE) * this.GRID_SIZE;
                constrainedPosition = {
                    x: segment.midpoint.x,
                    y: start.y + steppedDeltaY,
                };
            } else {
                const deltaX = constrainedPosition.x - start.x;
                const steppedDeltaX =
                    Math.round(deltaX / this.GRID_SIZE) * this.GRID_SIZE;
                constrainedPosition = {
                    x: start.x + steppedDeltaX,
                    y: segment.midpoint.y,
                };
            }
        }

        this.currentDragState = {
            ...this.currentDragState,
            currentPosition: mousePosition,
            constrainedPosition,
        };

        return this.currentDragState;
    }

    /**
     * Calculate new control points after segment drag
     */
    public calculateUpdatedControlPoints(
        originalControlPoints: Point[],
        draggedSegment: EdgeSegment,
        newMidpoint: Point,
        sourcePoint: Point,
        targetPoint: Point
    ): Point[] {
        const allPoints = [sourcePoint, ...originalControlPoints, targetPoint];
        const requestedIndex = this.findSegmentIndex(draggedSegment, allPoints);
        const segmentIndex = Math.min(
            Math.max(0, requestedIndex),
            Math.max(0, allPoints.length - 2)
        );

        if (segmentIndex === -1) {
            return originalControlPoints;
        }

        const updatedPoints = [...allPoints];
        const originalStart = updatedPoints[segmentIndex];
        const originalEnd = updatedPoints[segmentIndex + 1];

        const originalMidpoint = this.calculateMidpoint(
            originalStart,
            originalEnd
        );

        const translationVector: Point = {
            x:
                draggedSegment.direction === "vertical"
                    ? newMidpoint.x - originalMidpoint.x
                    : 0,
            y:
                draggedSegment.direction === "horizontal"
                    ? newMidpoint.y - originalMidpoint.y
                    : 0,
        };

        if (segmentIndex > 0) {
            updatedPoints[segmentIndex] = {
                x: originalStart.x + translationVector.x,
                y: originalStart.y + translationVector.y,
            };
        }

        if (segmentIndex < updatedPoints.length - 2) {
            updatedPoints[segmentIndex + 1] = {
                x: originalEnd.x + translationVector.x,
                y: originalEnd.y + translationVector.y,
            };
        }

        return updatedPoints.slice(1, -1);
    }

    /**
     * End segment dragging
     */
    public endSegmentDrag(): SegmentDragState | null {
        const finalState = this.currentDragState;
        this.currentDragState = null;
        return finalState;
    }

    /**
     * Get current drag state
     */
    public getCurrentDragState(): SegmentDragState | null {
        return this.currentDragState;
    }

    /**
     * Check if currently dragging a segment
     */
    public isDragging(): boolean {
        return this.currentDragState !== null;
    }

    private determineSegmentDirection(
        start: Point,
        end: Point
    ): "horizontal" | "vertical" {
        const deltaX = Math.abs(end.x - start.x);
        const deltaY = Math.abs(end.y - start.y);

        return deltaX > deltaY ? "horizontal" : "vertical";
    }

    private calculateSegmentLength(start: Point, end: Point): number {
        return Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
    }

    private calculateMidpoint(start: Point, end: Point): Point {
        if (!start || !end) {
            return { x: 0, y: 0 };
        }
        return {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2,
        };
    }

    private findSegmentIndex(segment: EdgeSegment, allPoints: Point[]): number {
        const segmentIdMatch = segment.id.match(/segment-(\d+)/);
        if (segmentIdMatch) {
            return parseInt(segmentIdMatch[1], 10);
        }
        return -1;
    }
}

export const segmentDragHandler = SegmentDragHandler.getInstance();
