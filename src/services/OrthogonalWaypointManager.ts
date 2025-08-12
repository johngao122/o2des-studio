import { Point } from "../lib/routing/types";
import { EdgeSegment } from "./SegmentDragHandler";

export interface WaypointInsertionResult {
    newControlPoints: Point[];
    insertedWaypoints: Point[];
    modifiedSegments: string[];
    requiresInsertion: boolean;
}

export interface ConnectionAnalysis {
    wouldDisconnect: boolean;
    affectedHandles: ("source" | "target")[];
    requiredBridgeSegments: EdgeSegment[];
}

export class OrthogonalWaypointManager {
    private static instance: OrthogonalWaypointManager;
    private readonly MIN_SEGMENT_LENGTH = 40;
    private readonly CONNECTION_TOLERANCE = 5;

    public static getInstance(): OrthogonalWaypointManager {
        if (!OrthogonalWaypointManager.instance) {
            OrthogonalWaypointManager.instance =
                new OrthogonalWaypointManager();
        }
        return OrthogonalWaypointManager.instance;
    }

    /**
     * Analyze if moving a segment would disconnect it from handles
     */
    public analyzeConnectionImpact(
        segmentIndex: number,
        newMidpoint: Point,
        controlPoints: Point[],
        sourcePoint: Point,
        targetPoint: Point
    ): ConnectionAnalysis {
        const allPoints = [sourcePoint, ...controlPoints, targetPoint];

        const safeIndex = Math.min(
            Math.max(0, segmentIndex),
            Math.max(0, allPoints.length - 2)
        );
        const originalSegment = {
            start: allPoints[safeIndex],
            end: allPoints[safeIndex + 1],
        };

        const newSegmentPosition = this.calculateNewSegmentPosition(
            originalSegment,
            newMidpoint
        );
        const wouldDisconnectSource = this.wouldDisconnectFromHandle(
            safeIndex,
            newSegmentPosition,
            sourcePoint,
            "source"
        );
        const wouldDisconnectTarget = this.wouldDisconnectFromHandle(
            safeIndex,
            newSegmentPosition,
            targetPoint,
            "target",
            allPoints.length - 2
        );

        const affectedHandles: ("source" | "target")[] = [];
        if (wouldDisconnectSource) affectedHandles.push("source");
        if (wouldDisconnectTarget) affectedHandles.push("target");

        const requiredBridgeSegments = this.calculateRequiredBridgeSegments(
            safeIndex,
            newSegmentPosition,
            allPoints,
            affectedHandles
        );

        return {
            wouldDisconnect: wouldDisconnectSource || wouldDisconnectTarget,
            affectedHandles,
            requiredBridgeSegments,
        };
    }

    /**
     * Insert waypoints to preserve orthogonal connections
     */
    public insertPreservationWaypoints(
        segmentIndex: number,
        newMidpoint: Point,
        controlPoints: Point[],
        sourcePoint: Point,
        targetPoint: Point
    ): WaypointInsertionResult {
        const connectionAnalysis = this.analyzeConnectionImpact(
            segmentIndex,
            newMidpoint,
            controlPoints,
            sourcePoint,
            targetPoint
        );

        if (!connectionAnalysis.wouldDisconnect) {
            return {
                newControlPoints: controlPoints,
                insertedWaypoints: [],
                modifiedSegments: [],
                requiresInsertion: false,
            };
        }

        const allPoints = [sourcePoint, ...controlPoints, targetPoint];
        const updatedPoints = [...allPoints];
        const insertedWaypoints: Point[] = [];
        const modifiedSegments: string[] = [];

        for (const handleType of connectionAnalysis.affectedHandles) {
            const insertionResult = this.insertBridgeWaypoints(
                segmentIndex,
                newMidpoint,
                updatedPoints,
                handleType
            );

            updatedPoints.splice(
                0,
                updatedPoints.length,
                ...insertionResult.updatedPoints
            );
            insertedWaypoints.push(...insertionResult.newWaypoints);
            modifiedSegments.push(...insertionResult.affectedSegments);
        }

        return {
            newControlPoints: updatedPoints.slice(1, -1),
            insertedWaypoints,
            modifiedSegments,
            requiresInsertion: true,
        };
    }

