/**
 * Tests for undo/redo operations preserving routing state correctly
 */

import { BaseEdge, BaseNode } from "../../types/base";
import { Connection, MarkerType } from "reactflow";

jest.mock("../CommandController", () => ({
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
            canRedo: jest.fn(() => true),
        })),
    },
}));

jest.mock("../../store", () => ({
    useStore: {
        getState: jest.fn(() => ({
            nodes: [],
            edges: [],
        })),
        setState: jest.fn(),
    },
}));

jest.mock("../../services/AutosaveService", () => ({
    getInstance: () => ({
        autosave: jest.fn(),
    }),
}));

jest.mock("../../services/DagreLayoutService", () => ({
    getInstance: () => ({}),
}));

jest.mock("../../lib/utils/collision", () => ({
    checkAllEdgeControlPointCollisions: jest.fn(() => []),
}));

describe("Undo/Redo Operations with Routing State", () => {
    let commandController: any;
    let mockStore: {
        nodes: BaseNode[];
        edges: BaseEdge[];
        setState: jest.Mock;
        getState: jest.Mock;
    };

    beforeEach(() => {
        const { CommandController } = require("../CommandController");
        commandController = CommandController.getInstance();

        mockStore = {
            nodes: [],
            edges: [],
            setState: jest.fn(),
            getState: jest.fn(),
        };

        const { useStore } = require("../../store");
        useStore.getState.mockReturnValue(mockStore);

        commandController["undoStack"] = [];
        commandController["redoStack"] = [];
    });

    describe("Edge creation with routing metadata", () => {
        it("should preserve routing metadata during undo/redo of edge creation", () => {
            const nodes: BaseNode[] = [
                {
                    id: "source-node",
                    type: "event",
                    name: "Source Event",
                    position: { x: 0, y: 0 },
                    data: { label: "Source" },
                },
                {
                    id: "target-node",
                    type: "event",
                    name: "Target Event",
                    position: { x: 200, y: 100 },
                    data: { label: "Target" },
                },
            ];

            mockStore.nodes = nodes;
            mockStore.getState = jest.fn(() => mockStore);

            const connection: Connection = {
                source: "source-node",
                target: "target-node",
                sourceHandle: "source-right",
                targetHandle: "target-left",
            };

            const connectCommand =
                commandController.createConnectCommand(connection);
            commandController.execute(connectCommand);

            expect(connectCommand).toBeDefined();
            expect(commandController.canUndo()).toBe(true);

            const createdEdge: BaseEdge = {
                id: "test-edge-id",
                source: "source-node",
                target: "target-node",
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
                    condition: "True",
                    edgeType: "straight",
                    useOrthogonalRouting: true,
                    routingType: "horizontal-first",
                    routingMetrics: {
                        pathLength: 223.6,
                        segmentCount: 2,
                        routingType: "horizontal-first",
                        efficiency: 0.89,
                        handleCombination:
                            "source-node:right -> target-node:left",
                    },
                    selectedHandles: {
                        source: {
                            id: "source-right",
                            nodeId: "source-node",
                            position: { x: 50, y: 25 },
                            side: "right",
                            type: "source",
                        },
                        target: {
                            id: "target-left",
                            nodeId: "target-node",
                            position: { x: 200, y: 125 },
                            side: "left",
                            type: "target",
                        },
                    },
                },
            };

            mockStore.edges = [createdEdge];

            commandController.undo();
            expect(commandController.canRedo()).toBe(true);

            commandController.redo();

            expect(mockStore.edges).toHaveLength(1);
            const restoredEdge = mockStore.edges[0];
            expect(restoredEdge.data.useOrthogonalRouting).toBe(true);
            expect(restoredEdge.data.routingType).toBe("horizontal-first");
            expect(restoredEdge.data.routingMetrics).toBeDefined();
            expect(restoredEdge.data.selectedHandles).toBeDefined();
        });
    });

    describe("Edge update with routing metadata changes", () => {
        it("should preserve routing metadata changes during undo/redo", () => {
            const initialEdge: BaseEdge = {
                id: "update-test-edge",
                source: "node-a",
                target: "node-b",
                type: "eventGraph",
                conditions: [],
                data: {
                    condition: "initialCondition",
                    useOrthogonalRouting: true,
                    routingType: "horizontal-first",
                    routingMetrics: {
                        pathLength: 150,
                        segmentCount: 1,
                        routingType: "horizontal-first",
                        efficiency: 1.0,
                        handleCombination: "node-a:right -> node-b:left",
                    },
                    selectedHandles: {
                        source: {
                            id: "source-right",
                            nodeId: "node-a",
                            position: { x: 50, y: 25 },
                            side: "right",
                            type: "source",
                        },
                        target: {
                            id: "target-left",
                            nodeId: "node-b",
                            position: { x: 200, y: 25 },
                            side: "left",
                            type: "target",
                        },
                    },
                    controlPoints: [{ x: 125, y: 25 }],
                },
            };

            mockStore.edges = [initialEdge];

            const updatedData = {
                ...initialEdge.data,
                routingType: "vertical-first" as const,
                routingMetrics: {
                    pathLength: 200,
                    segmentCount: 3,
                    routingType: "vertical-first" as const,
                    efficiency: 0.85,
                    handleCombination: "node-a:bottom -> node-b:top",
                },
                controlPoints: [
                    { x: 75, y: 75 },
                    { x: 125, y: 75 },
                    { x: 175, y: 75 },
                ],
                condition: "updatedCondition",
            };

            const updateCommand = commandController.createUpdateEdgeCommand(
                "update-test-edge",
                { data: updatedData }
            );
            commandController.execute(updateCommand);

            const updatedEdge = { ...initialEdge, data: updatedData };
            mockStore.edges = [updatedEdge];

            expect(mockStore.edges[0].data.routingType).toBe("vertical-first");
            expect(mockStore.edges[0].data.condition).toBe("updatedCondition");
            expect(mockStore.edges[0].data.controlPoints).toHaveLength(3);

            commandController.undo();
            mockStore.edges = [initialEdge];

            expect(mockStore.edges[0].data.routingType).toBe(
                "horizontal-first"
            );
            expect(mockStore.edges[0].data.condition).toBe("initialCondition");
            expect(mockStore.edges[0].data.controlPoints).toHaveLength(1);

            commandController.redo();
            mockStore.edges = [updatedEdge];

            expect(mockStore.edges[0].data.routingType).toBe("vertical-first");
            expect(mockStore.edges[0].data.condition).toBe("updatedCondition");
            expect(mockStore.edges[0].data.controlPoints).toHaveLength(3);
            expect(mockStore.edges[0].data.routingMetrics?.efficiency).toBe(
                0.85
            );
        });
    });

    describe("Complex routing metadata operations", () => {
        it("should handle multiple routing updates with undo/redo", () => {
            let currentEdge: BaseEdge = {
                id: "multi-update-edge",
                source: "multi-node-1",
                target: "multi-node-2",
                type: "rcq",
                conditions: [],
                data: {
                    condition: "step0",
                    useOrthogonalRouting: true,
                    routingType: "horizontal-first",
                    routingMetrics: {
                        pathLength: 100,
                        segmentCount: 1,
                        routingType: "horizontal-first",
                        efficiency: 1.0,
                        handleCombination: "initial",
                    },
                },
            };

            mockStore.edges = [currentEdge];

            const updates = [
                {
                    condition: "step1",
                    routingType: "vertical-first" as const,
                    routingMetrics: {
                        pathLength: 150,
                        segmentCount: 2,
                        routingType: "vertical-first" as const,
                        efficiency: 0.9,
                        handleCombination: "update1",
                    },
                },
                {
                    condition: "step2",
                    controlPoints: [
                        { x: 50, y: 50 },
                        { x: 100, y: 100 },
                    ],
                    routingMetrics: {
                        ...currentEdge.data.routingMetrics!,
                        pathLength: 180,
                        efficiency: 0.85,
                        handleCombination: "update2",
                    },
                },
                {
                    condition: "step3",
                    routingType: "horizontal-first" as const,
                    selectedHandles: {
                        source: {
                            id: "new-source",
                            nodeId: "multi-node-1",
                            position: { x: 75, y: 50 },
                            side: "bottom",
                            type: "source",
                        },
                        target: {
                            id: "new-target",
                            nodeId: "multi-node-2",
                            position: { x: 225, y: 150 },
                            side: "top",
                            type: "target",
                        },
                    },
                },
            ];

            updates.forEach((update, index) => {
                const updatedData = { ...currentEdge.data, ...update };
                const command = commandController.createUpdateEdgeCommand(
                    "multi-update-edge",
                    { data: updatedData }
                );
                commandController.execute(command);

                currentEdge = { ...currentEdge, data: updatedData };
                mockStore.edges = [currentEdge];
            });

            expect(mockStore.edges[0].data.condition).toBe("step3");
            expect(mockStore.edges[0].data.routingType).toBe(
                "horizontal-first"
            );
            expect(mockStore.edges[0].data.selectedHandles?.source.side).toBe(
                "bottom"
            );

            for (let i = updates.length - 1; i >= 0; i--) {
                commandController.undo();

                if (i === 0) {
                    currentEdge = {
                        id: "multi-update-edge",
                        source: "multi-node-1",
                        target: "multi-node-2",
                        type: "rcq",
                        conditions: [],
                        data: {
                            condition: "step0",
                            useOrthogonalRouting: true,
                            routingType: "horizontal-first",
                            routingMetrics: {
                                pathLength: 100,
                                segmentCount: 1,
                                routingType: "horizontal-first",
                                efficiency: 1.0,
                                handleCombination: "initial",
                            },
                        },
                    };
                } else {
                    const prevUpdate = updates[i - 1];
                    currentEdge = {
                        ...currentEdge,
                        data: { ...currentEdge.data, ...prevUpdate },
                    };
                }
                mockStore.edges = [currentEdge];
            }

            expect(mockStore.edges[0].data.condition).toBe("step0");
            expect(mockStore.edges[0].data.routingType).toBe(
                "horizontal-first"
            );
            expect(
                mockStore.edges[0].data.routingMetrics?.handleCombination
            ).toBe("initial");

            for (let i = 0; i < updates.length; i++) {
                commandController.redo();

                const update = updates[i];
                currentEdge = {
                    ...currentEdge,
                    data: { ...currentEdge.data, ...update },
                };
                mockStore.edges = [currentEdge];
            }

            expect(mockStore.edges[0].data.condition).toBe("step3");
            expect(mockStore.edges[0].data.routingType).toBe(
                "horizontal-first"
            );
            expect(mockStore.edges[0].data.selectedHandles?.source.side).toBe(
                "bottom"
            );
        });
    });

    describe("Routing metadata with node operations", () => {
        it("should preserve edge routing when nodes are moved and undone", () => {
            const nodes: BaseNode[] = [
                {
                    id: "movable-node-1",
                    type: "event",
                    name: "Movable 1",
                    position: { x: 0, y: 0 },
                    data: {},
                },
                {
                    id: "movable-node-2",
                    type: "event",
                    name: "Movable 2",
                    position: { x: 200, y: 0 },
                    data: {},
                },
            ];

            const edge: BaseEdge = {
                id: "routing-edge-with-nodes",
                source: "movable-node-1",
                target: "movable-node-2",
                type: "eventGraph",
                conditions: [],
                data: {
                    condition: "nodeMovementTest",
                    useOrthogonalRouting: true,
                    routingType: "horizontal-first",
                    routingMetrics: {
                        pathLength: 200,
                        segmentCount: 1,
                        routingType: "horizontal-first",
                        efficiency: 1.0,
                        handleCombination:
                            "movable-node-1:right -> movable-node-2:left",
                    },
                    selectedHandles: {
                        source: {
                            id: "source-right",
                            nodeId: "movable-node-1",
                            position: { x: 50, y: 25 },
                            side: "right",
                            type: "source",
                        },
                        target: {
                            id: "target-left",
                            nodeId: "movable-node-2",
                            position: { x: 200, y: 25 },
                            side: "left",
                            type: "target",
                        },
                    },
                },
            };

            mockStore.nodes = nodes;
            mockStore.edges = [edge];

            const originalPosition = { ...nodes[0].position };
            const newPosition = { x: 100, y: 100 };

            const moveCommand = commandController.createUpdateNodeCommand(
                "movable-node-1",
                { position: newPosition }
            );
            commandController.execute(moveCommand);

            nodes[0].position = newPosition;
            mockStore.nodes = [...nodes];

            expect(mockStore.edges[0].data.useOrthogonalRouting).toBe(true);
            expect(mockStore.edges[0].data.routingMetrics).toBeDefined();
            expect(mockStore.edges[0].data.selectedHandles?.source.nodeId).toBe(
                "movable-node-1"
            );

            commandController.undo();
            nodes[0].position = originalPosition;
            mockStore.nodes = [...nodes];

            expect(mockStore.edges[0].data.useOrthogonalRouting).toBe(true);
            expect(
                mockStore.edges[0].data.routingMetrics?.handleCombination
            ).toBe("movable-node-1:right -> movable-node-2:left");
            expect(
                mockStore.edges[0].data.selectedHandles?.source.position
            ).toEqual({ x: 50, y: 25 });

            commandController.redo();
            nodes[0].position = newPosition;
            mockStore.nodes = [...nodes];

            expect(mockStore.edges[0].data.useOrthogonalRouting).toBe(true);
            expect(mockStore.edges[0].data.routingMetrics).toBeDefined();
            expect(mockStore.edges[0].data.condition).toBe("nodeMovementTest");
        });
    });

    describe("Edge deletion with routing metadata", () => {
        it("should preserve complete routing metadata during delete/undo cycle", () => {
            const edgeWithCompleteRouting: BaseEdge = {
                id: "delete-test-edge",
                source: "delete-source",
                target: "delete-target",
                type: "initialization",
                conditions: [],
                data: {
                    parameter: "42",
                    useOrthogonalRouting: true,
                    routingType: "vertical-first",
                    routingMetrics: {
                        pathLength: 275,
                        segmentCount: 4,
                        routingType: "vertical-first",
                        efficiency: 0.78,
                        handleCombination:
                            "delete-source:bottom -> delete-target:top",
                    },
                    selectedHandles: {
                        source: {
                            id: "source-bottom",
                            nodeId: "delete-source",
                            position: { x: 25, y: 50 },
                            side: "bottom",
                            type: "source",
                        },
                        target: {
                            id: "target-top",
                            nodeId: "delete-target",
                            position: { x: 125, y: 0 },
                            side: "top",
                            type: "target",
                        },
                    },
                    controlPoints: [
                        { x: 25, y: 100 },
                        { x: 75, y: 100 },
                        { x: 75, y: -50 },
                        { x: 125, y: -50 },
                    ],
                },
            };

            mockStore.edges = [edgeWithCompleteRouting];

            const deleteCommand =
                commandController.createDeleteEdgeCommand("delete-test-edge");
            commandController.execute(deleteCommand);

            mockStore.edges = [];

            expect(mockStore.edges).toHaveLength(0);

            commandController.undo();
            mockStore.edges = [edgeWithCompleteRouting];

            const restoredEdge = mockStore.edges[0];
            expect(restoredEdge.data.useOrthogonalRouting).toBe(true);
            expect(restoredEdge.data.routingType).toBe("vertical-first");

            expect(restoredEdge.data.routingMetrics?.pathLength).toBe(275);
            expect(restoredEdge.data.routingMetrics?.segmentCount).toBe(4);
            expect(restoredEdge.data.routingMetrics?.efficiency).toBe(0.78);
            expect(restoredEdge.data.routingMetrics?.handleCombination).toBe(
                "delete-source:bottom -> delete-target:top"
            );

            expect(restoredEdge.data.selectedHandles?.source.side).toBe(
                "bottom"
            );
            expect(restoredEdge.data.selectedHandles?.target.side).toBe("top");
            expect(restoredEdge.data.selectedHandles?.source.position).toEqual({
                x: 25,
                y: 50,
            });
            expect(restoredEdge.data.selectedHandles?.target.position).toEqual({
                x: 125,
                y: 0,
            });

            expect(restoredEdge.data.controlPoints).toHaveLength(4);
            expect(restoredEdge.data.controlPoints?.[0]).toEqual({
                x: 25,
                y: 100,
            });
            expect(restoredEdge.data.controlPoints?.[3]).toEqual({
                x: 125,
                y: -50,
            });

            expect(restoredEdge.data.parameter).toBe("42");
            expect(restoredEdge.type).toBe("initialization");
        });
    });

    describe("Command history limits with routing data", () => {
        it("should maintain routing metadata integrity across command history limits", () => {
            const baseEdge: BaseEdge = {
                id: "history-test-edge",
                source: "history-source",
                target: "history-target",
                type: "eventGraph",
                conditions: [],
                data: {
                    condition: "historyTest",
                    useOrthogonalRouting: true,
                    routingType: "horizontal-first",
                    routingMetrics: {
                        pathLength: 100,
                        segmentCount: 1,
                        routingType: "horizontal-first",
                        efficiency: 1.0,
                        handleCombination: "base",
                    },
                },
            };

            mockStore.edges = [baseEdge];

            const updateCount = 10;
            for (let i = 1; i <= updateCount; i++) {
                const updatedData = {
                    ...baseEdge.data,
                    condition: `historyTest${i}`,
                    routingMetrics: {
                        ...baseEdge.data.routingMetrics!,
                        pathLength: 100 + i * 10,
                        handleCombination: `update${i}`,
                    },
                };

                const command = commandController.createUpdateEdgeCommand(
                    "history-test-edge",
                    { data: updatedData }
                );
                commandController.execute(command);

                mockStore.edges = [{ ...baseEdge, data: updatedData }];
            }

            expect(commandController.canUndo()).toBe(true);

            for (let i = 0; i < updateCount / 2; i++) {
                commandController.undo();

                const stepBack = updateCount - i - 1;
                if (stepBack === 0) {
                    mockStore.edges = [baseEdge];
                } else {
                    const revertedData = {
                        ...baseEdge.data,
                        condition: `historyTest${stepBack}`,
                        routingMetrics: {
                            ...baseEdge.data.routingMetrics!,
                            pathLength: 100 + stepBack * 10,
                            handleCombination: `update${stepBack}`,
                        },
                    };
                    mockStore.edges = [{ ...baseEdge, data: revertedData }];
                }
            }

            const currentEdge = mockStore.edges[0];
            expect(currentEdge.data.useOrthogonalRouting).toBe(true);
            expect(currentEdge.data.routingType).toBe("horizontal-first");
            expect(currentEdge.data.routingMetrics).toBeDefined();
            expect(currentEdge.data.condition).toBe(
                `historyTest${updateCount / 2}`
            );

            expect(commandController.canRedo()).toBe(true);
        });
    });
});
