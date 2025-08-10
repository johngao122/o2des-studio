/**
 * Edge type compatibility tests for orthogonal routing across all variants
 */

import React from "react";
import { ReactFlowProvider, Position } from "reactflow";

jest.mock("../eventbased/EventGraphEdge", () => {
    const MockComponent = jest.fn().mockImplementation((props) => {
        return React.createElement("div", {
            "data-testid": "event-graph-edge",
            ...props,
        });
    });
    (MockComponent as any).getDefaultData = jest.fn(() => ({
        edgeType: "straight",
        condition: "True",
        useOrthogonalRouting: true,
    }));
    return {
        __esModule: true,
        default: MockComponent,
    };
});

jest.mock("../activitybased/resourceconstrained/RCQEdge", () => {
    const MockComponent = jest.fn().mockImplementation((props) => {
        return React.createElement("div", {
            "data-testid": "rcq-edge",
            ...props,
        });
    });
    (MockComponent as any).getDefaultData = jest.fn(() => ({
        edgeType: "straight",
        condition: "True",
        isDependency: false,
        useOrthogonalRouting: true,
    }));
    return {
        __esModule: true,
        default: MockComponent,
    };
});

jest.mock("../eventbased/InitializationEdge", () => {
    const MockComponent = jest.fn().mockImplementation((props) => {
        return React.createElement("div", {
            "data-testid": "initialization-edge",
            ...props,
        });
    });
    (MockComponent as any).getDefaultData = jest.fn(() => ({
        edgeType: "straight",
        initialDelay: "0",
        useOrthogonalRouting: true,
    }));
    return {
        __esModule: true,
        default: MockComponent,
    };
});

jest.mock("../BaseEdgeComponent", () => ({
    BaseEdgeData: {},
}));

import EventGraphEdge from "../eventbased/EventGraphEdge";
import RCQEdge from "../activitybased/resourceconstrained/RCQEdge";
import InitializationEdge from "../eventbased/InitializationEdge";
import { BaseEdgeData } from "../BaseEdgeComponent";

jest.mock("../../../lib/routing/OrthogonalRoutingEngine");
jest.mock("../../../lib/routing/HandleSelectionService");
jest.mock("../../../lib/routing/RoutingFeedbackSystem");
jest.mock("../../../controllers/CommandController");

jest.mock("@pkasila/react-katex", () => {
    return function MockKatex({ children }: { children: React.ReactNode }) {
        return React.createElement(
            "span",
            { "data-testid": "katex" },
            children
        );
    };
});

jest.mock("../../../store", () => ({
    useStore: jest.fn((selector) =>
        selector({
            nodes: [
                {
                    id: "node1",
                    position: { x: 0, y: 0 },
                    data: {},
                    handles: [
                        {
                            id: "right",
                            position: { x: 50, y: 25 },
                            side: "right",
                        },
                        { id: "left", position: { x: 0, y: 25 }, side: "left" },
                    ],
                },
                {
                    id: "node2",
                    position: { x: 200, y: 100 },
                    data: {},
                    handles: [
                        {
                            id: "left",
                            position: { x: 200, y: 125 },
                            side: "left",
                        },
                        {
                            id: "right",
                            position: { x: 250, y: 125 },
                            side: "right",
                        },
                    ],
                },
            ],
        })
    ),
}));

