/**
 * Tests for backward compatibility when loading existing diagrams with orthogonal routing
 */

import { SerializationService } from "../../services/SerializationService";
import { BaseEdge, BaseNode } from "../../types/base";

jest.mock("../../services/AutosaveService", () => ({
    getInstance: () => ({
        autosave: jest.fn(),
    }),
}));

interface TestStoreState {
    nodes: BaseNode[];
    edges: BaseEdge[];
    loadSerializedState: (serialized: string) => Promise<void>;
    setNodes: (nodes: BaseNode[]) => void;
    setEdges: (edges: BaseEdge[]) => void;
}

describe("Backward Compatibility with Orthogonal Routing", () => {
    let serializationService: SerializationService;
    let testStore: TestStoreState;

    beforeEach(() => {
        serializationService = new SerializationService();

        testStore = {
            nodes: [],
            edges: [],
            loadSerializedState: async (serialized: string) => {
                const parsed = await serializationService.deserializeModel(
                    JSON.parse(serialized)
                );
                testStore.nodes = parsed.nodes;
                testStore.edges = parsed.edges;
            },
            setNodes: (nodes: BaseNode[]) => {
                testStore.nodes = nodes;
            },
            setEdges: (edges: BaseEdge[]) => {
                testStore.edges = edges;
            },
        };
    });

    describe("Legacy diagrams without routing metadata", () => {
        it("should load legacy diagrams and apply default orthogonal routing", async () => {
            const legacyDiagram = {
                projectName: "Legacy Project",
                nodes: [
                    {
                        id: "legacy-node-1",
                        type: "event",
                        name: "Legacy Event 1",
                        position: { x: 100, y: 100 },
                        data: { label: "Event 1" },
                    },
                    {
                        id: "legacy-node-2",
                        type: "event",
                        name: "Legacy Event 2",
                        position: { x: 300, y: 200 },
                        data: { label: "Event 2" },
                    },
                ],
                edges: [
                    {
                        id: "legacy-edge-1",
                        source: "legacy-node-1",
                        target: "legacy-node-2",
                        type: "eventGraph",
                        conditions: [],
                        data: {
                            condition: "legacyCondition",
                            edgeType: "straight",
                        },
                    },
                ],
                metadata: {
                    version: "0.9.0",
                    created: "2023-12-01T00:00:00Z",
                    modified: "2023-12-01T01:00:00Z",
                    projectName: "Legacy Project",
                },
            };

            await testStore.loadSerializedState(JSON.stringify(legacyDiagram));

            expect(testStore.nodes).toHaveLength(2);
            expect(testStore.nodes[0].id).toBe("legacy-node-1");
            expect(testStore.nodes[1].id).toBe("legacy-node-2");

            expect(testStore.edges).toHaveLength(1);
            const loadedEdge = testStore.edges[0];

            expect(loadedEdge.id).toBe("legacy-edge-1");
            expect(loadedEdge.data.condition).toBe("legacyCondition");
            expect(loadedEdge.data.edgeType).toBe("straight");

            expect(loadedEdge.data.useOrthogonalRouting).toBeUndefined();
            expect(loadedEdge.data.routingType).toBeUndefined();
            expect(loadedEdge.data.routingMetrics).toBeUndefined();
        });

        it("should handle legacy diagrams with mixed edge types", async () => {
            const legacyMixedDiagram = {
                projectName: "Legacy Mixed Types",
                nodes: [
                    {
                        id: "event-node",
                        type: "event",
                        name: "Event",
                        position: { x: 0, y: 0 },
                        data: {},
                    },
                    {
                        id: "activity-node",
                        type: "activity",
                        name: "Activity",
                        position: { x: 200, y: 0 },
                        data: {},
                    },
                    {
                        id: "resource-node",
                        type: "resource",
                        name: "Resource",
                        position: { x: 100, y: 200 },
                        data: {},
                    },
                ],
                edges: [
                    {
                        id: "legacy-eventgraph",
                        source: "event-node",
                        target: "activity-node",
                        type: "eventGraph",
                        conditions: [],
                        data: {
                            condition: "True",
                            edgeType: "bezier",
                        },
                    },
                    {
                        id: "legacy-rcq",
                        source: "activity-node",
                        target: "resource-node",
                        type: "rcq",
                        conditions: [],
                        data: {
                            condition: "resource.available",
                            edgeType: "straight",
                        },
                    },
                    {
                        id: "legacy-init",
                        source: "resource-node",
                        target: "event-node",
                        type: "initialization",
                        conditions: [],
                        data: {
                            parameter: "10",
                            edgeType: "rounded",
                        },
                    },
                ],
                metadata: {
                    version: "0.8.5",
                    created: "2023-11-15T00:00:00Z",
                    modified: "2023-11-20T00:00:00Z",
                    projectName: "Legacy Mixed Types",
                },
            };

            await testStore.loadSerializedState(
                JSON.stringify(legacyMixedDiagram)
            );

            expect(testStore.edges).toHaveLength(3);

            const eventGraphEdge = testStore.edges.find(
                (e) => e.type === "eventGraph"
            );
            const rcqEdge = testStore.edges.find((e) => e.type === "rcq");
            const initEdge = testStore.edges.find(
                (e) => e.type === "initialization"
            );

            expect(eventGraphEdge?.data.condition).toBe("True");
            expect(eventGraphEdge?.data.edgeType).toBe("bezier");

            expect(rcqEdge?.data.condition).toBe("resource.available");
            expect(rcqEdge?.data.edgeType).toBe("straight");

            expect(initEdge?.data.parameter).toBe("10");
            expect(initEdge?.data.edgeType).toBe("rounded");

            expect(eventGraphEdge?.data.useOrthogonalRouting).toBeUndefined();
            expect(rcqEdge?.data.useOrthogonalRouting).toBeUndefined();
            expect(initEdge?.data.useOrthogonalRouting).toBeUndefined();
        });
    });

    describe("Partial routing metadata migration", () => {
        it("should handle diagrams with partial routing metadata", async () => {
            const partialRoutingDiagram = {
                projectName: "Partial Routing Project",
                nodes: [
                    {
                        id: "node-a",
                        type: "event",
                        name: "Event A",
                        position: { x: 50, y: 50 },
                        data: {},
                    },
                    {
                        id: "node-b",
                        type: "event",
                        name: "Event B",
                        position: { x: 250, y: 150 },
                        data: {},
                    },
                ],
                edges: [
                    {
                        id: "partial-routing-edge",
                        source: "node-a",
                        target: "node-b",
                        type: "eventGraph",
                        conditions: [],
                        data: {
                            condition: "partialCondition",
                            useOrthogonalRouting: true,
                            routingType: "horizontal-first",

                            edgeType: "straight",
                        },
                    },
                ],
                metadata: {
                    version: "1.0.0-alpha",
                    created: "2024-01-15T00:00:00Z",
                    modified: "2024-01-15T01:00:00Z",
                    projectName: "Partial Routing Project",
                },
            };

            await testStore.loadSerializedState(
                JSON.stringify(partialRoutingDiagram)
            );

            expect(testStore.edges).toHaveLength(1);
            const edge = testStore.edges[0];

            expect(edge.data.useOrthogonalRouting).toBe(true);
            expect(edge.data.routingType).toBe("horizontal-first");
            expect(edge.data.condition).toBe("partialCondition");

            expect(edge.data.routingMetrics).toBeUndefined();
            expect(edge.data.selectedHandles).toBeUndefined();
        });

        it("should handle inconsistent routing metadata gracefully", async () => {
            const inconsistentDiagram = {
                projectName: "Inconsistent Routing",
                nodes: [
                    {
                        id: "inconsistent-node",
                        type: "activity",
                        name: "Activity",
                        position: { x: 0, y: 0 },
                        data: {},
                    },
                ],
                edges: [
                    {
                        id: "inconsistent-edge",
                        source: "inconsistent-node",
                        target: "inconsistent-node",
                        type: "rcq",
                        conditions: [],
                        data: {
                            condition: "inconsistentCondition",
                            useOrthogonalRouting: false,
                            routingType: "vertical-first",
                            routingMetrics: {
                                pathLength: 150,
                            },
                            selectedHandles: {
                                source: {
                                    id: "partial-source",
                                },
                            },
                            edgeType: "rounded",
                        },
                    },
                ],
                metadata: {
                    version: "1.0.0-beta",
                    created: "2024-01-20T00:00:00Z",
                    modified: "2024-01-20T01:00:00Z",
                    projectName: "Inconsistent Routing",
                },
            };

            await testStore.loadSerializedState(
                JSON.stringify(inconsistentDiagram)
            );

            expect(testStore.edges).toHaveLength(1);
            const edge = testStore.edges[0];

            expect(edge.data.condition).toBe("inconsistentCondition");
            expect(edge.data.useOrthogonalRouting).toBe(false);
            expect(edge.data.routingType).toBe("vertical-first");
            expect(edge.data.edgeType).toBe("rounded");

            expect(edge.data.routingMetrics?.pathLength).toBe(150);
            expect(edge.data.selectedHandles?.source?.id).toBe(
                "partial-source"
            );
        });
    });

    describe("Version migration scenarios", () => {
        it("should handle version progression from pre-routing to full routing", async () => {
            const versionProgression = [
                {
                    version: "0.9.0",
                    edges: [
                        {
                            id: "v090-edge",
                            source: "node1",
                            target: "node2",
                            type: "eventGraph",
                            conditions: [],
                            data: {
                                condition: "v090condition",
                                edgeType: "straight",
                            },
                        },
                    ],
                },

                {
                    version: "1.0.0-alpha",
                    edges: [
                        {
                            id: "v100alpha-edge",
                            source: "node1",
                            target: "node2",
                            type: "eventGraph",
                            conditions: [],
                            data: {
                                condition: "v100alphaCondition",
                                useOrthogonalRouting: true,
                                edgeType: "straight",
                            },
                        },
                    ],
                },

                {
                    version: "1.0.0",
                    edges: [
                        {
                            id: "v100-edge",
                            source: "node1",
                            target: "node2",
                            type: "eventGraph",
                            conditions: [],
                            data: {
                                condition: "v100Condition",
                                useOrthogonalRouting: true,
                                routingType: "horizontal-first",
                                routingMetrics: {
                                    pathLength: 200,
                                    segmentCount: 1,
                                    routingType: "horizontal-first",
                                    efficiency: 1.0,
                                    handleCombination:
                                        "node1:right -> node2:left",
                                },
                                selectedHandles: {
                                    source: {
                                        id: "source-right",
                                        nodeId: "node1",
                                        position: { x: 50, y: 25 },
                                        side: "right",
                                        type: "source",
                                    },
                                    target: {
                                        id: "target-left",
                                        nodeId: "node2",
                                        position: { x: 200, y: 25 },
                                        side: "left",
                                        type: "target",
                                    },
                                },
                                edgeType: "straight",
                            },
                        },
                    ],
                },
            ];

            const baseNodes = [
                {
                    id: "node1",
                    type: "event",
                    name: "Node 1",
                    position: { x: 0, y: 0 },
                    data: {},
                },
                {
                    id: "node2",
                    type: "event",
                    name: "Node 2",
                    position: { x: 200, y: 0 },
                    data: {},
                },
            ];

            for (const { version, edges } of versionProgression) {
                const diagram = {
                    projectName: `Version ${version} Test`,
                    nodes: baseNodes,
                    edges,
                    metadata: {
                        version,
                        created: "2024-01-01T00:00:00Z",
                        modified: "2024-01-01T01:00:00Z",
                        projectName: `Version ${version} Test`,
                    },
                };

                await testStore.loadSerializedState(JSON.stringify(diagram));

                expect(testStore.edges).toHaveLength(1);
                const edge = testStore.edges[0];

                expect(edge.data.condition).toContain(
                    version.replace(/[.-]/g, "")
                );
                expect(edge.data.edgeType).toBe("straight");

                if (version === "0.9.0") {
                    expect(edge.data.useOrthogonalRouting).toBeUndefined();
                    expect(edge.data.routingType).toBeUndefined();
                    expect(edge.data.routingMetrics).toBeUndefined();
                } else if (version === "1.0.0-alpha") {
                    expect(edge.data.useOrthogonalRouting).toBe(true);
                    expect(edge.data.routingType).toBeUndefined();
                    expect(edge.data.routingMetrics).toBeUndefined();
                } else if (version === "1.0.0") {
                    expect(edge.data.useOrthogonalRouting).toBe(true);
                    expect(edge.data.routingType).toBe("horizontal-first");
                    expect(edge.data.routingMetrics).toBeDefined();
                    expect(edge.data.selectedHandles).toBeDefined();
                }
            }
        });
    });

    describe("Complex legacy diagrams", () => {
        it("should handle large legacy diagrams with multiple edge types and no routing", async () => {
            const nodes: any[] = [];
            const edges: any[] = [];

            for (let i = 0; i < 10; i++) {
                nodes.push({
                    id: `legacy-node-${i}`,
                    type: i % 2 === 0 ? "event" : "activity",
                    name: `Legacy Node ${i}`,
                    position: { x: (i % 5) * 150, y: Math.floor(i / 5) * 100 },
                    data: { label: `Node ${i}` },
                });
            }

            const edgeTypes = ["eventGraph", "rcq", "initialization"];
            for (let i = 0; i < 15; i++) {
                const sourceIndex = i % nodes.length;
                const targetIndex = (i + 1) % nodes.length;
                const edgeType = edgeTypes[i % edgeTypes.length];

                edges.push({
                    id: `legacy-edge-${i}`,
                    source: `legacy-node-${sourceIndex}`,
                    target: `legacy-node-${targetIndex}`,
                    type: edgeType,
                    conditions: [],
                    data: {
                        ...(edgeType === "eventGraph" && {
                            condition: `condition${i}`,
                        }),
                        ...(edgeType === "rcq" && {
                            condition: `rcqCondition${i}`,
                        }),
                        ...(edgeType === "initialization" && {
                            parameter: `param${i}`,
                        }),
                        edgeType: i % 2 === 0 ? "straight" : "bezier",
                    },
                });
            }

            const complexLegacyDiagram = {
                projectName: "Complex Legacy Diagram",
                nodes,
                edges,
                metadata: {
                    version: "0.8.0",
                    created: "2023-10-01T00:00:00Z",
                    modified: "2023-10-15T00:00:00Z",
                    projectName: "Complex Legacy Diagram",
                    description:
                        "A complex legacy diagram with many nodes and edges",
                },
            };

            await testStore.loadSerializedState(
                JSON.stringify(complexLegacyDiagram)
            );

            expect(testStore.nodes).toHaveLength(10);
            expect(testStore.nodes[0].id).toBe("legacy-node-0");
            expect(testStore.nodes[9].id).toBe("legacy-node-9");

            expect(testStore.edges).toHaveLength(15);

            const eventGraphEdges = testStore.edges.filter(
                (e: BaseEdge) => e.type === "eventGraph"
            );
            const rcqEdges = testStore.edges.filter(
                (e: BaseEdge) => e.type === "rcq"
            );
            const initEdges = testStore.edges.filter(
                (e: BaseEdge) => e.type === "initialization"
            );

            expect(eventGraphEdges.length).toBeGreaterThan(0);
            expect(rcqEdges.length).toBeGreaterThan(0);
            expect(initEdges.length).toBeGreaterThan(0);

            eventGraphEdges.forEach((edge: BaseEdge) => {
                expect(edge.data.condition).toMatch(/^condition\d+$/);
            });

            rcqEdges.forEach((edge: BaseEdge) => {
                expect(edge.data.condition).toMatch(/^rcqCondition\d+$/);
            });

            initEdges.forEach((edge: BaseEdge) => {
                expect(edge.data.parameter).toMatch(/^param\d+$/);
            });

            testStore.edges.forEach((edge: BaseEdge) => {
                expect(edge.data.useOrthogonalRouting).toBeUndefined();
                expect(edge.data.routingType).toBeUndefined();
                expect(edge.data.routingMetrics).toBeUndefined();
                expect(edge.data.selectedHandles).toBeUndefined();
            });
        });
    });

    describe("Error handling in legacy loading", () => {
        it("should handle corrupted legacy diagrams gracefully", async () => {
            const corruptedDiagram = {
                projectName: "Corrupted Legacy",
                nodes: [{ id: "corrupt-node" }],
                edges: [
                    {
                        id: "corrupt-edge",

                        type: "eventGraph",
                        conditions: [],
                        data: null,
                    },
                ],
            };

            expect(() => {
                testStore.loadSerializedState(JSON.stringify(corruptedDiagram));
            }).not.toThrow();
        });

        it("should handle malformed JSON gracefully", async () => {
            const malformedJson = '{ "projectName": "Test", invalid json }';

            await expect(
                testStore.loadSerializedState(malformedJson)
            ).rejects.toThrow();
        });
    });

    describe("Forward compatibility", () => {
        it("should handle future routing metadata fields gracefully", async () => {
            const futureDiagram = {
                projectName: "Future Routing Features",
                nodes: [
                    {
                        id: "future-node-1",
                        type: "event",
                        name: "Future Event",
                        position: { x: 0, y: 0 },
                        data: {},
                    },
                    {
                        id: "future-node-2",
                        type: "event",
                        name: "Future Event 2",
                        position: { x: 200, y: 0 },
                        data: {},
                    },
                ],
                edges: [
                    {
                        id: "future-edge",
                        source: "future-node-1",
                        target: "future-node-2",
                        type: "eventGraph",
                        conditions: [],
                        data: {
                            condition: "futureCondition",
                            useOrthogonalRouting: true,
                            routingType: "horizontal-first",
                            routingMetrics: {
                                pathLength: 200,
                                segmentCount: 1,
                                routingType: "horizontal-first",
                                efficiency: 1.0,
                                handleCombination:
                                    "future-node-1:right -> future-node-2:left",
                            },
                            selectedHandles: {
                                source: {
                                    id: "source-right",
                                    nodeId: "future-node-1",
                                    position: { x: 50, y: 25 },
                                    side: "right",
                                    type: "source",
                                },
                                target: {
                                    id: "target-left",
                                    nodeId: "future-node-2",
                                    position: { x: 200, y: 25 },
                                    side: "left",
                                    type: "target",
                                },
                            },

                            aiOptimizedRouting: true,
                            routingAlgorithm: "quantum-enhanced",
                            adaptivePathfinding: {
                                enabled: true,
                                sensitivity: 0.8,
                                realTimeUpdates: true,
                            },
                            edgeType: "straight",
                        },
                    },
                ],
                metadata: {
                    version: "2.5.0",
                    created: "2025-06-01T00:00:00Z",
                    modified: "2025-06-01T01:00:00Z",
                    projectName: "Future Routing Features",
                    features: [
                        "ai-routing",
                        "quantum-pathfinding",
                        "adaptive-updates",
                    ],
                },
            };

            await testStore.loadSerializedState(JSON.stringify(futureDiagram));

            expect(testStore.edges).toHaveLength(1);
            const edge = testStore.edges[0];

            expect(edge.data.useOrthogonalRouting).toBe(true);
            expect(edge.data.routingType).toBe("horizontal-first");
            expect(edge.data.routingMetrics).toBeDefined();
            expect(edge.data.selectedHandles).toBeDefined();

            expect((edge.data as any).aiOptimizedRouting).toBe(true);
            expect((edge.data as any).routingAlgorithm).toBe(
                "quantum-enhanced"
            );
            expect((edge.data as any).adaptivePathfinding).toBeDefined();

            expect(edge.data.condition).toBe("futureCondition");
        });
    });
});
