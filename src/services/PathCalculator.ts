import { Point } from "../lib/routing/types";
import { EdgeSegment } from "./SegmentDragHandler";

export interface PathCalculationOptions {
    edgeType: "straight" | "rounded" | "orthogonal";
    rounded?: boolean;
    cornerRadius?: number;
    simplifyPath?: boolean;
}

export interface CalculatedPath {
    svgPath: string;
    segments: EdgeSegment[];
    totalLength: number;
    waypoints: Point[];
}

export class PathCalculator {
    private static instance: PathCalculator;
    private readonly DEFAULT_CORNER_RADIUS = 8;

    public static getInstance(): PathCalculator {
        if (!PathCalculator.instance) {
            PathCalculator.instance = new PathCalculator();
        }
        return PathCalculator.instance;
    }

    /**
     * Calculate SVG path from control points
     */
    public calculatePath(
        sourcePoint: Point,
        targetPoint: Point,
        controlPoints: Point[],
        options: PathCalculationOptions
    ): CalculatedPath {
        const allPoints = [sourcePoint, ...controlPoints, targetPoint];
        const segments = this.calculateSegments(allPoints);

        let svgPath: string;
        switch (options.edgeType) {
            case "orthogonal":
                svgPath = this.calculateOrthogonalPath(allPoints, options);
                break;
            case "rounded":
                svgPath = this.calculateRoundedPath(allPoints, options);
                break;

            default:
                svgPath = this.calculateStraightPath(allPoints);
        }

        const totalLength = this.calculateTotalLength(segments);

        return {
            svgPath,
            segments,
            totalLength,
            waypoints: controlPoints,
        };
    }

    /**
     * Calculate path specifically for segment-middle interactions
     */
    public calculateSegmentBasedPath(
        segments: EdgeSegment[],
        options: PathCalculationOptions
    ): string {
        if (segments.length === 0) {
            return "";
        }

        let pathParts: string[] = [];
        const startPoint = segments[0].start;
        pathParts.push(`M ${startPoint.x} ${startPoint.y}`);

        for (const segment of segments) {
            switch (options.edgeType) {
                case "rounded":
                    pathParts.push(
                        this.createRoundedSegment(segment, options.cornerRadius)
                    );
                    break;
                default:
                    pathParts.push(`L ${segment.end.x} ${segment.end.y}`);
            }
        }

        return pathParts.join(" ");
    }

    /**
     * Update path after segment drag operation
     */
    public updatePathAfterSegmentDrag(
        originalSegments: EdgeSegment[],
        draggedSegmentId: string,
        newMidpoint: Point,
        options: PathCalculationOptions
    ): CalculatedPath {
        const updatedSegments = this.updateSegmentPosition(
            originalSegments,
            draggedSegmentId,
            newMidpoint
        );

        const allPoints = this.extractPointsFromSegments(updatedSegments);
        const svgPath = this.calculateSegmentBasedPath(
            updatedSegments,
            options
        );
        const totalLength = this.calculateTotalLength(updatedSegments);

        return {
            svgPath,
            segments: updatedSegments,
            totalLength,
            waypoints: allPoints.slice(1, -1),
        };
    }

    /**
     * Calculate segment midpoints for interaction handles
     */
    public calculateSegmentMidpoints(segments: EdgeSegment[]): Point[] {
        return segments.map((segment) => segment.midpoint);
    }

    /**
     * Calculate control points from segments
     */
    public extractControlPointsFromSegments(segments: EdgeSegment[]): Point[] {
        if (segments.length === 0) return [];

        const allPoints = this.extractPointsFromSegments(segments);
        return allPoints.slice(1, -1);
    }

    private calculateSegments(allPoints: Point[]): EdgeSegment[] {
        const segments: EdgeSegment[] = [];

        for (let i = 0; i < allPoints.length - 1; i++) {
            const start = allPoints[i];
            const end = allPoints[i + 1];
            const direction = this.determineDirection(start, end);
            const length = this.calculateDistance(start, end);

            segments.push({
                id: `segment-${i}`,
                start,
                end,
                direction,
                length,
                midpoint: {
                    x: (start.x + end.x) / 2,
                    y: (start.y + end.y) / 2,
                },
            });
        }

        return segments;
    }

