/**
 * Tests using realistic legacy project data to validate migration system
 *
 * These tests use actual project structures that might exist in legacy O2DES Studio projects
 */

import { SerializationService } from "../SerializationService";
import { EdgeMigrationService } from "../EdgeMigrationService";

jest.mock("../AutosaveService", () => ({
    getInstance: () => ({
        autosave: jest.fn(),
    }),
}));

jest.mock("../../lib/routing/OrthogonalRoutingEngine");
jest.mock("../../lib/routing/HandleSelectionService");

describe("Legacy Project Migration", () => {
    let serializationService: SerializationService;
    let mockEdgeMigrationService: jest.Mocked<EdgeMigrationService>;

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

    describe("Activity-Based Model Migration", () => {
        it("should migrate a complete activity-based model", async () => {
            mockEdgeMigrationService.migrateEdgesBatch.mockResolvedValue({
                results: [
                    {
                        migratedEdge: {
                            id: "flow-1",
                            source: "gen-1",
                            target: "act-1",
                            type: "flow",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
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
                            id: "flow-2",
                            source: "act-1",
                            target: "act-2",
                            type: "flow",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                condition: "quantity > 0",
                                edgeType: "bezier",
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
                    {
                        migratedEdge: {
                            id: "flow-3",
                            source: "act-2",
                            target: "term-1",
                            type: "flow",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                edgeType: "rounded",
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
                            id: "dependency-1",
                            source: "act-1",
                            target: "act-2",
                            type: "dependency",
                            conditions: [],
                            sourceHandle: "source-right",
                            targetHandle: "target-left",
                            data: {
                                isDependency: true,
                                delay: "2",
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
                totalEdges: 4,
                migratedCount: 4,
                skippedCount: 0,
                errorCount: 0,
                processingTimeMs: 20,
            });

            const activityBasedProject = {
                projectName: "Manufacturing Process Model",
                nodes: [
                    {
                        id: "gen-1",
                        type: "generator",
                        name: "Customer Arrivals",
                        position: { x: 50, y: 200 },
                        data: {
                            resources: [],
                            duration: "exponential(5)",
                            width: 120,
                            height: 60,
                        },
                    },
                    {
                        id: "act-1",
                        type: "activity",
                        name: "Order Processing",
                        position: { x: 250, y: 200 },
                        data: {
                            resources: ["Staff", "Computer"],
                            duration: "uniform(2,5)",
                            width: 140,
                            height: 80,
                        },
                    },
                    {
                        id: "act-2",
                        type: "activity",
                        name: "Manufacturing",
                        position: { x: 450, y: 200 },
                        data: {
                            resources: ["Machine", "Operator"],
                            duration: "normal(15,3)",
                            width: 140,
                            height: 80,
                        },
                    },
                    {
                        id: "term-1",
                        type: "terminator",
                        name: "Order Complete",
                        position: { x: 650, y: 200 },
                        data: {
                            width: 100,
                            height: 60,
                        },
                    },
                ],
                edges: [
                    {
                        id: "flow-1",
                        source: "gen-1",
                        target: "act-1",
                        type: "flow",
                        conditions: [],
                        data: {
                            edgeType: "straight",
                        },
                    },
                    {
                        id: "flow-2",
                        source: "act-1",
                        target: "act-2",
                        type: "flow",
                        conditions: [],
                        data: {
                            condition: "quantity > 0",
                            edgeType: "bezier",
                        },
                    },
                    {
                        id: "dependency-1",
                        source: "act-1",
                        target: "act-2",
                        type: "dependency",
                        conditions: [],
                        data: {
                            isDependency: true,
                            condition: "staffAvailable",
                            delay: "2",
                        },
                    },
                    {
                        id: "flow-3",
                        source: "act-2",
                        target: "term-1",
                        type: "flow",
                        conditions: [],
                        data: {
                            edgeType: "rounded",
                        },
                    },
                ],
                metadata: {
                    version: "0.9.0",
                    created: "2022-06-15T08:30:00Z",
                    modified: "2022-11-20T14:45:00Z",
                    projectName: "Manufacturing Process Model",
                    description:
                        "Complete manufacturing workflow with resource constraints",
                    author: "Process Engineer",
                    tags: ["manufacturing", "workflow", "resources"],
                },
            };

            const result = await serializationService.deserializeModel(
                activityBasedProject
            );

            expect(result.migrationReport).toBeDefined();
            expect(result.migrationReport!.migratedCount).toBe(4);
            expect(result.migrationReport!.totalEdges).toBe(4);
            expect(result.migrationReport!.errorCount).toBe(0);

            const flowEdge1 = result.edges.find((e) => e.id === "flow-1")!;
            expect(flowEdge1.data.useOrthogonalRouting).toBe(true);
            expect(flowEdge1.data.edgeType).toBe("straight");

            const flowEdge2 = result.edges.find((e) => e.id === "flow-2")!;
            expect(flowEdge2.data.condition).toBe("quantity > 0");
            expect(flowEdge2.data.edgeType).toBe("bezier");

            const depEdge = result.edges.find((e) => e.id === "dependency-1")!;
            expect(depEdge.data.isDependency).toBe(true);
            expect(depEdge.data.delay).toBe("2");
            expect(depEdge.data.useOrthogonalRouting).toBe(true);

            const flowEdge3 = result.edges.find((e) => e.id === "flow-3")!;
            expect(flowEdge3.data.edgeType).toBe("rounded");
        });
    });

    describe("Event-Based Model Migration", () => {
        it("should migrate a complete event-based model", async () => {
            const eventBasedProject = {
                projectName: "Hospital Patient Flow",
                nodes: [
                    {
                        id: "init-1",
                        type: "initialization",
                        name: "System Startup",
                        position: { x: 100, y: 100 },
                        data: {
                            initializations: [
                                "bedCount = 50",
                                "nurseCount = 12",
                                "doctorCount = 6",
                            ],
                            width: 150,
                            height: 100,
                        },
                    },
                    {
                        id: "event-1",
                        type: "event",
                        name: "Patient Arrival",
                        position: { x: 350, y: 100 },
                        data: {
                            stateUpdate: "patientQueue.add(patient)",
                            eventParameters: "patient: Patient",
                            width: 140,
                            height: 80,
                        },
                    },
                    {
                        id: "event-2",
                        type: "event",
                        name: "Bed Assignment",
                        position: { x: 350, y: 250 },
                        data: {
                            stateUpdate: "availableBeds--; assignBed(patient)",
                            eventParameters: "patient: Patient, bed: Bed",
                            width: 140,
                            height: 80,
                        },
                    },
                    {
                        id: "event-3",
                        type: "event",
                        name: "Treatment Complete",
                        position: { x: 600, y: 175 },
                        data: {
                            stateUpdate: "availableBeds++; releaseBed(bed)",
                            eventParameters: "patient: Patient, bed: Bed",
                            width: 140,
                            height: 80,
                        },
                    },
                ],
                edges: [
                    {
                        id: "init-edge-1",
                        source: "init-1",
                        target: "event-1",
                        type: "initialization_edge",
                        conditions: [],
                        data: {
                            initialDelay: "0",
                        },
                    },
                    {
                        id: "event-edge-1",
                        source: "event-1",
                        target: "event-2",
                        type: "event_graph_edge",
                        conditions: [],
                        data: {
                            condition: "availableBeds > 0",
                            delay: "uniform(5,15)",
                            parameter: "patient",
                        },
                    },
                    {
                        id: "event-edge-2",
                        source: "event-2",
                        target: "event-3",
                        type: "event_graph_edge",
                        conditions: [],
                        data: {
                            condition: "True",
                            delay: "exponential(120)",
                            parameter: "patient, bed",
                        },
                    },
                    {
                        id: "event-edge-3",
                        source: "event-3",
                        target: "event-1",
                        type: "event_graph_edge",
                        conditions: [],
                        data: {
                            condition: "hasMorePatients()",
                            delay: "exponential(30)",
                            parameter: "",
                        },
                    },
                ],
                metadata: {
                    version: "0.8.5",
                    created: "2021-03-10T10:15:00Z",
                    modified: "2021-09-22T16:30:00Z",
                    projectName: "Hospital Patient Flow",
                    description:
                        "Event-based simulation of hospital patient flow and bed management",
                    author: "Healthcare Analyst",
                    tags: ["healthcare", "events", "simulation"],
                },
            };

            const result = await serializationService.deserializeModel(
                eventBasedProject
            );

            expect(result.migrationReport).toBeDefined();
            expect(result.migrationReport!.migratedCount).toBe(4);
            expect(result.migrationReport!.errorCount).toBe(0);

            const initEdge = result.edges.find((e) => e.id === "init-edge-1")!;
            expect(initEdge.data.useOrthogonalRouting).toBe(true);
            expect(initEdge.data.initialDelay).toBe("0");
            expect(initEdge.type).toBe("initialization_edge");

            const eventEdge1 = result.edges.find(
                (e) => e.id === "event-edge-1"
            )!;
            expect(eventEdge1.data.condition).toBe("availableBeds > 0");
            expect(eventEdge1.data.delay).toBe("uniform(5,15)");
            expect(eventEdge1.data.parameter).toBe("patient");

            const eventEdge2 = result.edges.find(
                (e) => e.id === "event-edge-2"
            )!;
            expect(eventEdge2.data.delay).toBe("exponential(120)");

            const eventEdge3 = result.edges.find(
                (e) => e.id === "event-edge-3"
            )!;
            expect(eventEdge3.data.condition).toBe("hasMorePatients()");
        });
    });

    describe("Complex Mixed Model Migration", () => {
        it("should migrate a complex model with custom styling and labels", async () => {
            const complexProject = {
                projectName: "Supply Chain Network",
                nodes: [
                    {
                        id: "supplier-1",
                        type: "generator",
                        name: "Supplier A",
                        position: { x: 50, y: 100 },
                        data: { label: "Raw Materials" },
                    },
                    {
                        id: "warehouse-1",
                        type: "activity",
                        name: "Central Warehouse",
                        position: { x: 300, y: 100 },
                        data: {
                            resources: ["Forklift", "Staff"],
                            label: "Storage & Processing",
                        },
                    },
                    {
                        id: "retailer-1",
                        type: "activity",
                        name: "Retail Store",
                        position: { x: 550, y: 50 },
                        data: { label: "Customer Sales" },
                    },
                    {
                        id: "retailer-2",
                        type: "activity",
                        name: "Online Channel",
                        position: { x: 550, y: 150 },
                        data: { label: "E-commerce" },
                    },
                ],
                edges: [
                    {
                        id: "supply-edge",
                        source: "supplier-1",
                        target: "warehouse-1",
                        conditions: [],
                        style: {
                            stroke: "#2ecc71",
                            strokeWidth: 4,
                        },
                        label: "Raw Material Flow",
                        animated: true,
                        data: {
                            condition: "inventoryLevel < threshold",
                            edgeType: "straight",
                            priority: "high",
                        },
                    },
                    {
                        id: "distribution-edge-1",
                        source: "warehouse-1",
                        target: "retailer-1",
                        conditions: [],
                        style: {
                            stroke: "#3498db",
                            strokeWidth: 3,
                            strokeDasharray: "10,5",
                        },
                        label: "Store Distribution",
                        data: {
                            condition: "storeOrder.quantity > 0",
                            edgeType: "bezier",
                            priority: "medium",
                            controlPoints: [
                                { x: 425, y: 75 },
                                { x: 475, y: 65 },
                            ],
                        },
                    },
                    {
                        id: "distribution-edge-2",
                        source: "warehouse-1",
                        target: "retailer-2",
                        conditions: [],
                        style: {
                            stroke: "#e74c3c",
                            strokeWidth: 2,
                        },
                        label: "Online Orders",
                        data: {
                            condition: "onlineOrder.urgent == true",
                            edgeType: "rounded",
                            priority: "urgent",
                            controlPoints: [
                                { x: 425, y: 125 },
                                { x: 475, y: 140 },
                            ],
                        },
                    },
                    {
                        id: "feedback-edge",
                        source: "retailer-1",
                        target: "warehouse-1",
                        conditions: [],
                        style: {
                            stroke: "#9b59b6",
                            strokeWidth: 2,
                            strokeDasharray: "5,10",
                        },
                        label: "Restock Request",
                        data: {
                            condition: "stockLevel < reorderPoint",
                            edgeType: "curved",
                            isDependency: true,
                        },
                    },
                ],
                metadata: {
                    version: "0.7.2",
                    created: "2020-11-05T09:20:00Z",
                    modified: "2021-01-18T11:45:00Z",
                    projectName: "Supply Chain Network",
                    description:
                        "Complex supply chain with multiple distribution channels and feedback loops",
                    author: "Supply Chain Manager",
                    tags: ["supply-chain", "logistics", "distribution"],
                },
            };

            const result = await serializationService.deserializeModel(
                complexProject
            );

            expect(result.migrationReport).toBeDefined();
            expect(result.migrationReport!.migratedCount).toBe(4);
            expect(result.migrationReport!.errorCount).toBe(0);

            const supplyEdge = result.edges.find(
                (e) => e.id === "supply-edge"
            )!;
            expect(supplyEdge.style).toEqual({
                stroke: "#2ecc71",
                strokeWidth: 4,
            });
            expect(supplyEdge.label).toBe("Raw Material Flow");
            expect(supplyEdge.animated).toBe(true);
            expect(supplyEdge.data.useOrthogonalRouting).toBe(true);
            expect(supplyEdge.data.priority).toBe("high");

            const distEdge1 = result.edges.find(
                (e) => e.id === "distribution-edge-1"
            )!;
            expect(distEdge1.style).toEqual({
                stroke: "#3498db",
                strokeWidth: 3,
                strokeDasharray: "10,5",
            });
            expect(distEdge1.data.controlPoints).toEqual([
                { x: 425, y: 75 },
                { x: 475, y: 65 },
            ]);

            const distEdge2 = result.edges.find(
                (e) => e.id === "distribution-edge-2"
            )!;
            expect(distEdge2.data.priority).toBe("urgent");
            expect(distEdge2.data.edgeType).toBe("rounded");

            const feedbackEdge = result.edges.find(
                (e) => e.id === "feedback-edge"
            )!;
            expect(feedbackEdge.data.isDependency).toBe(true);
            expect(feedbackEdge.data.edgeType).toBe("curved");
        });
    });

    describe("Edge Case Scenarios", () => {
        it("should handle projects with missing edge data gracefully", async () => {
            const projectWithMissingData = {
                projectName: "Incomplete Project",
                nodes: [
                    {
                        id: "node-1",
                        type: "event",
                        name: "Event 1",
                        position: { x: 0, y: 0 },
                        data: {},
                    },
                    {
                        id: "node-2",
                        type: "event",
                        name: "Event 2",
                        position: { x: 200, y: 0 },
                        data: {},
                    },
                ],
                edges: [
                    {
                        id: "edge-no-data",
                        source: "node-1",
                        target: "node-2",
                        type: "default",
                        conditions: [],
                        data: {},
                    },
                    {
                        id: "edge-empty-data",
                        source: "node-1",
                        target: "node-2",
                        type: "default",
                        conditions: [],
                        data: {},
                    },
                    {
                        id: "edge-null-data",
                        source: "node-1",
                        target: "node-2",
                        type: "default",
                        conditions: [],
                        data: {},
                    },
                ],
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T00:00:00Z",
                    projectName: "Incomplete Project",
                },
            };

            const result = await serializationService.deserializeModel(
                projectWithMissingData
            );

            expect(result.migrationReport!.migratedCount).toBe(3);
            expect(result.migrationReport!.errorCount).toBe(0);

            result.edges.forEach((edge) => {
                expect(edge.data).toBeDefined();
                expect(edge.data.useOrthogonalRouting).toBe(true);
            });
        });

        it("should handle very large projects efficiently", async () => {
            const nodeCount = 50;
            const nodes = Array.from({ length: nodeCount }, (_, i) => ({
                id: `node-${i}`,
                type:
                    i % 3 === 0
                        ? "generator"
                        : i % 3 === 1
                        ? "activity"
                        : "event",
                name: `Node ${i}`,
                position: { x: (i % 10) * 150, y: Math.floor(i / 10) * 100 },
                data: { label: `Node ${i}` },
            }));

            const edgeCount = 200;
            const edges = Array.from({ length: edgeCount }, (_, i) => ({
                id: `edge-${i}`,
                source: `node-${i % nodeCount}`,
                target: `node-${(i + 1) % nodeCount}`,
                conditions: [],
                data: {
                    condition: `condition-${i}`,
                    edgeType: ["straight", "bezier", "rounded"][i % 3],
                },
            }));

            const largeProject = {
                projectName: "Large Project",
                nodes,
                edges,
                metadata: {
                    version: "1.0.0",
                    created: "2023-01-01T00:00:00Z",
                    modified: "2023-01-01T00:00:00Z",
                    projectName: "Large Project",
                },
            };

            const startTime = Date.now();
            const result = await serializationService.deserializeModel(
                largeProject
            );
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(5000);

            expect(result.migrationReport!.totalEdges).toBe(edgeCount);
            expect(result.migrationReport!.migratedCount).toBe(edgeCount);
            expect(result.migrationReport!.errorCount).toBe(0);

            expect(result.migrationReport!.processingTimeMs).toBeGreaterThan(0);
        });
    });

    describe("Version-specific Migration", () => {
        it("should handle different version formats", async () => {
            const versions = [
                "0.5.0",
                "0.7.2",
                "0.8.5",
                "0.9.0",
                "1.0.0-beta",
                "1.0.0",
            ];

            for (const version of versions) {
                const versionProject = {
                    projectName: `Project v${version}`,
                    nodes: [
                        {
                            id: "node-1",
                            type: "event",
                            name: "Event",
                            position: { x: 0, y: 0 },
                            data: {},
                        },
                        {
                            id: "node-2",
                            type: "event",
                            name: "Event",
                            position: { x: 200, y: 0 },
                            data: {},
                        },
                    ],
                    edges: [
                        {
                            id: "edge-1",
                            source: "node-1",
                            target: "node-2",
                            conditions: [],
                            data: { version: version },
                        },
                    ],
                    metadata: {
                        version,
                        created: "2023-01-01T00:00:00Z",
                        modified: "2023-01-01T00:00:00Z",
                        projectName: `Project v${version}`,
                    },
                };

                const result = await serializationService.deserializeModel(
                    versionProject
                );

                expect(result.migrationReport!.migratedCount).toBe(1);
                expect(result.migrationReport!.errorCount).toBe(0);

                expect(result.edges[0].data.version).toBe(version);
            }
        });
    });
});
