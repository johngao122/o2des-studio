/**
 * Tests for routing data serialization and deserialization
 */

import { SerializationService } from "../SerializationService";
import { BaseEdge, BaseNode } from "../../types/base";
import { MarkerType } from "reactflow";

jest.mock("../AutosaveService", () => ({
    getInstance: () => ({
        autosave: jest.fn(),
    }),
}));

describe("Routing Data Serialization/Deserialization", () => {
    let serializationService: SerializationService;

    beforeEach(() => {
        serializationService = new SerializationService();
    });

    describe("Edge routing metadata serialization", () => {
        it("should serialize edges with complete orthogonal routing metadata", () => {
            const nodes: BaseNode[] = [
                {
                    id: "node-1",
                    type: "event",
                    name: "Event 1",
                    position: { x: 0, y: 0 },
                    data: { label: "Event 1" },
                },
                {
                    id: "node-2",
                    type: "event",
                    name: "Event 2",
                    position: { x: 200, y: 100 },
                    data: { label: "Event 2" },
                },
            ];

            const edges: BaseEdge[] = [
                {
                    id: "edge-with-routing",
                    source: "node-1",
                    target: "node-2",
                    sourceHandle: "source-right",
                    targetHandle: "target-left",
                    type: "eventGraph",
                    graphType: "eventBased",
                    conditions: [],
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 20,
                        height: 20,
                    },
                    data: {
                        condition: "customCondition",
                        edgeType: "straight",

                        useOrthogonalRouting: true,
                        routingType: "horizontal-first",
                        routingMetrics: {
                            pathLength: 250,
                            segmentCount: 2,
                            routingType: "horizontal-first",
                            efficiency: 0.92,
                            handleCombination: "node-1:right -> node-2:left",
                        },
                        selectedHandles: {
                            source: {
                                id: "source-right",
                                nodeId: "node-1",
                                position: { x: 50, y: 25 },
                                side: "right",
                                type: "source",
                            },
                            target: {
                                id: "target-left",
                                nodeId: "node-2",
                                position: { x: 200, y: 125 },
                                side: "left",
                                type: "target",
                            },
                        },
                        controlPoints: [
                            { x: 100, y: 25 },
                            { x: 150, y: 125 },
                        ],
                    },
                },
            ];

            const metadata = {
                version: "1.0.0",
                created: "2024-01-01T00:00:00Z",
                modified: "2024-01-01T01:00:00Z",
                projectName: "Test Project",
                author: "Test User",
            };

            const serialized = serializationService.serializeModel(
                nodes,
                edges,
                "Test Project",
                metadata
            );

            expect(serialized).toBeDefined();
            expect(serialized.edges).toHaveLength(1);

            const serializedEdge = serialized.edges[0];
            expect(serializedEdge.data.useOrthogonalRouting).toBe(true);
            expect(serializedEdge.data.routingType).toBe("horizontal-first");
            expect(serializedEdge.data.routingMetrics).toBeDefined();
            expect(serializedEdge.data.routingMetrics.pathLength).toBe(250);
            expect(serializedEdge.data.routingMetrics.efficiency).toBe(0.92);
            expect(serializedEdge.data.selectedHandles).toBeDefined();
            expect(serializedEdge.data.selectedHandles.source.position).toEqual(
                { x: 50, y: 25 }
            );
            expect(serializedEdge.data.controlPoints).toHaveLength(2);
        });

        it("should serialize edges with partial routing metadata", () => {
            const nodes: BaseNode[] = [
                {
                    id: "node-a",
                    type: "activity",
                    name: "Activity A",
                    position: { x: 0, y: 0 },
                    data: { label: "Activity A" },
                },
            ];

            const edges: BaseEdge[] = [
                {
                    id: "edge-partial-routing",
                    source: "node-a",
                    target: "node-a",
                    type: "rcq",
                    conditions: [],
                    data: {
                        useOrthogonalRouting: true,

                        edgeType: "rounded",
                    },
                },
            ];

            const metadata = {
                version: "1.0.0",
                created: "2024-01-01T00:00:00Z",
                modified: "2024-01-01T01:00:00Z",
                projectName: "Test Project",
            };

            const serialized = serializationService.serializeModel(
                nodes,
                edges,
                "Test Project",
                metadata
            );

            const serializedEdge = serialized.edges[0];
            expect(serializedEdge.data.useOrthogonalRouting).toBe(true);
            expect(serializedEdge.data.routingType).toBeUndefined();
            expect(serializedEdge.data.routingMetrics).toBeUndefined();
            expect(serializedEdge.data.selectedHandles).toBeUndefined();
        });

        it("should serialize edges without routing metadata (legacy support)", () => {
            const nodes: BaseNode[] = [];
            const edges: BaseEdge[] = [
                {
                    id: "legacy-edge",
                    source: "old-node-1",
                    target: "old-node-2",
                    type: "eventGraph",
                    conditions: [],
                    data: {
                        condition: "legacyCondition",
                        edgeType: "bezier",
                    },
                },
            ];

            const metadata = {
                version: "0.9.0",
                created: "2023-12-01T00:00:00Z",
                modified: "2023-12-01T01:00:00Z",
                projectName: "Legacy Project",
            };

            const serialized = serializationService.serializeModel(
                nodes,
                edges,
                "Legacy Project",
                metadata
            );

            const serializedEdge = serialized.edges[0];
            expect(serializedEdge.data.condition).toBe("legacyCondition");
            expect(serializedEdge.data.edgeType).toBe("bezier");
            expect(serializedEdge.data.useOrthogonalRouting).toBeUndefined();
        });
    });

    describe("Edge routing metadata deserialization", () => {
        it("should deserialize edges with complete routing metadata", async () => {
            const serializedData = {
                projectName: "Routing Test Project",
                nodes: [
                    {
                        id: "node-1",
                        type: "event",
                        name: "Event 1",
                        position: { x: 0, y: 0 },
                        data: { label: "Event 1" },
                    },
                ],
                edges: [
                    {
                        id: "deserialized-edge",
                        source: "node-1",
                        target: "node-1",
                        type: "eventGraph",
                        conditions: [],
                        data: {
                            condition: "deserializedCondition",
                            useOrthogonalRouting: true,
                            routingType: "vertical-first",
                            routingMetrics: {
                                pathLength: 180,
                                segmentCount: 3,
                                routingType: "vertical-first",
                                efficiency: 0.87,
                                handleCombination:
                                    "node-1:bottom -> node-1:top",
                            },
                            selectedHandles: {
                                source: {
                                    id: "source-bottom",
                                    nodeId: "node-1",
                                    position: { x: 25, y: 50 },
                                    side: "bottom",
                                    type: "source",
                                },
                                target: {
                                    id: "target-top",
                                    nodeId: "node-1",
                                    position: { x: 25, y: 0 },
                                    side: "top",
                                    type: "target",
                                },
                            },
                            controlPoints: [
                                { x: 25, y: 80 },
                                { x: -50, y: 80 },
                                { x: -50, y: -30 },
                                { x: 25, y: -30 },
                            ],
                        },
                    },
                ],
                metadata: {
                    version: "1.0.0",
                    created: "2024-01-01T00:00:00Z",
                    modified: "2024-01-01T02:00:00Z",
                    projectName: "Routing Test Project",
                },
            };

            const deserialized = await serializationService.deserializeModel(
                serializedData
            );

            expect(deserialized).toBeDefined();
            expect(deserialized.edges).toHaveLength(1);

            const deserializedEdge = deserialized.edges[0] as BaseEdge;
            expect(deserializedEdge.data.useOrthogonalRouting).toBe(true);
            expect(deserializedEdge.data.routingType).toBe("vertical-first");

            expect(deserializedEdge.data.routingMetrics).toBeDefined();
            expect(deserializedEdge.data.routingMetrics!.pathLength).toBe(180);
            expect(deserializedEdge.data.routingMetrics!.segmentCount).toBe(3);
            expect(deserializedEdge.data.routingMetrics!.efficiency).toBe(0.87);

            expect(deserializedEdge.data.selectedHandles).toBeDefined();
            expect(deserializedEdge.data.selectedHandles!.source.side).toBe(
                "bottom"
            );
            expect(deserializedEdge.data.selectedHandles!.target.side).toBe(
                "top"
            );

            expect(deserializedEdge.data.controlPoints).toHaveLength(4);
            expect(deserializedEdge.data.controlPoints![0]).toEqual({
                x: 25,
                y: 80,
            });
        });

        it("should handle malformed routing metadata gracefully", async () => {
            const malformedData = {
                projectName: "Malformed Project",
                nodes: [],
                edges: [
                    {
                        id: "malformed-edge",
                        source: "node-a",
                        target: "node-b",
                        type: "rcq",
                        conditions: [],
                        data: {
                            useOrthogonalRouting: "invalid",
                            routingMetrics: {
                                pathLength: "not-a-number",
                                segmentCount: null,
                            },
                            selectedHandles: {},
                            controlPoints: "not-an-array",
                        },
                    },
                ],
                metadata: {
                    version: "1.0.0",
                    created: "2024-01-01T00:00:00Z",
                    modified: "2024-01-01T01:00:00Z",
                    projectName: "Malformed Project",
                },
            };

            const deserialized = await serializationService.deserializeModel(
                malformedData
            );

            expect(deserialized.edges).toHaveLength(1);
            const edge = deserialized.edges[0] as BaseEdge;
            expect(edge.id).toBe("malformed-edge");
        });

        it("should preserve routing metadata across serialize/deserialize cycle", async () => {
            const originalNodes: BaseNode[] = [
                {
                    id: "cycle-node-1",
                    type: "event",
                    name: "Cycle Test 1",
                    position: { x: 100, y: 50 },
                    data: { label: "Cycle Test 1" },
                },
                {
                    id: "cycle-node-2",
                    type: "event",
                    name: "Cycle Test 2",
                    position: { x: 300, y: 150 },
                    data: { label: "Cycle Test 2" },
                },
            ];

            const originalEdges: BaseEdge[] = [
                {
                    id: "cycle-edge",
                    source: "cycle-node-1",
                    target: "cycle-node-2",
                    type: "eventGraph",
                    conditions: [],
                    data: {
                        condition: "cycleCondition",
                        useOrthogonalRouting: true,
                        routingType: "horizontal-first",
                        routingMetrics: {
                            pathLength: 223.6,
                            segmentCount: 2,
                            routingType: "horizontal-first",
                            efficiency: 0.89,
                            handleCombination:
                                "cycle-node-1:right -> cycle-node-2:left",
                        },
                        selectedHandles: {
                            source: {
                                id: "source-right",
                                nodeId: "cycle-node-1",
                                position: { x: 150, y: 75 },
                                side: "right",
                                type: "source",
                            },
                            target: {
                                id: "target-left",
                                nodeId: "cycle-node-2",
                                position: { x: 300, y: 175 },
                                side: "left",
                                type: "target",
                            },
                        },
                        controlPoints: [
                            { x: 200, y: 75 },
                            { x: 200, y: 175 },
                        ],
                    },
                },
            ];

            const originalMetadata = {
                version: "1.0.0",
                created: "2024-01-01T00:00:00Z",
                modified: "2024-01-01T03:00:00Z",
                projectName: "Cycle Test Project",
            };

            const serialized = serializationService.serializeModel(
                originalNodes,
                originalEdges,
                "Cycle Test Project",
                originalMetadata
            );

            const deserialized = await serializationService.deserializeModel(
                serialized
            );

            const originalEdge = originalEdges[0];
            const deserializedEdge = deserialized.edges[0] as BaseEdge;

            expect(deserializedEdge.data.useOrthogonalRouting).toBe(
                originalEdge.data.useOrthogonalRouting
            );
            expect(deserializedEdge.data.routingType).toBe(
                originalEdge.data.routingType
            );

            expect(deserializedEdge.data.routingMetrics).toEqual(
                originalEdge.data.routingMetrics
            );

            expect(deserializedEdge.data.selectedHandles).toEqual(
                originalEdge.data.selectedHandles
            );

            expect(deserializedEdge.data.controlPoints).toEqual(
                originalEdge.data.controlPoints
            );
        });
    });

    describe("Multiple edge types serialization", () => {
        it("should serialize mixed edge types with routing metadata", () => {
            const nodes: BaseNode[] = [
                {
                    id: "event-node",
                    type: "event",
                    name: "Event Node",
                    position: { x: 0, y: 0 },
                    data: {},
                },
                {
                    id: "activity-node",
                    type: "activity",
                    name: "Activity Node",
                    position: { x: 200, y: 0 },
                    data: {},
                },
                {
                    id: "resource-node",
                    type: "resource",
                    name: "Resource Node",
                    position: { x: 100, y: 200 },
                    data: {},
                },
            ];

            const edges: BaseEdge[] = [
                {
                    id: "eventgraph-edge",
                    source: "event-node",
                    target: "activity-node",
                    type: "eventGraph",
                    conditions: [],
                    data: {
                        condition: "eventCondition",
                        useOrthogonalRouting: true,
                        routingType: "horizontal-first",
                        routingMetrics: {
                            pathLength: 200,
                            segmentCount: 1,
                            routingType: "horizontal-first",
                            efficiency: 1.0,
                            handleCombination:
                                "event-node:right -> activity-node:left",
                        },
                    },
                },

                {
                    id: "rcq-edge",
                    source: "activity-node",
                    target: "resource-node",
                    type: "rcq",
                    conditions: [],
                    data: {
                        condition: "resourceCondition",
                        useOrthogonalRouting: true,
                        routingType: "vertical-first",
                        routingMetrics: {
                            pathLength: 223.6,
                            segmentCount: 2,
                            routingType: "vertical-first",
                            efficiency: 0.89,
                            handleCombination:
                                "activity-node:bottom -> resource-node:top",
                        },
                    },
                },

                {
                    id: "init-edge",
                    source: "resource-node",
                    target: "event-node",
                    type: "initialization",
                    conditions: [],
                    data: {
                        parameter: "5",
                        useOrthogonalRouting: true,
                        routingType: "horizontal-first",
                        routingMetrics: {
                            pathLength: 282.8,
                            segmentCount: 3,
                            routingType: "horizontal-first",
                            efficiency: 0.71,
                            handleCombination:
                                "resource-node:left -> event-node:bottom",
                        },
                    },
                },
            ];

            const metadata = {
                version: "1.0.0",
                created: "2024-01-01T00:00:00Z",
                modified: "2024-01-01T04:00:00Z",
                projectName: "Mixed Edge Types Project",
            };

            const serialized = serializationService.serializeModel(
                nodes,
                edges,
                "Mixed Edge Types Project",
                metadata
            );

            expect(serialized.edges).toHaveLength(3);

            const eventGraphEdge = serialized.edges.find(
                (e) => e.type === "eventGraph"
            );
            const rcqEdge = serialized.edges.find((e) => e.type === "rcq");
            const initEdge = serialized.edges.find(
                (e) => e.type === "initialization"
            );

            expect(eventGraphEdge?.data.useOrthogonalRouting).toBe(true);
            expect(eventGraphEdge?.data.routingType).toBe("horizontal-first");
            expect(eventGraphEdge?.data.routingMetrics?.efficiency).toBe(1.0);

            expect(rcqEdge?.data.useOrthogonalRouting).toBe(true);
            expect(rcqEdge?.data.routingType).toBe("vertical-first");
            expect(rcqEdge?.data.routingMetrics?.efficiency).toBe(0.89);

            expect(initEdge?.data.useOrthogonalRouting).toBe(true);
            expect(initEdge?.data.routingType).toBe("horizontal-first");
            expect(initEdge?.data.routingMetrics?.efficiency).toBe(0.71);
        });
    });

    describe("Version compatibility", () => {
        it("should handle different project versions with routing metadata", async () => {
            const testVersions = ["1.0.0", "1.1.0", "2.0.0"];

            for (const version of testVersions) {
                const nodes: BaseNode[] = [
                    {
                        id: `node-${version}`,
                        type: "event",
                        name: `Node ${version}`,
                        position: { x: 0, y: 0 },
                        data: {},
                    },
                ];

                const edges: BaseEdge[] = [
                    {
                        id: `edge-${version}`,
                        source: `node-${version}`,
                        target: `node-${version}`,
                        type: "eventGraph",
                        conditions: [],
                        data: {
                            useOrthogonalRouting: true,
                            routingType: "horizontal-first",
                            routingMetrics: {
                                pathLength: 100,
                                segmentCount: 1,
                                routingType: "horizontal-first",
                                efficiency: 1.0,
                                handleCombination: `node-${version}:right -> node-${version}:left`,
                            },
                        },
                    },
                ];

                const metadata = {
                    version,
                    created: "2024-01-01T00:00:00Z",
                    modified: "2024-01-01T05:00:00Z",
                    projectName: `Version ${version} Project`,
                };

                const serialized = serializationService.serializeModel(
                    nodes,
                    edges,
                    `Version ${version} Project`,
                    metadata
                );

                const deserialized =
                    await serializationService.deserializeModel(serialized);

                expect(deserialized.edges).toHaveLength(1);
                const edge = deserialized.edges[0] as BaseEdge;
                expect(edge.data.useOrthogonalRouting).toBe(true);
                expect(edge.data.routingType).toBe("horizontal-first");
                expect(edge.data.routingMetrics).toBeDefined();
            }
        });
    });
});
