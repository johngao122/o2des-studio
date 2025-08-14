/**
 * Tests for distance calculation utilities
 */

import {
    calculateManhattanDistance,
    calculateHandleManhattanDistance,
    calculateEuclideanDistance,
    calculateRoutingEfficiency,
} from "../distance";
import { Point, HandleInfo } from "../types";

describe("Distance Utilities", () => {
    describe("calculateManhattanDistance", () => {
        it("should calculate Manhattan distance correctly for positive coordinates", () => {
            const point1: Point = { x: 0, y: 0 };
            const point2: Point = { x: 3, y: 4 };

            expect(calculateManhattanDistance(point1, point2)).toBe(7);
        });

        it("should calculate Manhattan distance correctly for negative coordinates", () => {
            const point1: Point = { x: -2, y: -3 };
            const point2: Point = { x: 1, y: 2 };

            expect(calculateManhattanDistance(point1, point2)).toBe(8);
        });

        it("should return 0 for identical points", () => {
            const point1: Point = { x: 5, y: 10 };
            const point2: Point = { x: 5, y: 10 };

            expect(calculateManhattanDistance(point1, point2)).toBe(0);
        });
    });

    describe("calculateHandleManhattanDistance", () => {
        it("should calculate distance between handles correctly", () => {
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
                position: { x: 6, y: 8 },
                side: "left",
                type: "target",
            };

            expect(
                calculateHandleManhattanDistance(sourceHandle, targetHandle)
            ).toBe(14);
        });
    });

    describe("calculateEuclideanDistance", () => {
        it("should calculate Euclidean distance correctly", () => {
            const point1: Point = { x: 0, y: 0 };
            const point2: Point = { x: 3, y: 4 };

            expect(calculateEuclideanDistance(point1, point2)).toBe(5);
        });

        it("should return 0 for identical points", () => {
            const point1: Point = { x: 5, y: 10 };
            const point2: Point = { x: 5, y: 10 };

            expect(calculateEuclideanDistance(point1, point2)).toBe(0);
        });
    });

    describe("calculateRoutingEfficiency", () => {
        it("should calculate efficiency ratio correctly", () => {
            const point1: Point = { x: 0, y: 0 };
            const point2: Point = { x: 3, y: 4 };

            // Manhattan: 7, Euclidean: 5, Efficiency: 7/5 = 1.4
            expect(calculateRoutingEfficiency(point1, point2)).toBeCloseTo(1.4);
        });

        it("should return 1 for identical points", () => {
            const point1: Point = { x: 5, y: 10 };
            const point2: Point = { x: 5, y: 10 };

            expect(calculateRoutingEfficiency(point1, point2)).toBe(1);
        });
    });
});
