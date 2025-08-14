/**
 * Integration tests for edge migration with SerializationService
 *
 * Tests the complete flow from loading legacy projects to migrated edges
 */

import { SerializationService } from "../SerializationService";
import { EdgeMigrationService } from "../EdgeMigrationService";
import { BaseEdge, BaseNode } from "../../types/base";

jest.mock("../AutosaveService", () => ({
    getInstance: () => ({
        autosave: jest.fn(),
    }),
}));

jest.mock("../../lib/routing/OrthogonalRoutingEngine");
jest.mock("../../lib/routing/HandleSelectionService");

describe("Edge Migration Integration", () => {
    let serializationService: SerializationService;
    let mockEdgeMigrationService: jest.Mocked<EdgeMigrationService>;

    const sampleNodes: BaseNode[] = [
        {
            id: "node-1",
            type: "event",
            name: "Start Event",
            position: { x: 100, y: 100 },
            data: { label: "Start" },
        },
        {
            id: "node-2",
            type: "activity",
            name: "Process Activity",
            position: { x: 300, y: 100 },
            data: { label: "Process" },
        },
        {
            id: "node-3",
            type: "event",
            name: "End Event",
            position: { x: 500, y: 100 },
            data: { label: "End" },
        },
    ];

    beforeEach(() => {
        mockEdgeMigrationService = {
            migrateEdgesBatch: jest.fn(),
        } as any;

        serializationService = new SerializationService(
            mockEdgeMigrationService
        );
        jest.clearAllMocks();

        mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
            results: [],
            totalEdges: 0,
            migratedCount: 0,
            skippedCount: 0,
            errorCount: 0,
            processingTimeMs: 0,
        });
    });

    describe("Legacy project loading", () => {
        it("should automatically migrate legacy edges on deserialization", async () => {
            mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
                results: [
                    {
                        migratedEdge: {
                            id: "legacy-edge-1",
                            source: "node-1",
                            target: "node-2",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                condition: "isReady",
                                edgeType: "straight",
                                useOrthogonalRouting: true,
                                routingMetrics: {
                                    pathLength: 200,
                                    efficiency: 0.9,
                                },
                                selectedHandles: { source: {}, target: {} },
                            },
                        },
                        migrationApplied: true,
                        migrationStrategy: "full-legacy",
                        originalData: {},
                    },
                    {
                        migratedEdge: {
                            id: "legacy-edge-2",
                            source: "node-2",
                            target: "node-3",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                delay: "10s",
                                parameter: "result",
                                useOrthogonalRouting: true,
                                routingMetrics: {
                                    pathLength: 200,
                                    efficiency: 0.9,
                                },
                                selectedHandles: { source: {}, target: {} },
                            },
                        },
                        migrationApplied: true,
                        migrationStrategy: "full-legacy",
                        originalData: {},
                    },
                ],
                totalEdges: 2,
                migratedCount: 2,
                skippedCount: 0,
                errorCount: 0,
                processingTimeMs: 10,
            });

            const legacyProject = {
                projectName: "Legacy Project",
                nodes: sampleNodes,
                edges: [
                    {
                        id: "legacy-edge-1",
                        source: "node-1",
                        target: "node-2",
                        conditions: [],
                        data: {
                            condition: "isReady",
                            edgeType: "straight",
                        },
                    },
                    {
                        id: "legacy-edge-2",
                        source: "node-2",
                        target: "node-3",
                        conditions: [],
                        data: {
                            delay: "10s",
                            parameter: "result",
                        },
                    },
                ] as BaseEdge[],
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T01:00:00Z",
                    projectName: "Legacy Project",
                },
            };

            const result = await serializationService.deserializeModel(
                legacyProject
            );

            expect(result.migrationReport).toBeDefined();
            expect(result.migrationReport!.migratedCount).toBe(2);
            expect(result.migrationReport!.totalEdges).toBe(2);
            expect(result.migrationReport!.errorCount).toBe(0);

            result.edges.forEach((edge) => {
                expect(edge.data.useOrthogonalRouting).toBe(true);
                expect(edge.data.routingMetrics).toBeDefined();
                expect(edge.data.selectedHandles).toBeDefined();
                expect(edge.sourceHandle).toBeDefined();
                expect(edge.targetHandle).toBeDefined();
            });

            const edge1 = result.edges.find((e) => e.id === "legacy-edge-1")!;
            expect(edge1.data.condition).toBe("isReady");
            expect(edge1.data.edgeType).toBe("straight");

            const edge2 = result.edges.find((e) => e.id === "legacy-edge-2")!;
            expect(edge2.data.delay).toBe("10s");
            expect(edge2.data.parameter).toBe("result");
        });

        it("should handle mixed legacy and modern edges", async () => {
            mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
                results: [
                    {
                        migratedEdge: {
                            id: "legacy-edge",
                            source: "node-1",
                            target: "node-2",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                useOrthogonalRouting: true,
                                routingMetrics: {
                                    pathLength: 200,
                                    efficiency: 0.9,
                                },
                                selectedHandles: { source: {}, target: {} },
                            },
                        },
                        migrationApplied: true,
                        migrationStrategy: "full-legacy",
                        originalData: {},
                    },
                    {
                        migratedEdge: {
                            id: "modern-edge",
                            source: "node-2",
                            target: "node-3",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                useOrthogonalRouting: true,
                                routingType: "horizontal-first",
                                routingMetrics: {
                                    pathLength: 200,
                                    segmentCount: 2,
                                    routingType: "horizontal-first",
                                    efficiency: 0.95,
                                    handleCombination:
                                        "node-2:right -> node-3:left",
                                },
                                selectedHandles: {
                                    source: {
                                        id: "source-right",
                                        nodeId: "node-2",
                                        position: { x: 350, y: 100 },
                                        side: "right",
                                        type: "source",
                                    },
                                    target: {
                                        id: "target-left",
                                        nodeId: "node-3",
                                        position: { x: 500, y: 100 },
                                        side: "left",
                                        type: "target",
                                    },
                                },
                            },
                        },
                        migrationApplied: false,
                        migrationStrategy: "none",
                        originalData: {},
                    },
                ],
                totalEdges: 2,
                migratedCount: 1,
                skippedCount: 1,
                errorCount: 0,
                processingTimeMs: 10,
            });

            const mixedProject = {
                projectName: "Mixed Project",
                nodes: sampleNodes,
                edges: [
                    {
                        id: "legacy-edge",
                        source: "node-1",
                        target: "node-2",
                        conditions: [],
                        data: {
                            condition: "legacy",
                        },
                    },

                    {
                        id: "modern-edge",
                        source: "node-2",
                        target: "node-3",
                        sourceHandle: "source-right",
                        targetHandle: "target-left",
                        conditions: [],
                        data: {
                            useOrthogonalRouting: true,
                            routingType: "horizontal-first",
                            routingMetrics: {
                                pathLength: 200,
                                segmentCount: 2,
                                routingType: "horizontal-first",
                                efficiency: 0.95,
                                handleCombination:
                                    "node-2:right -> node-3:left",
                            },
                            selectedHandles: {
                                source: {
                                    id: "source-right",
                                    nodeId: "node-2",
                                    position: { x: 350, y: 100 },
                                    side: "right",
                                    type: "source",
                                },
                                target: {
                                    id: "target-left",
                                    nodeId: "node-3",
                                    position: { x: 500, y: 100 },
                                    side: "left",
                                    type: "target",
                                },
                            },
                        },
                    },
                ] as BaseEdge[],
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T01:00:00Z",
                    projectName: "Mixed Project",
                },
            };

            const result = await serializationService.deserializeModel(
                mixedProject
            );

            expect(result.migrationReport).toBeDefined();
            expect(result.migrationReport!.migratedCount).toBe(1);
            expect(result.migrationReport!.skippedCount).toBe(1);
            expect(result.migrationReport!.totalEdges).toBe(2);

            const legacyEdge = result.edges.find(
                (e) => e.id === "legacy-edge"
            )!;
            expect(legacyEdge.data.useOrthogonalRouting).toBe(true);

            const modernEdge = result.edges.find(
                (e) => e.id === "modern-edge"
            )!;
            expect(modernEdge.sourceHandle).toBe("source-right");
            expect(modernEdge.targetHandle).toBe("target-left");
            expect(modernEdge.data.routingMetrics.efficiency).toBe(0.95);
        });

        it("should preserve user customizations during migration", async () => {
            mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
                results: [
                    {
                        migratedEdge: {
                            id: "customized-edge",
                            source: "node-1",
                            target: "node-2",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            style: {
                                stroke: "#ff6b6b",
                                strokeWidth: 3,
                                strokeDasharray: "5,5",
                            },
                            animated: true,
                            label: "Custom Edge Label",
                            data: {
                                edgeType: "bezier",
                                condition: "custom condition",
                                controlPoints: [
                                    { x: 200, y: 80 },
                                    { x: 250, y: 120 },
                                ],
                                useOrthogonalRouting: true,
                                routingMetrics: {
                                    pathLength: 200,
                                    efficiency: 0.9,
                                },
                                selectedHandles: { source: {}, target: {} },
                            },
                        },
                        migrationApplied: true,
                        migrationStrategy: "user-customization-preserved",
                        originalData: {},
                    },
                ],
                totalEdges: 1,
                migratedCount: 1,
                skippedCount: 0,
                errorCount: 0,
                processingTimeMs: 10,
            });

            const customizedProject = {
                projectName: "Customized Project",
                nodes: sampleNodes,
                edges: [
                    {
                        id: "customized-edge",
                        source: "node-1",
                        target: "node-2",
                        conditions: [],
                        style: {
                            stroke: "#ff6b6b",
                            strokeWidth: 3,
                            strokeDasharray: "5,5",
                        },
                        animated: true,
                        label: "Custom Edge Label",
                        data: {
                            edgeType: "bezier",
                            condition: "custom condition",
                            controlPoints: [
                                { x: 200, y: 80 },
                                { x: 250, y: 120 },
                            ],
                        },
                    },
                ] as BaseEdge[],
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T01:00:00Z",
                    projectName: "Customized Project",
                },
            };

            const result = await serializationService.deserializeModel(
                customizedProject
            );

            const migratedEdge = result.edges[0];

            expect(migratedEdge.data.useOrthogonalRouting).toBe(true);
            expect(migratedEdge.data.routingMetrics).toBeDefined();

            expect(migratedEdge.style).toEqual({
                stroke: "#ff6b6b",
                strokeWidth: 3,
                strokeDasharray: "5,5",
            });
            expect(migratedEdge.animated).toBe(true);
            expect(migratedEdge.label).toBe("Custom Edge Label");
            expect(migratedEdge.data.edgeType).toBe("bezier");
            expect(migratedEdge.data.condition).toBe("custom condition");
            expect(migratedEdge.data.controlPoints).toEqual([
                { x: 200, y: 80 },
                { x: 250, y: 120 },
            ]);
        });
    });

    describe("Project serialization with migrated edges", () => {
        it("should serialize migrated edges correctly", async () => {
            mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
                results: [
                    {
                        migratedEdge: {
                            id: "legacy-edge",
                            source: "node-1",
                            target: "node-2",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                condition: "test condition",
                                useOrthogonalRouting: true,
                                routingMetrics: {
                                    pathLength: 200,
                                    efficiency: 0.9,
                                },
                                selectedHandles: { source: {}, target: {} },
                            },
                        },
                        migrationApplied: true,
                        migrationStrategy: "full-legacy",
                        originalData: {},
                    },
                ],
                totalEdges: 1,
                migratedCount: 1,
                skippedCount: 0,
                errorCount: 0,
                processingTimeMs: 10,
            });

            const legacyProject = {
                projectName: "Test Project",
                nodes: sampleNodes,
                edges: [
                    {
                        id: "legacy-edge",
                        source: "node-1",
                        target: "node-2",
                        conditions: [],
                        data: {
                            condition: "test condition",
                        },
                    },
                ] as BaseEdge[],
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T01:00:00Z",
                    projectName: "Test Project",
                },
            };

            const migrated = await serializationService.deserializeModel(
                legacyProject
            );

            const serialized = serializationService.serializeModel(
                migrated.nodes,
                migrated.edges,
                migrated.projectName,
                migrated.metadata
            );

            expect(serialized.edges).toHaveLength(1);
            const serializedEdge = serialized.edges[0];

            expect(serializedEdge.data.useOrthogonalRouting).toBe(true);
            expect(serializedEdge.data.routingMetrics).toBeDefined();
            expect(serializedEdge.data.selectedHandles).toBeDefined();
            expect(serializedEdge.sourceHandle).toBeDefined();
            expect(serializedEdge.targetHandle).toBeDefined();

            expect(serializedEdge.data.condition).toBe("test condition");
        });

        it("should handle round-trip serialization/deserialization", async () => {
            mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
                results: [
                    {
                        migratedEdge: {
                            id: "test-edge",
                            source: "node-1",
                            target: "node-3",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                edgeType: "rounded",
                                condition: "round trip test",
                                useOrthogonalRouting: true,
                                routingMetrics: {
                                    pathLength: 200,
                                    efficiency: 0.9,
                                },
                                selectedHandles: { source: {}, target: {} },
                            },
                        },
                        migrationApplied: true,
                        migrationStrategy: "full-legacy",
                        originalData: {},
                    },
                ],
                totalEdges: 1,
                migratedCount: 1,
                skippedCount: 0,
                errorCount: 0,
                processingTimeMs: 10,
            });

            const originalProject = {
                projectName: "Round Trip Test",
                nodes: sampleNodes,
                edges: [
                    {
                        id: "test-edge",
                        source: "node-1",
                        target: "node-3",
                        conditions: [],
                        data: {
                            edgeType: "rounded",
                            condition: "round trip test",
                        },
                    },
                ] as BaseEdge[],
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T01:00:00Z",
                    projectName: "Round Trip Test",
                },
            };

            const firstResult = await serializationService.deserializeModel(
                originalProject
            );
            expect(firstResult.migrationReport!.migratedCount).toBe(1);

            const serialized = serializationService.serializeModel(
                firstResult.nodes,
                firstResult.edges,
                firstResult.projectName,
                firstResult.metadata
            );

            const jsonString = serializationService.exportToJSON(serialized);
            const parsed = serializationService.importFromJSON(jsonString);

            mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
                results: [
                    {
                        migratedEdge: {
                            id: "test-edge",
                            source: "node-1",
                            target: "node-3",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                edgeType: "rounded",
                                condition: "round trip test",
                                useOrthogonalRouting: true,
                                routingMetrics: {
                                    pathLength: 200,
                                    efficiency: 0.9,
                                },
                                selectedHandles: { source: {}, target: {} },
                            },
                        },
                        migrationApplied: false,
                        migrationStrategy: "none",
                        originalData: {},
                    },
                ],
                totalEdges: 1,
                migratedCount: 0,
                skippedCount: 1,
                errorCount: 0,
                processingTimeMs: 5,
            });

            const secondResult = await serializationService.deserializeModel(
                parsed
            );
            expect(secondResult.migrationReport).toBeUndefined();

            const finalEdge = secondResult.edges[0];
            expect(finalEdge.data.useOrthogonalRouting).toBe(true);
            expect(finalEdge.data.condition).toBe("round trip test");
            expect(finalEdge.data.edgeType).toBe("rounded");
        });
    });

    describe("Error handling in integration scenarios", () => {
        it("should handle migration errors gracefully during deserialization", async () => {
            mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
                results: [
                    {
                        migratedEdge: {
                            id: "problematic-edge",
                            source: "non-existent-node",
                            target: "node-2",
                            conditions: [],
                            data: {},
                        },
                        migrationApplied: false,
                        migrationStrategy: "none",
                        originalData: {},
                        errors: ["Cannot find nodes for edge problematic-edge"],
                    },
                    {
                        migratedEdge: {
                            id: "good-edge",
                            source: "node-1",
                            target: "node-2",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                useOrthogonalRouting: true,
                                routingMetrics: {
                                    pathLength: 200,
                                    efficiency: 0.9,
                                },
                                selectedHandles: { source: {}, target: {} },
                            },
                        },
                        migrationApplied: true,
                        migrationStrategy: "full-legacy",
                        originalData: {},
                    },
                ],
                totalEdges: 2,
                migratedCount: 1,
                skippedCount: 0,
                errorCount: 1,
                processingTimeMs: 10,
            });

            const problematicProject = {
                projectName: "Problematic Project",
                nodes: sampleNodes,
                edges: [
                    {
                        id: "problematic-edge",
                        source: "non-existent-node",
                        target: "node-2",
                        conditions: [],
                        data: {},
                    },
                    {
                        id: "good-edge",
                        source: "node-1",
                        target: "node-2",
                        conditions: [],
                        data: {},
                    },
                ] as BaseEdge[],
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T01:00:00Z",
                    projectName: "Problematic Project",
                },
            };

            const result = await serializationService.deserializeModel(
                problematicProject
            );

            expect(result.migrationReport).toBeDefined();
            expect(result.migrationReport!.errorCount).toBe(1);
            expect(result.migrationReport!.migratedCount).toBe(1);
            expect(result.migrationReport!.totalEdges).toBe(2);

            const problematicEdge = result.edges.find(
                (e) => e.id === "problematic-edge"
            )!;
            expect(problematicEdge.data.useOrthogonalRouting).toBeUndefined();

            const goodEdge = result.edges.find((e) => e.id === "good-edge")!;
            expect(goodEdge.data.useOrthogonalRouting).toBe(true);
        });

        it("should handle invalid project structure", async () => {
            const invalidProject = {
                projectName: "Invalid Project",
                nodes: null,
                edges: [
                    {
                        id: "edge-1",
                        source: "node-1",
                        target: "node-2",
                        conditions: [],
                        data: {},
                    },
                ],
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T01:00:00Z",
                    projectName: "Invalid Project",
                },
            };

            await expect(
                serializationService.deserializeModel(invalidProject as any)
            ).rejects.toThrow("Invalid model: missing or invalid nodes array");
        });
    });

    describe("Migration reporting", () => {
        it("should provide detailed migration statistics", async () => {
            const mockResults = Array.from({ length: 10 }, (_, i) => ({
                migratedEdge: {
                    id: `edge-${i}`,
                    source: i % 2 === 0 ? "node-1" : "node-2",
                    target: i % 2 === 0 ? "node-2" : "node-3",
                    conditions: [],
                    sourceHandle: "source-right",
                    targetHandle: "target-left",
                    data: {
                        useOrthogonalRouting: true,
                        routingMetrics: { pathLength: 200, efficiency: 0.9 },
                        selectedHandles: { source: {}, target: {} },
                    },
                },
                migrationApplied: i < 5,
                migrationStrategy:
                    i < 5 ? ("full-legacy" as const) : ("none" as const),
                originalData: {},
            }));

            mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
                results: mockResults,
                totalEdges: 10,
                migratedCount: 5,
                skippedCount: 5,
                errorCount: 0,
                processingTimeMs: 50,
            });

            const projectWithManyEdges = {
                projectName: "Large Project",
                nodes: sampleNodes,
                edges: Array.from({ length: 10 }, (_, i) => ({
                    id: `edge-${i}`,
                    source: i % 2 === 0 ? "node-1" : "node-2",
                    target: i % 2 === 0 ? "node-2" : "node-3",
                    conditions: [],
                    data: i < 5 ? {} : { useOrthogonalRouting: true },
                })) as BaseEdge[],
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T01:00:00Z",
                    projectName: "Large Project",
                },
            };

            const result = await serializationService.deserializeModel(
                projectWithManyEdges
            );

            expect(result.migrationReport).toBeDefined();
            expect(result.migrationReport!.totalEdges).toBe(10);
            expect(result.migrationReport!.processingTimeMs).toBeGreaterThan(0);

            expect(result.migrationReport!.results).toHaveLength(10);
            result.migrationReport!.results.forEach((migrationResult) => {
                expect(migrationResult.migrationStrategy).toBeDefined();
                expect(migrationResult.originalData).toBeDefined();
            });
        });

        it("should not include migration report when no migrations are needed", async () => {
            mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
                results: [
                    {
                        migratedEdge: {
                            id: "modern-edge",
                            source: "node-1",
                            target: "node-2",
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            conditions: [],
                            data: {
                                useOrthogonalRouting: true,
                                routingType: "horizontal-first",
                                routingMetrics: {
                                    pathLength: 200,
                                    segmentCount: 2,
                                    routingType: "horizontal-first",
                                    efficiency: 0.95,
                                    handleCombination:
                                        "node-1:right -> node-2:left",
                                },
                                selectedHandles: {
                                    source: {
                                        id: "source-right",
                                        nodeId: "node-1",
                                        position: { x: 150, y: 100 },
                                        side: "right",
                                        type: "source",
                                    },
                                    target: {
                                        id: "target-left",
                                        nodeId: "node-2",
                                        position: { x: 300, y: 100 },
                                        side: "left",
                                        type: "target",
                                    },
                                },
                            },
                        },
                        migrationApplied: false,
                        migrationStrategy: "none",
                        originalData: {},
                    },
                ],
                totalEdges: 1,
                migratedCount: 0,
                skippedCount: 1,
                errorCount: 0,
                processingTimeMs: 5,
            });

            const modernProject = {
                projectName: "Modern Project",
                nodes: sampleNodes,
                edges: [
                    {
                        id: "modern-edge",
                        source: "node-1",
                        target: "node-2",
                        sourceHandle: "source-right",
                        targetHandle: "target-left",
                        conditions: [],
                        data: {
                            useOrthogonalRouting: true,
                            routingType: "horizontal-first",
                            routingMetrics: {
                                pathLength: 200,
                                segmentCount: 2,
                                routingType: "horizontal-first",
                                efficiency: 0.95,
                                handleCombination:
                                    "node-1:right -> node-2:left",
                            },
                            selectedHandles: {
                                source: {
                                    id: "source-right",
                                    nodeId: "node-1",
                                    position: { x: 150, y: 100 },
                                    side: "right",
                                    type: "source",
                                },
                                target: {
                                    id: "target-left",
                                    nodeId: "node-2",
                                    position: { x: 300, y: 100 },
                                    side: "left",
                                    type: "target",
                                },
                            },
                        },
                    },
                ] as BaseEdge[],
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T01:00:00Z",
                    projectName: "Modern Project",
                },
            };

            const result = await serializationService.deserializeModel(
                modernProject
            );

            expect(result.migrationReport).toBeUndefined();
            expect(result.edges).toHaveLength(1);
            expect(result.edges[0].data.useOrthogonalRouting).toBe(true);
        });
    });
});