    private calculateOrthogonalPath(
        allPoints: Point[],
        options: PathCalculationOptions
    ): string {
        if (allPoints.length < 2) return "";

        let pathParts: string[] = [];
        pathParts.push(`M ${allPoints[0].x} ${allPoints[0].y}`);

        for (let i = 1; i < allPoints.length; i++) {
            const point = allPoints[i];

            if (options.rounded && i > 1 && i < allPoints.length - 1) {
                const prevPoint = allPoints[i - 1];
                const nextPoint = allPoints[i + 1];
                const cornerRadius =
                    options.cornerRadius || this.DEFAULT_CORNER_RADIUS;

                const roundedPath = this.createRoundedCorner(
                    prevPoint,
                    point,
                    nextPoint,
                    cornerRadius
                );
                pathParts.push(roundedPath);
            } else {
                pathParts.push(`L ${point.x} ${point.y}`);
            }
        }

        return pathParts.join(" ");
    }

    private calculateRoundedPath(
        allPoints: Point[],
        options: PathCalculationOptions
    ): string {
        if (allPoints.length < 2) return "";

        const cornerRadius = options.cornerRadius || this.DEFAULT_CORNER_RADIUS;
        let pathParts: string[] = [];

        pathParts.push(`M ${allPoints[0].x} ${allPoints[0].y}`);

        for (let i = 1; i < allPoints.length; i++) {
            if (i === allPoints.length - 1) {
                pathParts.push(`L ${allPoints[i].x} ${allPoints[i].y}`);
            } else {
                const prevPoint = allPoints[i - 1];
                const currentPoint = allPoints[i];
                const nextPoint = allPoints[i + 1];

                const roundedSegment = this.createRoundedCorner(
                    prevPoint,
                    currentPoint,
                    nextPoint,
                    cornerRadius
                );
                pathParts.push(roundedSegment);
            }
        }

        return pathParts.join(" ");
    }

    private calculateBezierPath(allPoints: Point[]): string {
        if (allPoints.length < 2) return "";

        let pathParts: string[] = [];
        pathParts.push(`M ${allPoints[0].x} ${allPoints[0].y}`);

        for (let i = 1; i < allPoints.length; i++) {
            const start = allPoints[i - 1];
            const end = allPoints[i];

            const cp1 = this.calculateBezierControlPoint(start, end, 0.3);
            const cp2 = this.calculateBezierControlPoint(end, start, 0.3);

            pathParts.push(
                `C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`
            );
        }

        return pathParts.join(" ");
    }

    private calculateStraightPath(allPoints: Point[]): string {
        if (allPoints.length < 2) return "";

        let pathParts: string[] = [];
        pathParts.push(`M ${allPoints[0].x} ${allPoints[0].y}`);

        for (let i = 1; i < allPoints.length; i++) {
            pathParts.push(`L ${allPoints[i].x} ${allPoints[i].y}`);
        }

        return pathParts.join(" ");
    }

    private createRoundedSegment(
        segment: EdgeSegment,
        cornerRadius?: number
    ): string {
        const radius = cornerRadius || this.DEFAULT_CORNER_RADIUS;

        return `L ${segment.end.x} ${segment.end.y}`;
    }

    private createBezierSegment(segment: EdgeSegment): string {
        const cp1 = this.calculateBezierControlPoint(
            segment.start,
            segment.end,
            0.3
        );
        const cp2 = this.calculateBezierControlPoint(
            segment.end,
            segment.start,
            0.3
        );
        return `C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${segment.end.x} ${segment.end.y}`;
    }

