import {
    getActivityNodeHandles,
    getGeneratorNodeHandles,
    getTerminatorNodeHandles,
    getEventNodeHandles,
    getInitializationNodeHandles,
    getGlobalNodeHandles,
    getAllNodeHandles,
    getHandleCoordinatesById,
    getHandleInfoById,
    NodeHandleInfo,
} from "../nodeHandles";
import { BaseNode } from "@/types/base";

describe("nodeHandles - Real Node Testing", () => {
    describe("getActivityNodeHandles", () => {
        it("should extract correct handle positions for standard activity node", () => {
            const nodeId = "activity-123";
            const position = { x: 100, y: 200 };
            const dimensions = { width: 200, height: 120 };
            const headerHeight = 35;

            const handles = getActivityNodeHandles(
                nodeId,
                position,
                dimensions,
                headerHeight
            );

            const topHandles = handles.filter((h) => h.side === "top");
            const rightHandles = handles.filter((h) => h.side === "right");
            const bottomHandles = handles.filter((h) => h.side === "bottom");
            const leftHandles = handles.filter((h) => h.side === "left");

            expect(topHandles.length).toBeGreaterThan(0);
            expect(rightHandles.length).toBeGreaterThan(0);
            expect(bottomHandles.length).toBeGreaterThan(0);
            expect(leftHandles.length).toBeGreaterThan(0);

            handles.forEach((handle) => {
                expect(handle.type).toBe("source");
                expect(handle.nodeId).toBe(nodeId);
            });

            const firstTopHandle = topHandles[0];
            const lastTopHandle = topHandles[topHandles.length - 1];
            expect(firstTopHandle.id).toContain("top-left");
            expect(lastTopHandle.id).toContain("top-right");

            const firstBottomHandle = bottomHandles[0];
            const lastBottomHandle = bottomHandles[bottomHandles.length - 1];
            expect(firstBottomHandle.id).toContain("bottom-right");
            expect(lastBottomHandle.id).toContain("bottom-left");

            topHandles.forEach((handle) => {
                expect(handle.coordinates.x).toBeGreaterThanOrEqual(position.x);
                expect(handle.coordinates.x).toBeLessThanOrEqual(
                    position.x + dimensions.width
                );
                expect(handle.coordinates.y).toBe(position.y + headerHeight);
            });

            rightHandles.forEach((handle) => {
                expect(handle.coordinates.x).toBe(
                    position.x + dimensions.width
                );
                expect(handle.coordinates.y).toBeGreaterThanOrEqual(position.y);
                expect(handle.coordinates.y).toBeLessThanOrEqual(
                    position.y + headerHeight + dimensions.height
                );
            });
        });

        it("should handle different node sizes correctly", () => {
            const nodeId = "small-activity";
            const position = { x: 0, y: 0 };
            const smallDimensions = { width: 100, height: 60 };
            const largeDimensions = { width: 400, height: 200 };

            const smallHandles = getActivityNodeHandles(
                nodeId,
                position,
                smallDimensions
            );
            const largeHandles = getActivityNodeHandles(
                nodeId,
                position,
                largeDimensions
            );

            expect(largeHandles.length).toBeGreaterThanOrEqual(
                smallHandles.length
            );

            const largeTopHandles = largeHandles.filter(
                (h) => h.side === "top"
            );
            const smallTopHandles = smallHandles.filter(
                (h) => h.side === "top"
            );

            if (largeTopHandles.length > 0 && smallTopHandles.length > 0) {
                const maxLargeX = Math.max(
                    ...largeTopHandles.map((h) => h.coordinates.x)
                );
                const maxSmallX = Math.max(
                    ...smallTopHandles.map((h) => h.coordinates.x)
                );
                expect(maxLargeX).toBeGreaterThan(maxSmallX);
            }
        });
    });

    describe("getGeneratorNodeHandles", () => {
        it("should extract arrow-shaped handle positions", () => {
            const nodeId = "generator-456";
            const position = { x: 50, y: 100 };
            const dimensions = { width: 150, height: 80 };

            const handles = getGeneratorNodeHandles(
                nodeId,
                position,
                dimensions
            );

            const sides = ["top", "right", "bottom", "left"] as const;
            sides.forEach((side) => {
                const sideHandles = handles.filter((h) => h.side === side);
                expect(sideHandles.length).toBeGreaterThan(0);
            });

            handles.forEach((handle) => {
                expect(handle.type).toBe("source");
                expect(handle.nodeId).toBe(nodeId);
                expect(handle.id).toContain(nodeId);
            });

            const rightHandles = handles.filter((h) => h.side === "right");
            expect(rightHandles.length).toBeGreaterThanOrEqual(2);

            handles.forEach((handle) => {
                expect(handle.coordinates.x).toBeGreaterThanOrEqual(
                    position.x - 5
                );
                expect(handle.coordinates.x).toBeLessThanOrEqual(
                    position.x + dimensions.width + 5
                );
                expect(handle.coordinates.y).toBeGreaterThanOrEqual(
                    position.y - 5
                );
                expect(handle.coordinates.y).toBeLessThanOrEqual(
                    position.y + dimensions.height + 5
                );
            });
        });
    });

    describe("getEventNodeHandles", () => {
        it("should extract rectangular handle positions with correct types", () => {
            const nodeId = "event-789";
            const position = { x: 200, y: 300 };
            const dimensions = { width: 180, height: 100 };

            const handles = getEventNodeHandles(nodeId, position, dimensions);

            const topHandles = handles.filter((h) => h.side === "top");
            const rightHandles = handles.filter((h) => h.side === "right");
            const bottomHandles = handles.filter((h) => h.side === "bottom");
            const leftHandles = handles.filter((h) => h.side === "left");

            expect(topHandles.length).toBeGreaterThan(0);
            expect(rightHandles.length).toBeGreaterThan(0);
            expect(bottomHandles.length).toBeGreaterThan(0);
            expect(leftHandles.length).toBeGreaterThan(0);

            [...topHandles, ...rightHandles, ...bottomHandles].forEach(
                (handle) => {
                    expect(handle.type).toBe("source");
                }
            );

            leftHandles.forEach((handle) => {
                expect(handle.type).toBe("target");
            });

            topHandles.forEach((handle) => {
                expect(handle.coordinates.y).toBe(position.y + 5);
            });

            leftHandles.forEach((handle) => {
                expect(handle.coordinates.x).toBe(position.x + 5);
            });
        });
    });

    describe("getAllNodeHandles", () => {
        const testCases = [
            {
                name: "Activity Node",
                node: {
                    id: "test-activity",
                    type: "activity",
                    position: { x: 100, y: 200 },
                    data: { width: 200, height: 120 },
                } as BaseNode,
            },
            {
                name: "Generator Node",
                node: {
                    id: "test-generator",
                    type: "generator",
                    position: { x: 300, y: 400 },
                    data: { width: 150, height: 80 },
                } as BaseNode,
            },
            {
                name: "Event Node",
                node: {
                    id: "test-event",
                    type: "event",
                    position: { x: 0, y: 0 },
                    data: { width: 180, height: 100 },
                } as BaseNode,
            },
            {
                name: "Terminator Node",
                node: {
                    id: "test-terminator",
                    type: "terminator",
                    position: { x: 50, y: 150 },
                    data: { width: 120, height: 60 },
                } as BaseNode,
            },
        ];

        testCases.forEach(({ name, node }) => {
            it(`should extract handles correctly for ${name}`, () => {
                const handles = getAllNodeHandles(node);

                expect(handles.length).toBeGreaterThan(0);

                handles.forEach((handle) => {
                    expect(handle.nodeId).toBe(node.id);
                    expect(handle.id).toContain(node.id);
                });

                const sides = new Set(handles.map((h) => h.side));
                expect(sides.size).toBeGreaterThanOrEqual(2);

                const nodeWidth = node.data?.width || node.width || 200;
                const nodeHeight = node.data?.height || node.height || 120;

                handles.forEach((handle) => {
                    expect(handle.coordinates.x).toBeGreaterThanOrEqual(
                        node.position.x - 50
                    );
                    expect(handle.coordinates.x).toBeLessThanOrEqual(
                        node.position.x + nodeWidth + 50
                    );
                    expect(handle.coordinates.y).toBeGreaterThanOrEqual(
                        node.position.y - 50
                    );
                    expect(handle.coordinates.y).toBeLessThanOrEqual(
                        node.position.y + nodeHeight + 100
                    );
                });
            });
        });

        it("should return empty array for unknown node type", () => {
            const unknownNode = {
                id: "unknown-node",
                type: "unknown-type",
                position: { x: 0, y: 0 },
                data: { width: 100, height: 60 },
            } as BaseNode;

            const consoleWarnSpy = jest
                .spyOn(console, "warn")
                .mockImplementation();
            const handles = getAllNodeHandles(unknownNode);

            expect(handles).toEqual([]);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                "Unknown node type: unknown-type"
            );

            consoleWarnSpy.mockRestore();
        });
    });

    describe("getHandleCoordinatesById", () => {
        const testNodes: BaseNode[] = [
            {
                id: "node1",
                type: "activity",
                position: { x: 0, y: 0 },
                data: { width: 200, height: 120 },
            } as BaseNode,
            {
                id: "node2",
                type: "generator",
                position: { x: 300, y: 200 },
                data: { width: 150, height: 80 },
            } as BaseNode,
        ];

        it("should return correct coordinates for existing handle", () => {
            const node1Handles = getAllNodeHandles(testNodes[0]);
            expect(node1Handles.length).toBeGreaterThan(0);

            const testHandle = node1Handles[0];
            const result = getHandleCoordinatesById(testHandle.id, testNodes);

            expect(result).toEqual(testHandle.coordinates);
        });

        it("should return null for non-existent node", () => {
            const result = getHandleCoordinatesById(
                "nonexistent-node-top-0",
                testNodes
            );
            expect(result).toBeNull();
        });

        it("should return null for non-existent handle on existing node", () => {
            const result = getHandleCoordinatesById("node1-top-999", testNodes);
            expect(result).toBeNull();
        });

        it("should work with different node types", () => {
            testNodes.forEach((node) => {
                const handles = getAllNodeHandles(node);
                if (handles.length > 0) {
                    const randomHandle =
                        handles[Math.floor(Math.random() * handles.length)];
                    const result = getHandleCoordinatesById(
                        randomHandle.id,
                        testNodes
                    );
                    expect(result).toEqual(randomHandle.coordinates);
                }
            });
        });
    });

    describe("getHandleInfoById", () => {
        const testNodes: BaseNode[] = [
            {
                id: "info-test-node",
                type: "event",
                position: { x: 100, y: 200 },
                data: { width: 150, height: 90 },
            } as BaseNode,
        ];

        it("should return complete handle information", () => {
            const allHandles = getAllNodeHandles(testNodes[0]);
            expect(allHandles.length).toBeGreaterThan(0);

            const testHandle = allHandles[0];
            const result = getHandleInfoById(testHandle.id, testNodes);

            expect(result).toEqual(testHandle);
            expect(result?.id).toBe(testHandle.id);
            expect(result?.coordinates).toEqual(testHandle.coordinates);
            expect(result?.side).toBe(testHandle.side);
            expect(result?.type).toBe(testHandle.type);
            expect(result?.nodeId).toBe(testHandle.nodeId);
        });

        it("should return null for invalid handle ID", () => {
            const result = getHandleInfoById("invalid-handle-id", testNodes);
            expect(result).toBeNull();
        });
    });

    describe("Hyphenated Node ID Tests", () => {
        const hyphenatedNodes: BaseNode[] = [
            {
                id: "simple-node",
                type: "activity",
                position: { x: 0, y: 0 },
                data: { width: 100, height: 60 },
            } as BaseNode,
            {
                id: "multi-hyphen-node-name",
                type: "event",
                position: { x: 200, y: 100 },
                data: { width: 150, height: 80 },
            } as BaseNode,
            {
                id: "very-long-hyphenated-node-name-here",
                type: "generator",
                position: { x: 400, y: 200 },
                data: { width: 120, height: 70 },
            } as BaseNode,
        ];

        it("should handle hyphenated node IDs correctly", () => {
            hyphenatedNodes.forEach((node) => {
                const handles = getAllNodeHandles(node);
                expect(handles.length).toBeGreaterThan(0);

                handles.forEach((handle) => {
                    expect(handle.id).toContain(node.id);
                    expect(handle.nodeId).toBe(node.id);

                    const coordinates = getHandleCoordinatesById(
                        handle.id,
                        hyphenatedNodes
                    );
                    expect(coordinates).toEqual(handle.coordinates);

                    const info = getHandleInfoById(handle.id, hyphenatedNodes);
                    expect(info).toEqual(handle);
                });
            });
        });

        it("should correctly parse handle IDs with various hyphenated node names", () => {
            const testCases = [
                {
                    nodeId: "simple-node",
                    handleId: "simple-node-top-0",
                    expectedParse: {
                        nodeId: "simple-node",
                        side: "top",
                        index: 0,
                    },
                },
                {
                    nodeId: "multi-hyphen-node-name",
                    handleId: "multi-hyphen-node-name-right-2",
                    expectedParse: {
                        nodeId: "multi-hyphen-node-name",
                        side: "right",
                        index: 2,
                    },
                },
                {
                    nodeId: "very-long-hyphenated-node-name-here",
                    handleId: "very-long-hyphenated-node-name-here-bottom-1",
                    expectedParse: {
                        nodeId: "very-long-hyphenated-node-name-here",
                        side: "bottom",
                        index: 1,
                    },
                },
            ];

            testCases.forEach(({ nodeId, handleId, expectedParse }) => {
                const node = hyphenatedNodes.find((n) => n.id === nodeId);
                expect(node).toBeDefined();

                const result = getHandleInfoById(handleId, hyphenatedNodes);

                if (result) {
                    expect(result.nodeId).toBe(expectedParse.nodeId);
                    expect(result.side).toBe(expectedParse.side);
                }
            });
        });

        it("should return null for malformed handle IDs", () => {
            const malformedIds = [
                "no-side-specified",
                "invalid-side-fake-0",
                "missing-index-top-",
                "invalid-index-top-abc",
                "",
                "single-word",
            ];

            malformedIds.forEach((malformedId) => {
                const coordinates = getHandleCoordinatesById(
                    malformedId,
                    hyphenatedNodes
                );
                const info = getHandleInfoById(malformedId, hyphenatedNodes);

                expect(coordinates).toBeNull();
                expect(info).toBeNull();
            });
        });
    });

    describe("Integration Tests", () => {
        it("should maintain consistency between individual and unified functions", () => {
            const testNode: BaseNode = {
                id: "consistency-test",
                type: "activity",
                position: { x: 50, y: 100 },
                data: { width: 180, height: 110 },
            } as BaseNode;

            const unifiedResult = getAllNodeHandles(testNode);
            const directResult = getActivityNodeHandles(
                testNode.id,
                testNode.position,
                { width: testNode.data!.width, height: testNode.data!.height }
            );

            expect(unifiedResult).toEqual(directResult);
        });

        it("should handle coordinate lookup for all node types", () => {
            const nodes: BaseNode[] = [
                {
                    id: "a",
                    type: "activity",
                    position: { x: 0, y: 0 },
                    data: { width: 100, height: 60 },
                },
                {
                    id: "g",
                    type: "generator",
                    position: { x: 200, y: 100 },
                    data: { width: 120, height: 70 },
                },
                {
                    id: "e",
                    type: "event",
                    position: { x: 400, y: 200 },
                    data: { width: 140, height: 80 },
                },
                {
                    id: "t",
                    type: "terminator",
                    position: { x: 600, y: 300 },
                    data: { width: 110, height: 50 },
                },
            ] as BaseNode[];

            nodes.forEach((node) => {
                const handles = getAllNodeHandles(node);
                handles.forEach((handle) => {
                    const coordinates = getHandleCoordinatesById(
                        handle.id,
                        nodes
                    );
                    expect(coordinates).toEqual(handle.coordinates);

                    const info = getHandleInfoById(handle.id, nodes);
                    expect(info).toEqual(handle);
                });
            });
        });
    });
});