    /**
     * Simplify waypoints by removing redundant points
     */
    public simplifyWaypoints(
        controlPoints: Point[],
        tolerance: number = 5
    ): Point[] {
        if (controlPoints.length <= 2) {
            return controlPoints;
        }

        const simplified: Point[] = [controlPoints[0]];

        for (let i = 1; i < controlPoints.length - 1; i++) {
            const prevPoint = controlPoints[i - 1];
            const currentPoint = controlPoints[i];
            const nextPoint = controlPoints[i + 1];

            if (
                !this.isRedundantWaypoint(
                    prevPoint,
                    currentPoint,
                    nextPoint,
                    tolerance
                )
            ) {
                simplified.push(currentPoint);
            }
        }

        simplified.push(controlPoints[controlPoints.length - 1]);
        return simplified;
    }

    /**
     * Check if waypoints can be merged (collinear segments)
     */
    public canMergeWaypoints(
        pointA: Point,
        pointB: Point,
        pointC: Point,
        tolerance: number = 5
    ): boolean {
        return this.arePointsCollinear(pointA, pointB, pointC, tolerance);
    }

    /**
     * Remove unnecessary waypoints after segment operations
     */
    public cleanupWaypoints(
        controlPoints: Point[],
        sourcePoint: Point,
        targetPoint: Point
    ): Point[] {
        const allPoints = [sourcePoint, ...controlPoints, targetPoint];
        const cleaned: Point[] = [sourcePoint];

        for (let i = 1; i < allPoints.length - 1; i++) {
            const prevPoint = allPoints[i - 1];
            const currentPoint = allPoints[i];
            const nextPoint = allPoints[i + 1];

            if (
                this.isNecessaryForOrthogonal(
                    prevPoint,
                    currentPoint,
                    nextPoint
                )
            ) {
                cleaned.push(currentPoint);
            }
        }

        cleaned.push(targetPoint);
        return cleaned.slice(1, -1);
    }

    private calculateNewSegmentPosition(
        originalSegment: { start: Point; end: Point },
        newMidpoint: Point
    ): { start: Point; end: Point } {
        const originalMidpoint = {
            x: (originalSegment.start.x + originalSegment.end.x) / 2,
            y: (originalSegment.start.y + originalSegment.end.y) / 2,
        };

        const isHorizontal =
            Math.abs(originalSegment.end.x - originalSegment.start.x) >
            Math.abs(originalSegment.end.y - originalSegment.start.y);
        const offset = {
            x: isHorizontal ? 0 : newMidpoint.x - originalMidpoint.x,
            y: isHorizontal ? newMidpoint.y - originalMidpoint.y : 0,
        };

        return {
            start: {
                x: originalSegment.start.x + offset.x,
                y: originalSegment.start.y + offset.y,
            },
            end: {
                x: originalSegment.end.x + offset.x,
                y: originalSegment.end.y + offset.y,
            },
        };
    }

    private wouldDisconnectFromHandle(
        segmentIndex: number,
        newSegmentPosition: { start: Point; end: Point },
        handlePoint: Point,
        handleType: "source" | "target",
        lastSegmentIndex?: number
    ): boolean {
        const isDirectConnection =
            (handleType === "source" && segmentIndex === 0) ||
            (handleType === "target" &&
                segmentIndex === (lastSegmentIndex || 0));

        if (!isDirectConnection) {
            return false;
        }

        const relevantPoint =
            handleType === "source"
                ? newSegmentPosition.start
                : newSegmentPosition.end;
        const distance = Math.sqrt(
            Math.pow(relevantPoint.x - handlePoint.x, 2) +
                Math.pow(relevantPoint.y - handlePoint.y, 2)
        );

        return distance > this.CONNECTION_TOLERANCE;
    }

    private calculateRequiredBridgeSegments(
        segmentIndex: number,
        newSegmentPosition: { start: Point; end: Point },
        allPoints: Point[],
        affectedHandles: ("source" | "target")[]
    ): EdgeSegment[] {
        const bridgeSegments: EdgeSegment[] = [];

        for (const handleType of affectedHandles) {
            if (handleType === "source" && segmentIndex === 0) {
                const sourcePoint = allPoints[0];
                const bridgeSegment = this.createBridgeSegment(
                    sourcePoint,
                    newSegmentPosition.start,
                    `bridge-source-${segmentIndex}`
                );
                bridgeSegments.push(bridgeSegment);
            } else if (
                handleType === "target" &&
                segmentIndex === allPoints.length - 2
            ) {
                const targetPoint = allPoints[allPoints.length - 1];
                const bridgeSegment = this.createBridgeSegment(
                    newSegmentPosition.end,
                    targetPoint,
                    `bridge-target-${segmentIndex}`
                );
                bridgeSegments.push(bridgeSegment);
            }
        }

        return bridgeSegments;
    }