    private createRoundedCorner(
        prevPoint: Point,
        cornerPoint: Point,
        nextPoint: Point,
        radius: number
    ): string {
        const v1 = {
            x: cornerPoint.x - prevPoint.x,
            y: cornerPoint.y - prevPoint.y,
        };
        const v2 = {
            x: nextPoint.x - cornerPoint.x,
            y: nextPoint.y - cornerPoint.y,
        };

        const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

        if (len1 === 0 || len2 === 0) {
            return `L ${cornerPoint.x} ${cornerPoint.y}`;
        }

        v1.x /= len1;
        v1.y /= len1;
        v2.x /= len2;
        v2.y /= len2;

        const effectiveRadius = Math.min(radius, len1 / 2, len2 / 2);

        const startPoint = {
            x: cornerPoint.x - v1.x * effectiveRadius,
            y: cornerPoint.y - v1.y * effectiveRadius,
        };

        const endPoint = {
            x: cornerPoint.x + v2.x * effectiveRadius,
            y: cornerPoint.y + v2.y * effectiveRadius,
        };

        return `L ${startPoint.x} ${startPoint.y} Q ${cornerPoint.x} ${cornerPoint.y} ${endPoint.x} ${endPoint.y}`;
    }

    private calculateBezierControlPoint(
        start: Point,
        end: Point,
        factor: number
    ): Point {
        return {
            x: start.x + (end.x - start.x) * factor,
            y: start.y + (end.y - start.y) * factor,
        };
    }

    private updateSegmentPosition(
        segments: EdgeSegment[],
        draggedSegmentId: string,
        newMidpoint: Point
    ): EdgeSegment[] {
        const index = segments.findIndex((s) => s.id === draggedSegmentId);
        if (index === -1) return segments;

        const original = segments[index];

        const freeAxisOffset = {
            x:
                original.direction === "vertical"
                    ? newMidpoint.x - original.midpoint.x
                    : 0,
            y:
                original.direction === "horizontal"
                    ? newMidpoint.y - original.midpoint.y
                    : 0,
        };

        const moved: EdgeSegment = {
            ...original,
            start: {
                x: original.start.x + freeAxisOffset.x,
                y: original.start.y + freeAxisOffset.y,
            },
            end: {
                x: original.end.x + freeAxisOffset.x,
                y: original.end.y + freeAxisOffset.y,
            },
            midpoint: newMidpoint,
        };

        const updated: EdgeSegment[] = segments.map((s, i) => ({
            id: s.id,
            start: { ...s.start },
            end: { ...s.end },
            direction: s.direction,
            length: s.length,
            midpoint: { ...s.midpoint },
        }));
        updated[index] = moved;

        const recompute = (seg: EdgeSegment): EdgeSegment => {
            const start = seg.start;
            const end = seg.end;
            return {
                id: seg.id,
                start,
                end,
                direction: this.determineDirection(start, end),
                length: this.calculateDistance(start, end),
                midpoint: {
                    x: (start.x + end.x) / 2,
                    y: (start.y + end.y) / 2,
                },
            };
        };

        if (index > 0) {
            const prev = updated[index - 1];
            updated[index - 1] = recompute({
                ...prev,
                end: { ...moved.start },
            });
        }

        if (index < updated.length - 1) {
            const next = updated[index + 1];
            updated[index + 1] = recompute({
                ...next,
                start: { ...moved.end },
            });
        }

        updated[index] = recompute(moved);

        return updated;
    }

    private extractPointsFromSegments(segments: EdgeSegment[]): Point[] {
        if (segments.length === 0) return [];

        const points: Point[] = [segments[0].start];

        for (const segment of segments) {
            points.push(segment.end);
        }

        return points;
    }

    private determineDirection(
        start: Point,
        end: Point
    ): "horizontal" | "vertical" {
        const deltaX = Math.abs(end.x - start.x);
        const deltaY = Math.abs(end.y - start.y);
        return deltaX > deltaY ? "horizontal" : "vertical";
    }

    private calculateDistance(start: Point, end: Point): number {
        return Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
    }

    private calculateTotalLength(segments: EdgeSegment[]): number {
        return segments.reduce((total, segment) => total + segment.length, 0);
    }
}

export const pathCalculator = PathCalculator.getInstance();
