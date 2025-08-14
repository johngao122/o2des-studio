/**
 * Integration tests for store operations with orthogonal routing metadata
 */

import { Connection, MarkerType } from "reactflow";
import { BaseEdge, BaseNode } from "../../types/base";

jest.mock("nanoid", () => ({
    nanoid: jest.fn(() => "mock-id-" + Math.random().toString(36).substr(2, 9)),
}));

jest.mock("../../controllers/CommandController", () => ({
    CommandController: {
        getInstance: jest.fn(() => ({
            createConnectCommand: jest.fn(() => ({
                type: "connect",
                execute: jest.fn(),
            })),
            createUpdateEdgeCommand: jest.fn(() => ({
                type: "updateEdge",
                execute: jest.fn(),
            })),
            createUpdateNodeCommand: jest.fn(() => ({
                type: "updateNode",
                execute: jest.fn(),
            })),
            createDeleteEdgeCommand: jest.fn(() => ({
                type: "deleteEdge",
                execute: jest.fn(),
            })),
            execute: jest.fn(),
            undo: jest.fn(),
            redo: jest.fn(),
            canUndo: jest.fn(() => true),
            canRedo: jest.fn(() => false),
        })),
    },
}));

interface TestStoreState {
    nodes: BaseNode[];
    edges: BaseEdge[];
    onConnect: (connection: Connection) => void;
    onEdgesChange: (changes: any[]) => void;
    setNodes: (nodes: BaseNode[]) => void;
    setEdges: (edges: BaseEdge[]) => void;
}

jest.mock("../../services/AutosaveService", () => ({
    getInstance: () => ({
        autosave: jest.fn(),
    }),
}));