    private createBridgeSegment(
        start: Point,
        end: Point,
        id: string
    ): EdgeSegment {
        const direction =
            Math.abs(end.x - start.x) > Math.abs(end.y - start.y)
                ? "horizontal"
                : "vertical";
        const length = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );

        return {
            id,
            start,
            end,
            direction,
            length,
            midpoint: {
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2,
            },
        };
    }

    private insertBridgeWaypoints(
        segmentIndex: number,
        newMidpoint: Point,
        allPoints: Point[],
        handleType: "source" | "target"
    ): {
        updatedPoints: Point[];
        newWaypoints: Point[];
        affectedSegments: string[];
    } {
        const updatedPoints = [...allPoints];
        const newWaypoints: Point[] = [];
        const affectedSegments: string[] = [];

        if (handleType === "source" && segmentIndex === 0) {
            const sourcePoint = allPoints[0];
            const originalSegmentEnd = allPoints[1];

            const bridgeWaypoint = this.calculateOrthogonalBridgePoint(
                sourcePoint,
                newMidpoint,
                originalSegmentEnd
            );

            newWaypoints.push(bridgeWaypoint);
            updatedPoints.splice(1, 0, bridgeWaypoint);
            affectedSegments.push(`segment-0`, `segment-1`);
        } else if (
            handleType === "target" &&
            segmentIndex === allPoints.length - 2
        ) {
            const targetPoint = allPoints[allPoints.length - 1];
            const originalSegmentStart = allPoints[allPoints.length - 2];

            const bridgeWaypoint = this.calculateOrthogonalBridgePoint(
                originalSegmentStart,
                newMidpoint,
                targetPoint
            );

            newWaypoints.push(bridgeWaypoint);
            updatedPoints.splice(updatedPoints.length - 1, 0, bridgeWaypoint);
            affectedSegments.push(
                `segment-${segmentIndex}`,
                `segment-${segmentIndex + 1}`
            );
        }

        return {
            updatedPoints,
            newWaypoints,
            affectedSegments,
        };
    }

    private calculateOrthogonalBridgePoint(
        handlePoint: Point,
        segmentMidpoint: Point,
        originalEndPoint: Point
    ): Point {
        const deltaX = Math.abs(segmentMidpoint.x - handlePoint.x);
        const deltaY = Math.abs(segmentMidpoint.y - handlePoint.y);

        if (deltaX > deltaY) {
            return {
                x: segmentMidpoint.x,
                y: handlePoint.y,
            };
        } else {
            return {
                x: handlePoint.x,
                y: segmentMidpoint.y,
            };
        }
    }

    private isRedundantWaypoint(
        prevPoint: Point,
        currentPoint: Point,
        nextPoint: Point,
        tolerance: number
    ): boolean {
        return this.arePointsCollinear(
            prevPoint,
            currentPoint,
            nextPoint,
            tolerance
        );
    }

    private arePointsCollinear(
        pointA: Point,
        pointB: Point,
        pointC: Point,
        tolerance: number
    ): boolean {
        const crossProduct = Math.abs(
            (pointB.x - pointA.x) * (pointC.y - pointA.y) -
                (pointC.x - pointA.x) * (pointB.y - pointA.y)
        );
        return crossProduct <= tolerance;
    }

    private isNecessaryForOrthogonal(
        prevPoint: Point,
        currentPoint: Point,
        nextPoint: Point
    ): boolean {
        const prevDirection = this.getDirection(prevPoint, currentPoint);
        const nextDirection = this.getDirection(currentPoint, nextPoint);

        return prevDirection !== nextDirection;
    }

    private getDirection(start: Point, end: Point): "horizontal" | "vertical" {
        const deltaX = Math.abs(end.x - start.x);
        const deltaY = Math.abs(end.y - start.y);
        return deltaX > deltaY ? "horizontal" : "vertical";
    }
}

export const orthogonalWaypointManager =
    OrthogonalWaypointManager.getInstance();
