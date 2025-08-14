/**
 * Comprehensive tests for EdgeMigrationService
 *
 * Tests cover all migration scenarios, error handling, and edge cases
 */

import {
    EdgeMigrationService,
    EdgeMigrationOptions,
} from "../EdgeMigrationService";
import { BaseEdge } from "../../types/base";
import { OrthogonalRoutingEngine } from "../../lib/routing/OrthogonalRoutingEngine";
import { HandleSelectionService } from "../../lib/routing/HandleSelectionService";

jest.mock("../../lib/routing/OrthogonalRoutingEngine");
jest.mock("../../lib/routing/HandleSelectionService");

describe("EdgeMigrationService", () => {
    let migrationService: EdgeMigrationService;
    let mockRoutingEngine: jest.Mocked<OrthogonalRoutingEngine>;
    let mockHandleSelectionService: jest.Mocked<HandleSelectionService>;

    const mockNodes = [
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

    const mockOrthogonalPath = {
        segments: [],
        totalLength: 250,
        routingType: "horizontal-first" as const,
        efficiency: 0.92,
        controlPoints: [
            { x: 100, y: 25, type: "corner" as const },
            { x: 150, y: 125, type: "corner" as const },
        ],
    };

    const mockHandleCombination = {
        sourceHandle: {
            id: "source-right",
            nodeId: "node-1",
            position: { x: 50, y: 25 },
            side: "right" as const,
            type: "source" as const,
        },
        targetHandle: {
            id: "target-left",
            nodeId: "node-2",
            position: { x: 200, y: 125 },
            side: "left" as const,
            type: "target" as const,
        },
        manhattanDistance: 200,
        pathLength: 250,
        efficiency: 0.92,
        routingType: "horizontal-first" as const,
    };

    const mockRoutingMetrics = {
        pathLength: 250,
        segmentCount: 2,
        routingType: "horizontal-first" as const,
        efficiency: 0.92,
        handleCombination: "node-1:right -> node-2:left",
    };

    beforeEach(() => {
        mockRoutingEngine =
            OrthogonalRoutingEngine.prototype as jest.Mocked<OrthogonalRoutingEngine>;
        mockHandleSelectionService =
            HandleSelectionService.prototype as jest.Mocked<HandleSelectionService>;

        mockRoutingEngine.calculateOrthogonalPath.mockReturnValue(
            mockOrthogonalPath
        );
        mockRoutingEngine.calculateRoutingMetrics.mockReturnValue(
            mockRoutingMetrics
        );
        mockRoutingEngine.generateControlPoints.mockReturnValue(
            mockOrthogonalPath.controlPoints
        );
        mockHandleSelectionService.findOptimalHandles.mockReturnValue(
            mockHandleCombination
        );

        migrationService = new EdgeMigrationService(
            mockRoutingEngine as any,
            mockHandleSelectionService as any
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("Migration strategy assessment", () => {
        it("should identify edges that need no migration", async () => {
            const modernEdge: BaseEdge = {
                id: "modern-edge",
                source: "node-1",
                target: "node-2",
                conditions: [],
                sourceHandle: "source-right",
                targetHandle: "target-left",
                data: {
                    useOrthogonalRouting: true,
                    edgeRoutingType: "orthogonal",
                    routingType: "horizontal-first",
                    routingMetrics: mockRoutingMetrics,
                    selectedHandles: {
                        source: mockHandleCombination.sourceHandle,
                        target: mockHandleCombination.targetHandle,
                    },
                },
            };

            const result = await migrationService.migrateEdge(
                modernEdge,
                mockNodes
            );

            expect(result.migrationApplied).toBe(false);
            expect(result.migrationStrategy).toBe("none");
            expect(result.migratedEdge).toBe(modernEdge);
        });

        it("should identify legacy edges that need full migration", async () => {
            const legacyEdge: BaseEdge = {
                id: "legacy-edge",
                source: "node-1",
                target: "node-2",
                conditions: [],
                data: {
                    condition: "customCondition",
                    edgeType: "straight",
                },
            };

            const result = await migrationService.migrateEdge(
                legacyEdge,
                mockNodes
            );

            expect(result.migrationApplied).toBe(true);
            expect(result.migrationStrategy).toBe("full-legacy");
            expect(result.migratedEdge.data.useOrthogonalRouting).toBe(true);
            expect(result.migratedEdge.sourceHandle).toBe("source-right");
            expect(result.migratedEdge.targetHandle).toBe("target-left");
        });

        it("should identify edges with partial routing that need completion", async () => {
            const partialEdge: BaseEdge = {
                id: "partial-edge",
                source: "node-1",
                target: "node-2",
                conditions: [],
                data: {
                    useOrthogonalRouting: true,
                    routingType: "vertical-first",
                },
            };

            const result = await migrationService.migrateEdge(
                partialEdge,
                mockNodes
            );

            expect(result.migrationApplied).toBe(true);
            expect(result.migrationStrategy).toBe("partial-routing");
            expect(result.migratedEdge.data.routingMetrics).toBeDefined();
            expect(result.migratedEdge.data.selectedHandles).toBeDefined();
        });

        it("should preserve user customizations during migration", async () => {
            const customizedEdge: BaseEdge = {
                id: "customized-edge",
                source: "node-1",
                target: "node-2",
                conditions: [],
                style: { stroke: "red", strokeWidth: 3 },
                animated: true,
                label: "Custom Label",
                data: {
                    edgeType: "bezier",
                    controlPoints: [{ x: 125, y: 75 }],
                },
            };

            const result = await migrationService.migrateEdge(
                customizedEdge,
                mockNodes,
                {
                    preserveUserCustomizations: true,
                    validateResults: false,
                    enableRollback: false,
                }
            );

            expect(result.migrationApplied).toBe(true);
            expect(result.migrationStrategy).toBe(
                "user-customization-preserved"
            );
            expect(result.migratedEdge.style).toEqual({
                stroke: "red",
                strokeWidth: 3,
            });
            expect(result.migratedEdge.animated).toBe(true);
            expect(result.migratedEdge.label).toBe("Custom Label");
            expect(result.migratedEdge.data.edgeType).toBe("bezier");
        });
    });

    describe("Batch migration", () => {
        it("should migrate multiple edges correctly", async () => {
            const edges: BaseEdge[] = [
                {
                    id: "edge-1",
                    source: "node-1",
                    target: "node-2",
                    conditions: [],
                    data: {},
                },
                {
                    id: "edge-2",
                    source: "node-2",
                    target: "node-1",
                    conditions: [],
                    data: { useOrthogonalRouting: true },
                },
            ];

            const result = await migrationService.migrateEdgesBatch(
                edges,
                mockNodes
            );

            expect(result.totalEdges).toBe(2);
            expect(result.migratedCount).toBe(2);
            expect(result.skippedCount).toBe(0);
            expect(result.errorCount).toBe(0);
            expect(result.results).toHaveLength(2);
        });

        it("should handle progress callbacks during batch migration", async () => {
            const progressCallback = jest.fn();
            const edges: BaseEdge[] = [
                {
                    id: "edge-1",
                    source: "node-1",
                    target: "node-2",
                    conditions: [],
                    data: {},
                },
                {
                    id: "edge-2",
                    source: "node-2",
                    target: "node-1",
                    conditions: [],
                    data: {},
                },
            ];

            await migrationService.migrateEdgesBatch(edges, mockNodes, {
                preserveUserCustomizations: true,
                validateResults: false,
                enableRollback: false,
                progressCallback,
            });

            expect(progressCallback).toHaveBeenCalledTimes(2);
            expect(progressCallback).toHaveBeenCalledWith(1, 2, edges[0]);
            expect(progressCallback).toHaveBeenCalledWith(2, 2, edges[1]);
        });

        it("should track processing time", async () => {
            const edges: BaseEdge[] = [
                {
                    id: "edge-1",
                    source: "node-1",
                    target: "node-2",
                    conditions: [],
                    data: {},
                },
            ];

            const result = await migrationService.migrateEdgesBatch(
                edges,
                mockNodes
            );

            expect(result.processingTimeMs).toBeGreaterThan(0);
        });
    });

    describe("Error handling", () => {
        it("should handle missing nodes gracefully", async () => {
            const edge: BaseEdge = {
                id: "orphan-edge",
                source: "missing-node",
                target: "node-2",
                conditions: [],
                data: {},
            };

            const result = await migrationService.migrateEdge(edge, mockNodes);

            expect(result.migrationApplied).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors![0]).toContain("Cannot find nodes");
        });

        it("should retry failed migrations when configured", async () => {
            const edge: BaseEdge = {
                id: "problematic-edge",
                source: "node-1",
                target: "node-2",
                conditions: [],
                data: {},
            };

            let callCount = 0;
            mockRoutingEngine.calculateRoutingMetrics.mockImplementation(() => {
                callCount++;
                if (callCount <= 2) {
                    throw new Error("Routing calculation failed");
                }
                return mockRoutingMetrics;
            });

            const result = await migrationService.migrateEdge(edge, mockNodes, {
                preserveUserCustomizations: false,
                validateResults: true,
                enableRollback: false,
                maxRetries: 3,
                continueOnError: true,
            });

            expect(result.migrationApplied).toBe(true);
            expect(
                mockRoutingEngine.calculateRoutingMetrics
            ).toHaveBeenCalledTimes(3);
        });

        it("should timeout long-running migrations", async () => {
            const edge: BaseEdge = {
                id: "slow-edge",
                source: "node-1",
                target: "node-2",
                conditions: [],
                data: {},
            };

            mockRoutingEngine.calculateOrthogonalPath.mockImplementation(() => {
                const start = Date.now();
                while (Date.now() - start < 1000) {}
                throw new Error("Simulated slow operation timeout");
            });

            const result = await migrationService.migrateEdge(edge, mockNodes, {
                preserveUserCustomizations: false,
                validateResults: false,
                enableRollback: false,
                timeout: 100,
            });

            expect(result.migrationApplied).toBe(false);
            expect(result.errors![0]).toContain(
                "Simulated slow operation timeout"
            );
        });
    });

    describe("Validation", () => {
        it("should validate migrated edges when requested", async () => {
            const edge: BaseEdge = {
                id: "edge-to-validate",
                source: "node-1",
                target: "node-2",
                conditions: [],
                data: {},
            };

            const result = await migrationService.migrateEdge(edge, mockNodes, {
                preserveUserCustomizations: false,
                validateResults: true,
                enableRollback: false,
            });

            expect(result.migrationApplied).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it("should catch validation errors", async () => {
            const edge: BaseEdge = {
                id: "invalid-edge",
                source: "node-1",
                target: "node-2",
                conditions: [],
                data: {},
            };

            mockRoutingEngine.calculateRoutingMetrics.mockReturnValue(
                null as any
            );

            const result = await migrationService.migrateEdge(edge, mockNodes, {
                preserveUserCustomizations: false,
                validateResults: true,
                enableRollback: false,
                maxRetries: 1,
            });

            expect(result.migrationApplied).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });

    describe("Rollback functionality", () => {
        it("should store rollback data when enabled", async () => {
            const edge: BaseEdge = {
                id: "rollback-edge",
                source: "node-1",
                target: "node-2",
                conditions: [],
                data: { originalProperty: "value" },
            };

            await migrationService.migrateEdge(edge, mockNodes, {
                preserveUserCustomizations: false,
                validateResults: false,
                enableRollback: true,
            });

            const stats = migrationService.getRollbackStats();
            expect(stats.count).toBe(1);
            expect(stats.edgeIds).toContain("rollback-edge");
        });

        it("should rollback a migrated edge", async () => {
            const originalEdge: BaseEdge = {
                id: "rollback-edge",
                source: "node-1",
                target: "node-2",
                conditions: [],
                data: { originalProperty: "value" },
            };

            const result = await migrationService.migrateEdge(
                originalEdge,
                mockNodes,
                {
                    preserveUserCustomizations: false,
                    validateResults: false,
                    enableRollback: true,
                }
            );

            expect(result.migratedEdge.data.useOrthogonalRouting).toBe(true);

            const rolledBack = migrationService.rollbackEdge(
                result.originalData
            );
            expect(rolledBack.data.originalProperty).toBe("value");
            expect(rolledBack.data.useOrthogonalRouting).toBeUndefined();
        });

        it("should rollback multiple edges", async () => {
            const edges: BaseEdge[] = [
                {
                    id: "edge-1",
                    source: "node-1",
                    target: "node-2",
                    conditions: [],
                    data: {},
                },
                {
                    id: "edge-2",
                    source: "node-2",
                    target: "node-1",
                    conditions: [],
                    data: {},
                },
            ];

            await migrationService.migrateEdgesBatch(edges, mockNodes, {
                preserveUserCustomizations: false,
                validateResults: false,
                enableRollback: true,
            });

            const rolledBack = migrationService.rollbackBatch([
                "edge-1",
                "edge-2",
            ]);
            expect(rolledBack).toHaveLength(2);

            const stats = migrationService.getRollbackStats();
            expect(stats.count).toBe(0);
        });
    });

    describe("Migration reporting", () => {
        it("should generate comprehensive migration report", async () => {
            const edges: BaseEdge[] = [
                {
                    id: "success-edge",
                    source: "node-1",
                    target: "node-2",
                    conditions: [],
                    data: {},
                },
                {
                    id: "skip-edge",
                    source: "node-1",
                    target: "node-2",
                    conditions: [],
                    data: {
                        useOrthogonalRouting: true,
                        edgeRoutingType: "orthogonal",
                        routingMetrics: mockRoutingMetrics,
                        selectedHandles: {
                            source: mockHandleCombination.sourceHandle,
                            target: mockHandleCombination.targetHandle,
                        },
                    },
                },
                {
                    id: "error-edge",
                    source: "missing-node",
                    target: "node-2",
                    conditions: [],
                    data: {},
                },
            ];

            const batch = await migrationService.migrateEdgesBatch(
                edges,
                mockNodes
            );
            const report = migrationService.generateMigrationReport(batch);

            expect(report).toContain("Total Edges: 3");
            expect(report).toContain("Migrated: 1");
            expect(report).toContain("Skipped: 1");
            expect(report).toContain("Errors: 1");
            expect(report).toContain("Processing Time:");
        });
    });

    describe("Edge cases", () => {
        it("should handle edges with empty data", async () => {
            const edge: BaseEdge = {
                id: "empty-data-edge",
                source: "node-1",
                target: "node-2",
                conditions: [],
                data: undefined as any,
            };

            const result = await migrationService.migrateEdge(edge, mockNodes);

            expect(result.migrationApplied).toBe(true);
            expect(result.migratedEdge.data).toBeDefined();
            expect(result.migratedEdge.data.useOrthogonalRouting).toBe(true);
        });

        it("should handle edges with null conditions", async () => {
            const edge: BaseEdge = {
                id: "null-conditions-edge",
                source: "node-1",
                target: "node-2",
                conditions: null as any,
                data: {},
            };

            const result = await migrationService.migrateEdge(edge, mockNodes);

            expect(result.migrationApplied).toBe(true);
            expect(result.migratedEdge.conditions).toBeDefined();
        });

        it("should handle concurrent migrations safely", async () => {
            const edges = Array.from({ length: 10 }, (_, i) => ({
                id: `concurrent-edge-${i}`,
                source: "node-1",
                target: "node-2",
                conditions: [],
                data: {},
            }));

            const promises = edges.map((edge) =>
                migrationService.migrateEdge(edge, mockNodes, {
                    preserveUserCustomizations: false,
                    validateResults: false,
                    enableRollback: true,
                })
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(10);
            results.forEach((result) => {
                expect(result.migrationApplied).toBe(true);
            });

            const stats = migrationService.getRollbackStats();
            expect(stats.count).toBe(10);
        });
    });
});
