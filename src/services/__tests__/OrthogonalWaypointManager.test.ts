import { OrthogonalWaypointManager, WaypointInsertionResult } from '../OrthogonalWaypointManager';
import { Point } from '../../lib/routing/types';

describe('OrthogonalWaypointManager', () => {
    let waypointManager: OrthogonalWaypointManager;
    let sourcePoint: Point;
    let targetPoint: Point;

    beforeEach(() => {
        waypointManager = OrthogonalWaypointManager.getInstance();
        sourcePoint = { x: 100, y: 100 };
        targetPoint = { x: 300, y: 200 };
    });

    describe('analyzeConnectionImpact', () => {
        it('should detect when segment movement would disconnect from handle', () => {
            const controlPoints: Point[] = [{ x: 200, y: 100 }];
            const newMidpoint = { x: 180, y: 150 }; // Far from original position

            const analysis = waypointManager.analyzeConnectionImpact(
                0, // First segment
                newMidpoint,
                controlPoints,
                sourcePoint,
                targetPoint
            );

            expect(analysis.wouldDisconnect).toBe(true);
            expect(analysis.affectedHandles).toContain('source');
        });

        it('should not detect disconnection for valid movements', () => {
            const controlPoints: Point[] = [
                { x: 200, y: 100 },
                { x: 200, y: 150 }
            ];
            const newMidpoint = { x: 220, y: 125 }; // Small movement of middle segment

            const analysis = waypointManager.analyzeConnectionImpact(
                1, // Middle segment
                newMidpoint,
                controlPoints,
                sourcePoint,
                targetPoint
            );

            expect(analysis.wouldDisconnect).toBe(false);
            expect(analysis.affectedHandles).toHaveLength(0);
        });
    });

    describe('insertPreservationWaypoints', () => {
        it('should insert waypoints when needed to preserve connections', () => {
            const controlPoints: Point[] = [{ x: 200, y: 100 }];
            const newMidpoint = { x: 150, y: 150 }; // Move that would disconnect

            const result: WaypointInsertionResult = waypointManager.insertPreservationWaypoints(
                0, // First segment
                newMidpoint,
                controlPoints,
                sourcePoint,
                targetPoint
            );

            expect(result.requiresInsertion).toBe(true);
            expect(result.insertedWaypoints.length).toBeGreaterThan(0);
            expect(result.newControlPoints.length).toBeGreaterThan(controlPoints.length);
        });

        it('should not insert waypoints for valid movements', () => {
            const controlPoints: Point[] = [
                { x: 200, y: 100 },
                { x: 200, y: 150 }
            ];
            const newMidpoint = { x: 200, y: 130 }; // Valid vertical movement

            const result: WaypointInsertionResult = waypointManager.insertPreservationWaypoints(
                1, // Middle segment
                newMidpoint,
                controlPoints,
                sourcePoint,
                targetPoint
            );

            expect(result.requiresInsertion).toBe(false);
            expect(result.insertedWaypoints).toHaveLength(0);
            expect(result.newControlPoints).toEqual(controlPoints);
        });

        it('should maintain orthogonal preview when terminal vertical segment moves horizontally', () => {
            const customSource: Point = { x: 0, y: 0 };
            const customTarget: Point = { x: 200, y: 0 };
            const controlPoints: Point[] = [
                { x: 0, y: 100 },
                { x: 200, y: 100 }
            ];
            const newMidpoint = { x: 150, y: 50 }; // Drag terminal vertical segment left

            const result: WaypointInsertionResult = waypointManager.insertPreservationWaypoints(
                2, // Terminal segment connected to target
                newMidpoint,
                controlPoints,
                customSource,
                customTarget
            );

            expect(result.requiresInsertion).toBe(true);
            expect(result.newControlPoints).toEqual([
                { x: 0, y: 100 },
                { x: 150, y: 100 },
                { x: 150, y: 0 }
            ]);

            // Ensure the generated segments remain orthogonal
            const consecutiveSegmentsAreOrthogonal = (points: Point[]): boolean => {
                for (let i = 0; i < points.length - 1; i++) {
                    const start = points[i];
                    const end = points[i + 1];
                    const isHorizontal = Math.abs(start.y - end.y) < 0.0001;
                    const isVertical = Math.abs(start.x - end.x) < 0.0001;
                    if (!isHorizontal && !isVertical) {
                        return false;
                    }
                }
                return true;
            };

            expect(
                consecutiveSegmentsAreOrthogonal([
                    customSource,
                    ...result.newControlPoints,
                    customTarget
                ])
            ).toBe(true);
        });

        it('should continue to require bridge insertion as terminal segment moves further away', () => {
            const customSource: Point = { x: 0, y: 0 };
            const customTarget: Point = { x: 200, y: 0 };
            const controlPoints: Point[] = [
                { x: 0, y: 100 },
                { x: 200, y: 100 }
            ];

            const leftMidpoints = [100, 50, 0, -50, -100, -150, -200].map((x) => ({
                x,
                y: 50,
            }));

            for (const midpoint of leftMidpoints) {
                const result = waypointManager.insertPreservationWaypoints(
                    2,
                    midpoint,
                    controlPoints,
                    customSource,
                    customTarget,
                    true
                );

                expect(result.requiresInsertion).toBe(true);
                expect(result.newControlPoints.length).toBe(3);
                const lastPoint = result.newControlPoints[2];
                expect(lastPoint.y).toBe(0);
            }
        });
    });

    describe('simplifyWaypoints', () => {
        it('should remove collinear waypoints', () => {
            const controlPoints: Point[] = [
                { x: 150, y: 100 }, // Start
                { x: 200, y: 100 }, // Middle - collinear
                { x: 250, y: 100 }, // End - collinear
                { x: 250, y: 150 }  // Turn
            ];

            const simplified = waypointManager.simplifyWaypoints(controlPoints, 5);

            expect(simplified.length).toBeLessThan(controlPoints.length);
            // Should keep start, end, and turn points but remove middle collinear point
            expect(simplified).toContainEqual({ x: 150, y: 100 });
            expect(simplified).toContainEqual({ x: 250, y: 100 });
            expect(simplified).toContainEqual({ x: 250, y: 150 });
            expect(simplified).not.toContainEqual({ x: 200, y: 100 });
        });

        it('should preserve non-collinear waypoints', () => {
            const controlPoints: Point[] = [
                { x: 100, y: 100 },
                { x: 200, y: 100 },
                { x: 200, y: 200 },
                { x: 300, y: 200 }
            ];

            const simplified = waypointManager.simplifyWaypoints(controlPoints, 5);

            expect(simplified).toHaveLength(4); // All points are necessary turns
            expect(simplified).toEqual(controlPoints);
        });
    });

    describe('canMergeWaypoints', () => {
        it('should detect collinear points that can be merged', () => {
            const pointA = { x: 100, y: 100 };
            const pointB = { x: 150, y: 100 }; // On same horizontal line
            const pointC = { x: 200, y: 100 };

            const canMerge = waypointManager.canMergeWaypoints(pointA, pointB, pointC, 5);
            expect(canMerge).toBe(true);
        });

        it('should not merge non-collinear points', () => {
            const pointA = { x: 100, y: 100 };
            const pointB = { x: 150, y: 100 };
            const pointC = { x: 200, y: 150 }; // Turn point

            const canMerge = waypointManager.canMergeWaypoints(pointA, pointB, pointC, 5);
            expect(canMerge).toBe(false);
        });
    });

    describe('cleanupWaypoints', () => {
        it('should remove unnecessary waypoints after operations', () => {
            const controlPoints: Point[] = [
                { x: 150, y: 100 }, // Necessary turn
                { x: 200, y: 100 }, // Potentially redundant
                { x: 250, y: 100 }, // Potentially redundant  
                { x: 250, y: 150 }  // Necessary turn
            ];

            const cleaned = waypointManager.cleanupWaypoints(
                controlPoints,
                sourcePoint,
                targetPoint
            );

            expect(cleaned.length).toBeLessThanOrEqual(controlPoints.length);
            // Should preserve points that are necessary for orthogonal routing
        });

        it('should preserve all points when all are necessary', () => {
            const controlPoints: Point[] = [
                { x: 150, y: 100 }, // Turn from source
                { x: 150, y: 150 }, // Turn
                { x: 250, y: 150 }  // Turn to target
            ];

            const cleaned = waypointManager.cleanupWaypoints(
                controlPoints,
                sourcePoint,
                targetPoint
            );

            expect(cleaned).toHaveLength(3); // All points necessary for orthogonal path
        });
    });

    describe('integration scenarios', () => {
        it('should handle complex waypoint insertion and cleanup', () => {
            // Simulate a scenario where a vertical segment is moved horizontally
            // requiring bridge waypoints to maintain orthogonal connection
            const controlPoints: Point[] = [
                { x: 200, y: 100 },
                { x: 200, y: 150 }
            ];
            
            const segmentIndex = 1; // Vertical segment
            const newMidpoint = { x: 250, y: 125 }; // Move right

            // Insert preservation waypoints
            const insertResult = waypointManager.insertPreservationWaypoints(
                segmentIndex,
                newMidpoint,
                controlPoints,
                sourcePoint,
                targetPoint
            );

            if (insertResult.requiresInsertion) {
                // Cleanup any redundant waypoints
                const cleanedPoints = waypointManager.cleanupWaypoints(
                    insertResult.newControlPoints,
                    sourcePoint,
                    targetPoint
                );

                expect(cleanedPoints.length).toBeGreaterThanOrEqual(controlPoints.length);
                expect(cleanedPoints.length).toBeLessThanOrEqual(insertResult.newControlPoints.length);
            }
        });
    });
});
