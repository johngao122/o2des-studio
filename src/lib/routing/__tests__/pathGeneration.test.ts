/**
 * Tests for path generation utilities
 */

import {
    generateHorizontalFirstPath,
    generateVerticalFirstPath,
    calculatePathLength,
    generateControlPoints,
    createOrthogonalPath,
    compareOrthogonalPaths,
} from "../pathGeneration";
import { Point, HandleInfo, PathSegment } from "../types";

describe("Path Generation Utilities", () => {
    describe("generateHorizontalFirstPath", () => {
        it("should generate L-shaped path with horizontal segment first", () => {
            const start: Point = { x: 0, y: 0 };
            const end: Point = { x: 10, y: 5 };

            const segments = generateHorizontalFirstPath(start, end);

            expect(segments).toHaveLength(2);
            expect(segments[0].direction).toBe("horizontal");
            expect(segments[0].start).toEqual({ x: 0, y: 0 });
            expect(segments[0].end).toEqual({ x: 10, y: 0 });
            expect(segments[0].length).toBe(10);

            expect(segments[1].direction).toBe("vertical");
            expect(segments[1].start).toEqual({ x: 10, y: 0 });
            expect(segments[1].end).toEqual({ x: 10, y: 5 });
            expect(segments[1].length).toBe(5);
        });

        it("should generate single horizontal segment for horizontally aligned points", () => {
            const start: Point = { x: 0, y: 5 };
            const end: Point = { x: 10, y: 5 };

            const segments = generateHorizontalFirstPath(start, end);

            expect(segments).toHaveLength(1);
            expect(segments[0].direction).toBe("horizontal");
            expect(segments[0].length).toBe(10);
        });

        it("should generate single vertical segment for vertically aligned points", () => {
            const start: Point = { x: 5, y: 0 };
            const end: Point = { x: 5, y: 10 };

            const segments = generateHorizontalFirstPath(start, end);

            expect(segments).toHaveLength(1);
            expect(segments[0].direction).toBe("vertical");
            expect(segments[0].length).toBe(10);
        });

        it("should return empty array for identical points", () => {
            const start: Point = { x: 5, y: 5 };
            const end: Point = { x: 5, y: 5 };

            const segments = generateHorizontalFirstPath(start, end);

            expect(segments).toHaveLength(0);
        });
    });

    describe("generateVerticalFirstPath", () => {
        it("should generate L-shaped path with vertical segment first", () => {
            const start: Point = { x: 0, y: 0 };
            const end: Point = { x: 10, y: 5 };

            const segments = generateVerticalFirstPath(start, end);

            expect(segments).toHaveLength(2);
            expect(segments[0].direction).toBe("vertical");
            expect(segments[0].start).toEqual({ x: 0, y: 0 });
            expect(segments[0].end).toEqual({ x: 0, y: 5 });
            expect(segments[0].length).toBe(5);

            expect(segments[1].direction).toBe("horizontal");
            expect(segments[1].start).toEqual({ x: 0, y: 5 });
            expect(segments[1].end).toEqual({ x: 10, y: 5 });
            expect(segments[1].length).toBe(10);
        });
    });

    describe("calculatePathLength", () => {
        it("should calculate total length of path segments", () => {
            const segments: PathSegment[] = [
                {
                    start: { x: 0, y: 0 },
                    end: { x: 10, y: 0 },
                    direction: "horizontal",
                    length: 10,
                },
                {
                    start: { x: 10, y: 0 },
                    end: { x: 10, y: 5 },
                    direction: "vertical",
                    length: 5,
                },
            ];

            expect(calculatePathLength(segments)).toBe(15);
        });

        it("should return 0 for empty segments array", () => {
            expect(calculatePathLength([])).toBe(0);
        });
    });

    describe("generateControlPoints", () => {
        it("should generate control points from path segments", () => {
            const segments: PathSegment[] = [
                {
                    start: { x: 0, y: 0 },
                    end: { x: 10, y: 0 },
                    direction: "horizontal",
                    length: 10,
                },
                {
                    start: { x: 10, y: 0 },
                    end: { x: 10, y: 5 },
                    direction: "vertical",
                    length: 5,
                },
            ];

            const controlPoints = generateControlPoints(segments);

            expect(controlPoints).toHaveLength(3);
            expect(controlPoints[0]).toEqual({ x: 0, y: 0, type: "corner" });
            expect(controlPoints[1]).toEqual({ x: 10, y: 0, type: "corner" });
            expect(controlPoints[2]).toEqual({ x: 10, y: 5, type: "corner" });
        });

        it("should return empty array for empty segments", () => {
            expect(generateControlPoints([])).toHaveLength(0);
        });
    });

    describe("createOrthogonalPath", () => {
        it("should create complete orthogonal path from handles", () => {
            const sourceHandle: HandleInfo = {
                id: "source-1",
                nodeId: "node-1",
                position: { x: 0, y: 0 },
                side: "right",
                type: "source",
            };

            const targetHandle: HandleInfo = {
                id: "target-1",
                nodeId: "node-2",
                position: { x: 10, y: 5 },
                side: "left",
                type: "target",
            };

            const path = createOrthogonalPath(
                sourceHandle,
                targetHandle,
                "horizontal-first"
            );

            expect(path.routingType).toBe("horizontal-first");
            expect(path.totalLength).toBe(15);
            expect(path.segments).toHaveLength(2);
            expect(path.controlPoints).toHaveLength(3);
            expect(path.efficiency).toBeGreaterThan(1);
        });
    });

    describe("compareOrthogonalPaths", () => {
        it("should prefer shorter path", () => {
            const shorterPath = {
                segments: [],
                totalLength: 10,
                routingType: "vertical-first" as const,
                efficiency: 1.2,
                controlPoints: [],
            };

            const longerPath = {
                segments: [],
                totalLength: 15,
                routingType: "horizontal-first" as const,
                efficiency: 1.1,
                controlPoints: [],
            };

            const result = compareOrthogonalPaths(longerPath, shorterPath);
            expect(result).toBe(shorterPath);
        });

        it("should prefer horizontal-first as tie-breaker for equal lengths", () => {
            const horizontalFirst = {
                segments: [],
                totalLength: 10,
                routingType: "horizontal-first" as const,
                efficiency: 1.2,
                controlPoints: [],
            };

            const verticalFirst = {
                segments: [],
                totalLength: 10,
                routingType: "vertical-first" as const,
                efficiency: 1.2,
                controlPoints: [],
            };

            const result = compareOrthogonalPaths(
                horizontalFirst,
                verticalFirst
            );
            expect(result).toBe(horizontalFirst);
        });
    });
});
