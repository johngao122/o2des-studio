/**
 * Unit tests for HandleSelectionService
 */

import { HandleSelectionService } from "../HandleSelectionService";
import { NodeInfo, HandleInfo, Point } from "../types";

describe("HandleSelectionService", () => {
    let service: HandleSelectionService;

    beforeEach(() => {
        service = new HandleSelectionService();
    });

    // Helper function to create test nodes
    const createTestNode = (
        id: string,
        x: number,
        y: number,
        width: number = 100,
        height: number = 60
    ): NodeInfo => ({
        id,
        bounds: { x, y, width, height },
        handles: [
            {
                id: `${id}-top`,
                nodeId: id,
                position: { x: x + width / 2, y },
                side: "top",
                type: "source",
            },
            {
                id: `${id}-right`,
                nodeId: id,
                position: { x: x + width, y: y + height / 2 },
                side: "right",
                type: "source",
            },
            {
                id: `${id}-bottom`,
                nodeId: id,
                position: { x: x + width / 2, y: y + height },
                side: "bottom",
                type: "source",
            },
            {
                id: `${id}-left`,
                nodeId: id,
                position: { x, y: y + height / 2 },
                side: "left",
                type: "source",
            },
            // Target handles
            {
                id: `${id}-top-target`,
                nodeId: id,
                position: { x: x + width / 2, y },
                side: "top",
                type: "target",
            },
            {
                id: `${id}-right-target`,
                nodeId: id,
                position: { x: x + width, y: y + height / 2 },
                side: "right",
                type: "target",
            },
            {
                id: `${id}-bottom-target`,
                nodeId: id,
                position: { x: x + width / 2, y: y + height },
                side: "bottom",
                type: "target",
            },
            {
                id: `${id}-left-target`,
                nodeId: id,
                position: { x, y: y + height / 2 },
                side: "left",
                type: "target",
            },
        ],
    });

    describe("calculateManhattanDistance", () => {
        it("should calculate Manhattan distance correctly", () => {
            const handle1: HandleInfo = {
                id: "h1",
                nodeId: "n1",
                position: { x: 0, y: 0 },
                side: "right",
                type: "source",
            };

            const handle2: HandleInfo = {
                id: "h2",
                nodeId: "n2",
                position: { x: 3, y: 4 },
                side: "left",
                type: "target",
            };

            const distance = service.calculateManhattanDistance(
                handle1,
                handle2
            );
            expect(distance).toBe(7); // |3-0| + |4-0| = 7
        });

        it("should return 0 for identical positions", () => {
            const handle1: HandleInfo = {
                id: "h1",
                nodeId: "n1",
                position: { x: 5, y: 5 },
                side: "right",
                type: "source",
            };

            const handle2: HandleInfo = {
                id: "h2",
                nodeId: "n2",
                position: { x: 5, y: 5 },
                side: "left",
                type: "target",
            };

            const distance = service.calculateManhattanDistance(
                handle1,
                handle2
            );
            expect(distance).toBe(0);
        });
    });

    describe("evaluateHandleCombination", () => {
        it("should evaluate handle combination correctly", () => {
            const sourceHandle: HandleInfo = {
                id: "source",
                nodeId: "n1",
                position: { x: 100, y: 50 },
                side: "right",
                type: "source",
            };

            const targetHandle: HandleInfo = {
                id: "target",
                nodeId: "n2",
                position: { x: 200, y: 50 },
                side: "left",
                type: "target",
            };

            const evaluation = service.evaluateHandleCombination(
                sourceHandle,
                targetHandle
            );

            expect(evaluation.combination.manhattanDistance).toBe(100);
            expect(evaluation.combination.pathLength).toBe(100);
            expect(evaluation.combination.routingType).toBe("horizontal-first");
            expect(evaluation.score).toBeGreaterThan(0);
            expect(evaluation.reason).toContain("right-to-left connection");
        });

        it("should prefer vertical-first for vertical alignments", () => {
            const sourceHandle: HandleInfo = {
                id: "source",
                nodeId: "n1",
                position: { x: 50, y: 100 },
                side: "bottom",
                type: "source",
            };

            const targetHandle: HandleInfo = {
                id: "target",
                nodeId: "n2",
                position: { x: 50, y: 200 },
                side: "top",
                type: "target",
            };

            const evaluation = service.evaluateHandleCombination(
                sourceHandle,
                targetHandle
            );

            expect(evaluation.combination.routingType).toBe("vertical-first");
            expect(evaluation.combination.manhattanDistance).toBe(100);
        });
    });

    describe("getAllHandleCombinations", () => {
        it("should generate all valid handle combinations", () => {
            const sourceNode = createTestNode("source", 0, 0);
            const targetNode = createTestNode("target", 200, 0);

            const combinations = service.getAllHandleCombinations(
                sourceNode,
                targetNode
            );

            // 4 source handles × 4 target handles = 16 combinations
            expect(combinations).toHaveLength(16);

            // Verify all combinations have required properties
            combinations.forEach((combo) => {
                expect(combo.sourceHandle.type).toBe("source");
                expect(combo.targetHandle.type).toBe("target");
                expect(combo.manhattanDistance).toBeGreaterThanOrEqual(0);
                expect(combo.pathLength).toBeGreaterThanOrEqual(0);
                expect(combo.efficiency).toBeGreaterThan(0);
                expect(["horizontal-first", "vertical-first"]).toContain(
                    combo.routingType
                );
            });
        });

        it("should return empty array when no valid combinations exist", () => {
            const sourceNode: NodeInfo = {
                id: "source",
                bounds: { x: 0, y: 0, width: 100, height: 60 },
                handles: [], // No handles
            };

            const targetNode = createTestNode("target", 200, 0);

            const combinations = service.getAllHandleCombinations(
                sourceNode,
                targetNode
            );
            expect(combinations).toHaveLength(0);
        });
    });

    describe("findOptimalHandles", () => {
        it("should find the optimal handle combination based on Manhattan distance", () => {
            const sourceNode = createTestNode("source", 0, 0);
            const targetNode = createTestNode("target", 200, 0);

            const optimal = service.findOptimalHandles(sourceNode, targetNode);

            // Should select right-to-left connection for horizontal alignment
            expect(optimal.sourceHandle.side).toBe("right");
            expect(optimal.targetHandle.side).toBe("left");
            expect(optimal.manhattanDistance).toBe(100); // Shortest distance
        });

        it("should use tie-breaking logic for equal distances", () => {
            // Create nodes positioned so multiple handle combinations have equal Manhattan distance
            const sourceNode = createTestNode("source", 0, 0, 100, 100);
            const targetNode = createTestNode("target", 150, 150, 100, 100);

            const optimal = service.findOptimalHandles(sourceNode, targetNode);

            // Should prefer horizontal-first routing as tie-breaker
            expect(optimal.routingType).toBe("horizontal-first");
        });

        it("should prefer better efficiency when Manhattan distances are equal", () => {
            const sourceNode = createTestNode("source", 0, 0);
            const targetNode = createTestNode("target", 100, 100);

            const optimal = service.findOptimalHandles(sourceNode, targetNode);

            // Should select the most efficient routing
            expect(optimal.efficiency).toBeGreaterThan(0);
            expect(optimal.manhattanDistance).toBeGreaterThan(0);
        });

        it("should throw error when no valid combinations exist", () => {
            const sourceNode: NodeInfo = {
                id: "source",
                bounds: { x: 0, y: 0, width: 100, height: 60 },
                handles: [],
            };

            const targetNode = createTestNode("target", 200, 0);

            expect(() => {
                service.findOptimalHandles(sourceNode, targetNode);
            }).toThrow("No valid handle combinations found between nodes");
        });
    });

    describe("findOptimalHandlesForPosition", () => {
        it("should find the best source handle for a target position", () => {
            const sourceNode = createTestNode("source", 0, 0);
            const targetPosition: Point = { x: 200, y: 30 }; // Right of the source node

            const optimalHandle = service.findOptimalHandlesForPosition(
                sourceNode,
                targetPosition
            );

            expect(optimalHandle).not.toBeNull();
            expect(optimalHandle!.side).toBe("right"); // Should select right handle for rightward target
        });

        it("should return null when no source handles exist", () => {
            const sourceNode: NodeInfo = {
                id: "source",
                bounds: { x: 0, y: 0, width: 100, height: 60 },
                handles: [
                    {
                        id: "target-only",
                        nodeId: "source",
                        position: { x: 50, y: 30 },
                        side: "top",
                        type: "target", // Only target handles, no source handles
                    },
                ],
            };

            const targetPosition: Point = { x: 200, y: 30 };

            const optimalHandle = service.findOptimalHandlesForPosition(
                sourceNode,
                targetPosition
            );
            expect(optimalHandle).toBeNull();
        });

        it("should select the closest handle by Manhattan distance", () => {
            const sourceNode = createTestNode("source", 100, 100);
            const targetPosition: Point = { x: 150, y: 50 }; // Above and to the right

            const optimalHandle = service.findOptimalHandlesForPosition(
                sourceNode,
                targetPosition
            );

            expect(optimalHandle).not.toBeNull();
            // Should select top handle as it's closest to the target position
            expect(optimalHandle!.side).toBe("top");
        });
    });

    describe("tie-breaking logic", () => {
        it("should determine routing type based on distance and handle orientations", () => {
            // Test horizontal-first preference when horizontal distance is greater
            const sourceHandle1: HandleInfo = {
                id: "s1",
                nodeId: "n1",
                position: { x: 0, y: 0 },
                side: "right",
                type: "source",
            };

            const targetHandle1: HandleInfo = {
                id: "t1",
                nodeId: "n2",
                position: { x: 200, y: 50 }, // More horizontal distance
                side: "left",
                type: "target",
            };

            const eval1 = service.evaluateHandleCombination(
                sourceHandle1,
                targetHandle1
            );
            expect(eval1.combination.routingType).toBe("horizontal-first");

            // Test vertical-first preference when vertical distance is greater
            const sourceHandle2: HandleInfo = {
                id: "s2",
                nodeId: "n1",
                position: { x: 0, y: 0 },
                side: "bottom",
                type: "source",
            };

            const targetHandle2: HandleInfo = {
                id: "t2",
                nodeId: "n2",
                position: { x: 50, y: 200 }, // More vertical distance
                side: "top",
                type: "target",
            };

            const eval2 = service.evaluateHandleCombination(
                sourceHandle2,
                targetHandle2
            );
            expect(eval2.combination.routingType).toBe("vertical-first");

            // Test handle orientation preference when distances are equal
            const sourceHandle3: HandleInfo = {
                id: "s3",
                nodeId: "n1",
                position: { x: 0, y: 0 },
                side: "top", // vertical handle
                type: "source",
            };

            const targetHandle3: HandleInfo = {
                id: "t3",
                nodeId: "n2",
                position: { x: 100, y: 100 }, // Equal dx and dy
                side: "bottom", // vertical handle
                type: "target",
            };

            const eval3 = service.evaluateHandleCombination(
                sourceHandle3,
                targetHandle3
            );
            expect(eval3.combination.routingType).toBe("vertical-first"); // Both handles are vertical
        });

        it("should use handle side order as final tie-breaker", () => {
            const sourceNode = createTestNode("source", 0, 0);
            const targetNode = createTestNode("target", 200, 200);

            const combinations = service.getAllHandleCombinations(
                sourceNode,
                targetNode
            );
            const sortedCombinations = combinations.sort((a, b) => {
                if (a.manhattanDistance !== b.manhattanDistance) {
                    return a.manhattanDistance - b.manhattanDistance;
                }
                if (a.efficiency !== b.efficiency) {
                    return a.efficiency - b.efficiency;
                }
                if (a.routingType !== b.routingType) {
                    return a.routingType === "horizontal-first" ? -1 : 1;
                }

                const handleOrder = { top: 0, right: 1, bottom: 2, left: 3 };
                const sourceOrder =
                    handleOrder[a.sourceHandle.side] -
                    handleOrder[b.sourceHandle.side];
                if (sourceOrder !== 0) return sourceOrder;

                return (
                    handleOrder[a.targetHandle.side] -
                    handleOrder[b.targetHandle.side]
                );
            });

            // Verify the sorting is stable and predictable
            expect(sortedCombinations.length).toBeGreaterThan(0);

            // Find combinations with identical metrics
            const firstCombo = sortedCombinations[0];
            const identicalCombos = sortedCombinations.filter(
                (combo) =>
                    combo.manhattanDistance === firstCombo.manhattanDistance &&
                    Math.abs(combo.efficiency - firstCombo.efficiency) <
                        0.001 &&
                    combo.routingType === firstCombo.routingType
            );

            if (identicalCombos.length > 1) {
                // Verify handle order tie-breaking
                const handleOrder = { top: 0, right: 1, bottom: 2, left: 3 };
                for (let i = 1; i < identicalCombos.length; i++) {
                    const prev = identicalCombos[i - 1];
                    const curr = identicalCombos[i];

                    const prevSourceOrder = handleOrder[prev.sourceHandle.side];
                    const currSourceOrder = handleOrder[curr.sourceHandle.side];

                    if (prevSourceOrder !== currSourceOrder) {
                        expect(prevSourceOrder).toBeLessThan(currSourceOrder);
                    } else {
                        const prevTargetOrder =
                            handleOrder[prev.targetHandle.side];
                        const currTargetOrder =
                            handleOrder[curr.targetHandle.side];
                        expect(prevTargetOrder).toBeLessThanOrEqual(
                            currTargetOrder
                        );
                    }
                }
            }
        });
    });
});