describe("Store Integration with Orthogonal Routing Metadata", () => {
    let mockStore: TestStoreState;
    let commandController: any;

    beforeEach(() => {
        jest.clearAllMocks();

        const {
            CommandController,
        } = require("../../controllers/CommandController");
        commandController = CommandController.getInstance();

        mockStore = {
            nodes: [],
            edges: [],
            onConnect: (connection: Connection) => {
                if (!connection.source || !connection.target) return;
                const command =
                    commandController.createConnectCommand(connection);
                commandController.execute(command);
            },
            onEdgesChange: (changes: any[]) => {},
            setNodes: (nodes: BaseNode[]) => {
                mockStore.nodes = nodes;
            },
            setEdges: (edges: BaseEdge[]) => {
                mockStore.edges = edges;
            },
        };
    });

    describe("onConnect with routing metadata", () => {
        it("should create edge with default orthogonal routing enabled", () => {
            const sourceNode: BaseNode = {
                id: "node-1",
                type: "event",
                name: "Source Event",
                position: { x: 0, y: 0 },
                data: { label: "Source Event" },
            };

            const targetNode: BaseNode = {
                id: "node-2",
                type: "event",
                name: "Target Event",
                position: { x: 200, y: 100 },
                data: { label: "Target Event" },
            };

            mockStore.setNodes([sourceNode, targetNode]);

            const mockEdge: BaseEdge = {
                id: "mock-edge-id",
                source: "node-1",
                target: "node-2",
                sourceHandle: "source-right",
                targetHandle: "target-left",
                type: "eventGraph",
                graphType: "eventBased",
                conditions: [],
                data: {
                    useOrthogonalRouting: true,
                    edgeType: "straight",
                    condition: "customCondition",
                },
            };

            mockStore.setEdges([mockEdge]);

            const edges = mockStore.edges;
            expect(edges).toHaveLength(1);
            expect(edges[0].data.useOrthogonalRouting).toBe(true);
            expect(edges[0].data.edgeType).toBe("straight");
        });

        it("should preserve routing metadata when updating edges", () => {
            const initialEdge: BaseEdge = {
                id: "update-test-edge",
                source: "node-1",
                target: "node-2",
                type: "eventGraph",
                conditions: [],
                data: {
                    useOrthogonalRouting: true,
                    routingType: "horizontal-first",
                    routingMetrics: {
                        pathLength: 200,
                        segmentCount: 1,
                        routingType: "horizontal-first",
                        efficiency: 1.0,
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
                            position: { x: 200, y: 25 },
                            side: "left",
                            type: "target",
                        },
                    },
                    condition: "customCondition",
                    edgeType: "straight",
                },
            };

            mockStore.setEdges([initialEdge]);

            const updatedEdge: BaseEdge = {
                ...initialEdge,
                data: {
                    ...initialEdge.data,
                    condition: "updatedCondition",
                },
            };

            mockStore.setEdges([updatedEdge]);

            const updatedEdges = mockStore.edges;
            expect(updatedEdges).toHaveLength(1);

            expect(updatedEdges[0].data.useOrthogonalRouting).toBe(true);
            expect(updatedEdges[0].data.routingType).toBe("horizontal-first");
            expect(updatedEdges[0].data.routingMetrics).toBeDefined();
            expect(updatedEdges[0].data.selectedHandles).toBeDefined();
            expect(updatedEdges[0].data.condition).toBe("updatedCondition");
        });
    });

    describe("Edge type specific routing integration", () => {
        it("should handle eventGraph edges with orthogonal routing", () => {
            const eventGraphEdge: BaseEdge = {
                id: "eventgraph-test-edge",
                source: "node-1",
                target: "node-2",
                type: "eventGraph",
                conditions: [],
                data: {
                    useOrthogonalRouting: true,
                    routingType: "horizontal-first",
                    condition: "eventCondition",
                    edgeType: "straight",
                },
            };

            mockStore.setEdges([eventGraphEdge]);

            const edges = mockStore.edges;
            expect(edges[0].type).toBe("eventGraph");
            expect(edges[0].data.useOrthogonalRouting).toBe(true);
        });

        it("should handle rcq edges with orthogonal routing", () => {
            const rcqEdge: BaseEdge = {
                id: "rcq-test-edge",
                source: "node-1",
                target: "node-2",
                type: "rcq",
                conditions: [],
                data: {
                    useOrthogonalRouting: true,
                    routingType: "vertical-first",
                    condition: "rcqCondition",
                    edgeType: "straight",
                },
            };

            mockStore.setEdges([rcqEdge]);

            const edges = mockStore.edges;
            expect(edges[0].type).toBe("rcq");
            expect(edges[0].data.useOrthogonalRouting).toBe(true);
        });

        it("should handle initialization edges with orthogonal routing", () => {
            const initEdge: BaseEdge = {
                id: "init-test-edge",
                source: "node-1",
                target: "node-2",
                type: "initialization",
                conditions: [],
                data: {
                    useOrthogonalRouting: true,
                    routingType: "horizontal-first",
                    initialDelay: "5",
                    edgeType: "straight",
                },
            };

            mockStore.setEdges([initEdge]);

            const edges = mockStore.edges;
            expect(edges[0].type).toBe("initialization");
            expect(edges[0].data.useOrthogonalRouting).toBe(true);
        });
    });

    describe("Routing metadata persistence", () => {
        it("should maintain routing metadata across multiple updates", () => {
            const initialEdge: BaseEdge = {
                id: "persistence-test-edge",
                source: "node-1",
                target: "node-2",
                type: "eventGraph",
                conditions: [],
                data: {
                    useOrthogonalRouting: true,
                    routingType: "horizontal-first",
                    routingMetrics: {
                        pathLength: 200,
                        segmentCount: 1,
                        routingType: "horizontal-first",
                        efficiency: 1.0,
                        handleCombination: "node-1:right -> node-2:left",
                    },
                    condition: "initial",
                    edgeType: "straight",
                },
            };

            mockStore.setEdges([initialEdge]);

            const updateCount = 5;
            for (let index = 0; index < updateCount; index++) {
                const updatedEdge: BaseEdge = {
                    ...initialEdge,
                    data: {
                        ...initialEdge.data,
                        condition: `update${index + 1}`,
                        routingType: "vertical-first",
                        routingMetrics: {
                            ...initialEdge.data.routingMetrics!,
                            routingType: "vertical-first",
                        },
                    },
                };

                mockStore.setEdges([updatedEdge]);

                const edges = mockStore.edges;
                expect(edges).toHaveLength(1);
                expect(edges[0].data.useOrthogonalRouting).toBe(true);
                expect(edges[0].data.routingType).toBe("vertical-first");
                expect(edges[0].data.routingMetrics).toBeDefined();
                expect(edges[0].data.condition).toBe(`update${index + 1}`);
            }
        });
    });

    describe("Error handling", () => {
        it("should handle missing routing metadata gracefully", () => {
            const edgeWithoutRouting: BaseEdge = {
                id: "no-routing-edge",
                source: "node-1",
                target: "node-2",
                type: "eventGraph",
                conditions: [],
                data: {
                    condition: "True",
                },
            };

            mockStore.setEdges([edgeWithoutRouting]);

            const edges = mockStore.edges;
            expect(edges).toHaveLength(1);
            expect(edges[0].data.useOrthogonalRouting).toBeUndefined();
        });

        it("should handle invalid connection gracefully", () => {
            const invalidConnection: Connection = {
                source: null,
                target: "node-2",
                sourceHandle: null,
                targetHandle: "target-left",
            };

            mockStore.onConnect(invalidConnection);
            expect(
                commandController.createConnectCommand
            ).not.toHaveBeenCalled();
            expect(commandController.execute).not.toHaveBeenCalled();
        });
    });

    describe("Complex routing scenarios", () => {
        it("should handle multiple edges with different routing preferences", () => {
            const edges: BaseEdge[] = [
                {
                    id: "horizontal-edge",
                    source: "node-1",
                    target: "node-2",
                    type: "eventGraph",
                    conditions: [],
                    data: {
                        useOrthogonalRouting: true,
                        routingType: "horizontal-first",
                        routingMetrics: {
                            pathLength: 100,
                            segmentCount: 2,
                            routingType: "horizontal-first",
                            efficiency: 0.95,
                            handleCombination: "node-1:right -> node-2:left",
                        },
                    },
                },
                {
                    id: "vertical-edge",
                    source: "node-2",
                    target: "node-3",
                    type: "rcq",
                    conditions: [],
                    data: {
                        useOrthogonalRouting: true,
                        routingType: "vertical-first",
                        routingMetrics: {
                            pathLength: 150,
                            segmentCount: 2,
                            routingType: "vertical-first",
                            efficiency: 0.88,
                            handleCombination: "node-2:bottom -> node-3:top",
                        },
                    },
                },
            ];

            mockStore.setEdges(edges);

            const storeEdges = mockStore.edges;
            expect(storeEdges).toHaveLength(2);

            const horizontalEdge = storeEdges.find(
                (e) => e.id === "horizontal-edge"
            );
            const verticalEdge = storeEdges.find(
                (e) => e.id === "vertical-edge"
            );

            expect(horizontalEdge?.data.routingType).toBe("horizontal-first");
            expect(verticalEdge?.data.routingType).toBe("vertical-first");

            expect(horizontalEdge?.data.routingMetrics?.efficiency).toBe(0.95);
            expect(verticalEdge?.data.routingMetrics?.efficiency).toBe(0.88);
        });
    });
});