describe("Edge Type Compatibility with Orthogonal Routing", () => {
    const commonEdgeProps = {
        id: "test-edge",
        source: "node1",
        target: "node2",
        sourceX: 50,
        sourceY: 25,
        targetX: 200,
        targetY: 125,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        sourceHandle: "right",
        targetHandle: "left",
        selected: false,
        markerEnd: undefined,
    };

    const baseRoutingData: BaseEdgeData = {
        useOrthogonalRouting: true,
        routingType: "horizontal-first",
        routingMetrics: {
            pathLength: 223.6,
            segmentCount: 2,
            routingType: "horizontal-first",
            efficiency: 0.89,
            handleCombination: "node1:right -> node2:left",
        },
        selectedHandles: {
            source: {
                id: "right",
                nodeId: "node1",
                position: { x: 50, y: 25 },
                side: "right",
                type: "source",
            },
            target: {
                id: "left",
                nodeId: "node2",
                position: { x: 200, y: 125 },
                side: "left",
                type: "target",
            },
        },
        edgeType: "straight",
        controlPoints: [
            { x: 100, y: 25 },
            { x: 100, y: 125 },
        ],
    };

    describe("EventGraphEdge routing compatibility", () => {
        it("should create component with orthogonal routing enabled", () => {
            const eventGraphData = {
                ...baseRoutingData,
                condition: "testCondition",
                delay: "testDelay",
                parameter: "testParam",
            };

            const component = React.createElement(EventGraphEdge, {
                ...commonEdgeProps,
                data: eventGraphData,
            });

            expect(component).toBeDefined();
            expect(component.props.data.useOrthogonalRouting).toBe(true);
        });

        it("should handle missing routing metadata gracefully", () => {
            const minimalData = {
                condition: "minimalCondition",
                edgeType: "straight" as const,
            };

            expect(() => {
                React.createElement(EventGraphEdge, {
                    ...commonEdgeProps,
                    data: minimalData,
                });
            }).not.toThrow();
        });

        it("should preserve domain-specific data with routing", () => {
            const eventGraphData = {
                ...baseRoutingData,
                condition: "x > 5",
                delay: "2.5",
                parameter: "alpha",
                conditionPosition: 0.3,
                delayPosition: 0.7,
                parameterPosition: 0.9,
                conditionLabelOffset: { x: 10, y: -20 },
                delayLabelOffset: { x: -5, y: -30 },
                parameterLabelOffset: { x: 0, y: -40 },
            };

            const component = React.createElement(EventGraphEdge, {
                ...commonEdgeProps,
                data: eventGraphData,
            });

            expect(eventGraphData.condition).toBe("x > 5");
            expect(eventGraphData.routingType).toBe("horizontal-first");
            expect(eventGraphData.useOrthogonalRouting).toBe(true);
        });

        it("should handle different routing types", () => {
            const verticalRoutingData = {
                ...baseRoutingData,
                routingType: "vertical-first" as const,
                routingMetrics: {
                    ...baseRoutingData.routingMetrics!,
                    routingType: "vertical-first" as const,
                },
                condition: "verticalCondition",
            };

            expect(() => {
                React.createElement(EventGraphEdge, {
                    ...commonEdgeProps,
                    data: verticalRoutingData,
                });
            }).not.toThrow();
        });
    });

    describe("RCQEdge routing compatibility", () => {
        it("should create component with orthogonal routing enabled", () => {
            const rcqData = {
                ...baseRoutingData,
                condition: "rcqCondition != True",
                conditionLabelOffset: { x: 0, y: -25 },
            };

            const component = React.createElement(RCQEdge, {
                ...commonEdgeProps,
                data: rcqData,
            });

            expect(rcqData.useOrthogonalRouting).toBe(true);
            expect(rcqData.routingMetrics).toBeDefined();
        });

        it("should handle True condition (no display)", () => {
            const rcqData = {
                ...baseRoutingData,
                condition: "True",
            };

            const component = React.createElement(RCQEdge, {
                ...commonEdgeProps,
                data: rcqData,
            });

            expect(rcqData.condition).toBe("True");
            expect(rcqData.useOrthogonalRouting).toBe(true);
        });

        it("should maintain routing with custom edge types", () => {
            const customRcqData = {
                ...baseRoutingData,
                edgeType: "bezier" as const,
                condition: "resource.available",
                controlPoints: [
                    { x: 75, y: 50 },
                    { x: 125, y: 75 },
                    { x: 175, y: 100 },
                ],
            };

            const component = React.createElement(RCQEdge, {
                ...commonEdgeProps,
                data: customRcqData,
            });

            expect(customRcqData.edgeType).toBe("bezier");
            expect(customRcqData.useOrthogonalRouting).toBe(true);
            expect(customRcqData.controlPoints).toHaveLength(3);
        });
    });

    describe("InitializationEdge routing compatibility", () => {
        it("should create component with orthogonal routing enabled", () => {
            const initData = {
                ...baseRoutingData,
                initialDelay: "10.5",
                delayPosition: 0.6,
                delayLabelOffset: { x: 5, y: -35 },
            };

            const component = React.createElement(InitializationEdge, {
                ...commonEdgeProps,
                data: initData,
            });

            expect(initData.useOrthogonalRouting).toBe(true);
            expect(initData.initialDelay).toBe("10.5");
            expect(initData.routingMetrics).toBeDefined();
        });

        it("should handle default initial delay", () => {
            const initData = {
                ...baseRoutingData,
                initialDelay: "0",
            };

            const component = React.createElement(InitializationEdge, {
                ...commonEdgeProps,
                data: initData,
            });

            expect(initData.initialDelay).toBe("0");
            expect(initData.useOrthogonalRouting).toBe(true);
        });

        it("should handle empty initial delay", () => {
            const initData = {
                ...baseRoutingData,
                initialDelay: "",
            };

            expect(() => {
                React.createElement(InitializationEdge, {
                    ...commonEdgeProps,
                    data: initData,
                });
            }).not.toThrow();
        });
    });

    describe("Cross-edge type routing consistency", () => {
        it("should maintain consistent routing behavior across edge types", () => {
            const sharedRoutingData = {
                useOrthogonalRouting: true,
                routingType: "horizontal-first" as const,
                routingMetrics: {
                    pathLength: 200,
                    segmentCount: 2,
                    routingType: "horizontal-first" as const,
                    efficiency: 0.9,
                    handleCombination: "shared-test",
                },
                edgeType: "straight" as const,
            };

            const eventData = {
                ...sharedRoutingData,
                condition: "eventCondition",
            };

            const rcqData = {
                ...sharedRoutingData,
                condition: "rcqCondition",
            };

            const initData = {
                ...sharedRoutingData,
                initialDelay: "5",
            };

            expect(() => {
                React.createElement(
                    React.Fragment,
                    {},
                    React.createElement(EventGraphEdge, {
                        ...commonEdgeProps,
                        id: "event-edge",
                        data: eventData,
                    }),
                    React.createElement(RCQEdge, {
                        ...commonEdgeProps,
                        id: "rcq-edge",
                        data: rcqData,
                    }),
                    React.createElement(InitializationEdge, {
                        ...commonEdgeProps,
                        id: "init-edge",
                        data: initData,
                    })
                );
            }).not.toThrow();

            expect(eventData.useOrthogonalRouting).toBe(true);
            expect(rcqData.useOrthogonalRouting).toBe(true);
            expect(initData.useOrthogonalRouting).toBe(true);

            expect(eventData.routingType).toBe("horizontal-first");
            expect(rcqData.routingType).toBe("horizontal-first");
            expect(initData.routingType).toBe("horizontal-first");
        });

        it("should handle mixed routing types in same diagram", () => {
            const horizontalRouting = {
                ...baseRoutingData,
                routingType: "horizontal-first" as const,
                routingMetrics: {
                    ...baseRoutingData.routingMetrics!,
                    routingType: "horizontal-first" as const,
                },
            };

            const verticalRouting = {
                ...baseRoutingData,
                routingType: "vertical-first" as const,
                routingMetrics: {
                    ...baseRoutingData.routingMetrics!,
                    routingType: "vertical-first" as const,
                },
            };

            expect(() => {
                React.createElement(
                    React.Fragment,
                    {},
                    React.createElement(EventGraphEdge, {
                        ...commonEdgeProps,
                        id: "horizontal-edge",
                        data: { ...horizontalRouting, condition: "horizontal" },
                    }),
                    React.createElement(RCQEdge, {
                        ...commonEdgeProps,
                        id: "vertical-edge",
                        sourceY: 125,
                        targetY: 25,
                        data: { ...verticalRouting, condition: "vertical" },
                    })
                );
            }).not.toThrow();
        });
    });

    describe("Routing data integrity", () => {
        it("should preserve routing metadata through props changes", () => {
            const initialData = {
                ...baseRoutingData,
                condition: "initialCondition",
            };

            const component1 = React.createElement(EventGraphEdge, {
                ...commonEdgeProps,
                data: initialData,
            });

            const updatedData = {
                ...baseRoutingData,
                condition: "updatedCondition",
            };

            const component2 = React.createElement(EventGraphEdge, {
                ...commonEdgeProps,
                data: updatedData,
            });

            expect(updatedData.useOrthogonalRouting).toBe(true);
            expect(updatedData.routingType).toBe("horizontal-first");
            expect(updatedData.routingMetrics).toBeDefined();
            expect(updatedData.selectedHandles).toBeDefined();
        });

        it("should handle disabled orthogonal routing", () => {
            const disabledRoutingData = {
                ...baseRoutingData,
                useOrthogonalRouting: false,
                condition: "disabledRouting",
            };

            expect(() => {
                React.createElement(EventGraphEdge, {
                    ...commonEdgeProps,
                    data: disabledRoutingData,
                });
            }).not.toThrow();

            expect(disabledRoutingData.useOrthogonalRouting).toBe(false);
        });
    });

    describe("Edge performance with routing", () => {
        it("should handle large number of routing control points", () => {
            const complexRoutingData = {
                ...baseRoutingData,
                controlPoints: Array.from({ length: 10 }, (_, i) => ({
                    x: 50 + i * 20,
                    y: 25 + (i % 2) * 50,
                })),
                condition: "complexRouting",
            };

            expect(() => {
                React.createElement(EventGraphEdge, {
                    ...commonEdgeProps,
                    data: complexRoutingData,
                });
            }).not.toThrow();

            expect(complexRoutingData.controlPoints).toHaveLength(10);
        });

        it("should handle deeply nested routing metadata", () => {
            const deepRoutingData = {
                ...baseRoutingData,
                routingMetrics: {
                    pathLength: 500,
                    segmentCount: 8,
                    routingType: "horizontal-first" as const,
                    efficiency: 0.75,
                    handleCombination: "complex:multi-segment",
                    additionalMetrics: {
                        cornerCount: 3,
                        obstacleAvoidance: true,
                        optimizationLevel: "high",
                        computationTime: 15.7,
                    },
                },
                condition: "deepMetadata",
            };

            expect(() => {
                React.createElement(EventGraphEdge, {
                    ...commonEdgeProps,
                    data: deepRoutingData as any,
                });
            }).not.toThrow();
        });
    });

    describe("Default data compatibility", () => {
        it("should verify EventGraphEdge default data includes routing", () => {
            const defaultData = EventGraphEdge.getDefaultData?.();

            expect(defaultData).toBeDefined();
            expect(defaultData?.edgeType).toBe("straight");
            expect(defaultData?.condition).toBe("True");
        });

        it("should verify RCQEdge default data includes routing", () => {
            const defaultData = RCQEdge.getDefaultData?.();

            expect(defaultData).toBeDefined();
            expect(defaultData?.edgeType).toBe("straight");
            expect(defaultData?.condition).toBe("True");
            expect(defaultData?.isDependency).toBe(false);
        });

        it("should verify InitializationEdge default data includes routing", () => {
            const defaultData = InitializationEdge.getDefaultData?.();

            expect(defaultData).toBeDefined();
            expect(defaultData?.edgeType).toBe("straight");
            expect(defaultData?.initialDelay).toBe("0");
        });
    });
});
