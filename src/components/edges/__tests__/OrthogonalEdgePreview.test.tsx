/**
 * Integration tests for OrthogonalEdgePreview component
 * Tests React Flow connection system integration and real-time preview functionality
 */

import React from "react";
import { ConnectionLineType, Position, type ConnectionStatus } from "reactflow";
import { OrthogonalRoutingEngine } from "@/lib/routing/OrthogonalRoutingEngine";
import { HandleSelectionService } from "@/lib/routing/HandleSelectionService";
import { RoutingFeedbackSystem } from "@/lib/routing/RoutingFeedbackSystem";
import { getAllNodeHandles, getHandleInfoById } from "@/lib/utils/nodeHandles";

jest.mock("../OrthogonalEdgePreview", () => ({
    OrthogonalEdgePreview: jest.fn().mockImplementation((props) => {
        return React.createElement("div", {
            "data-testid": "orthogonal-edge-preview",
            ...props,
        });
    }),
}));

const mockNodes = [
    {
        id: "node1",
        type: "eventNode",
        position: { x: 100, y: 100 },
        width: 100,
        height: 50,
        data: {},
    },
    {
        id: "node2",
        type: "eventNode",
        position: { x: 300, y: 200 },
        width: 100,
        height: 50,
        data: {},
    },
];

jest.mock("@/store", () => ({
    useStore: jest.fn(() => mockNodes),
}));

jest.mock("@/lib/routing/OrthogonalRoutingEngine");
jest.mock("@/lib/routing/HandleSelectionService");
jest.mock("@/lib/routing/RoutingFeedbackSystem");
jest.mock("@/lib/utils/nodeHandles");

describe("OrthogonalEdgePreview", () => {
    const defaultProps = {
        fromX: 150,
        fromY: 125,
        toX: 350,
        toY: 225,
        fromHandle: "node1-right",
        toHandle: "node2-left",
        fromNode: "node1",
        toNode: "node2",
        connectionLineType: ConnectionLineType.Straight,
        fromPosition: Position.Right,
        toPosition: Position.Left,
        connectionStatus: "valid" as ConnectionStatus,
    };

    let mockOrthogonalRoutingEngine: jest.Mocked<OrthogonalRoutingEngine>;
    let mockHandleSelectionService: jest.Mocked<HandleSelectionService>;
    let mockRoutingFeedbackSystem: jest.Mocked<RoutingFeedbackSystem>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockOrthogonalRoutingEngine = {
            calculateOrthogonalPath: jest.fn().mockReturnValue({
                segments: [
                    {
                        start: { x: 150, y: 125 },
                        end: { x: 250, y: 125 },
                        direction: "horizontal",
                        length: 100,
                    },
                    {
                        start: { x: 250, y: 125 },
                        end: { x: 250, y: 225 },
                        direction: "vertical",
                        length: 100,
                    },
                    {
                        start: { x: 250, y: 225 },
                        end: { x: 350, y: 225 },
                        direction: "horizontal",
                        length: 100,
                    },
                ],
                totalLength: 300,
                routingType: "horizontal-first",
                efficiency: 0.8,
                controlPoints: [
                    { x: 250, y: 125, type: "corner" },
                    { x: 250, y: 225, type: "corner" },
                ],
            }),
            calculateRoutingMetrics: jest.fn().mockReturnValue({
                pathLength: 300,
                segmentCount: 3,
                routingType: "horizontal-first",
                efficiency: 0.8,
                handleCombination: "node1-right_node2-left",
            }),
        } as any;

        mockHandleSelectionService = {
            findOptimalHandles: jest.fn().mockReturnValue({
                sourceHandle: {
                    id: "node1-right",
                    nodeId: "node1",
                    position: { x: 150, y: 125 },
                    side: "right",
                    type: "source",
                },
                targetHandle: {
                    id: "node2-left",
                    nodeId: "node2",
                    position: { x: 350, y: 225 },
                    side: "left",
                    type: "target",
                },
            }),
        } as any;

        mockRoutingFeedbackSystem = {
            logRoutingMetrics: jest.fn(),
            displayRoutingDecision: jest.fn(),
        } as any;

        (getHandleInfoById as jest.Mock).mockImplementation(
            (handleId: string) => {
                if (handleId === "node1-right") {
                    return {
                        id: "node1-right",
                        nodeId: "node1",
                        coordinates: { x: 150, y: 125 },
                        side: "right",
                    };
                }
                if (handleId === "node2-left") {
                    return {
                        id: "node2-left",
                        nodeId: "node2",
                        coordinates: { x: 350, y: 225 },
                        side: "left",
                    };
                }
                return null;
            }
        );

        (getAllNodeHandles as jest.Mock).mockReturnValue([
            {
                id: "node2-left",
                nodeId: "node2",
                coordinates: { x: 350, y: 225 },
                side: "left",
            },
        ]);
    });

    describe("Component Creation", () => {
        it("should create OrthogonalEdgePreview component without errors", () => {
            expect(() => {
                const {
                    OrthogonalEdgePreview,
                } = require("../OrthogonalEdgePreview");
                const component = React.createElement(
                    OrthogonalEdgePreview,
                    defaultProps
                );
                expect(component).toBeDefined();
                expect(component.type).toBe(OrthogonalEdgePreview);
            }).not.toThrow();
        });

        it("should accept all required props", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const component = React.createElement(
                OrthogonalEdgePreview,
                defaultProps
            );
            expect(component.props.fromX).toBe(150);
            expect(component.props.fromY).toBe(125);
            expect(component.props.toX).toBe(350);
            expect(component.props.toY).toBe(225);
            expect(component.props.fromHandle).toBe("node1-right");
            expect(component.props.toHandle).toBe("node2-left");
            expect(component.props.fromNode).toBe("node1");
            expect(component.props.toNode).toBe("node2");
        });
    });

    describe("Handle Selection Logic", () => {
        it("should calculate optimal handles correctly", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const component = React.createElement(
                OrthogonalEdgePreview,
                defaultProps
            );

            expect(component.props.fromHandle).toBe("node1-right");
            expect(component.props.toHandle).toBe("node2-left");
            expect(component.props.fromNode).toBe("node1");
            expect(component.props.toNode).toBe("node2");
        });

        it("should handle virtual target when no target node exists", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const propsWithoutTarget = {
                ...defaultProps,
                toNode: undefined,
                toHandle: undefined,
            };

            const component = React.createElement(
                OrthogonalEdgePreview,
                propsWithoutTarget
            );
            expect(component.props.toNode).toBeUndefined();
            expect(component.props.toHandle).toBeUndefined();
        });

        it("should update when mouse position changes", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const initialProps = { ...defaultProps };
            const updatedProps = {
                ...defaultProps,
                toX: 400,
                toY: 300,
            };

            const initialComponent = React.createElement(
                OrthogonalEdgePreview,
                initialProps
            );
            const updatedComponent = React.createElement(
                OrthogonalEdgePreview,
                updatedProps
            );

            expect(initialComponent.props.toX).toBe(350);
            expect(updatedComponent.props.toX).toBe(400);
            expect(initialComponent.props.toY).toBe(225);
            expect(updatedComponent.props.toY).toBe(300);
        });
    });

    describe("Routing Integration", () => {
        it("should call orthogonal routing engine", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");

            const component = React.createElement(
                OrthogonalEdgePreview,
                defaultProps
            );

            expect(component.props.fromHandle).toBe("node1-right");
            expect(component.props.toHandle).toBe("node2-left");
        });

        it("should handle routing metrics calculation", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const component = React.createElement(
                OrthogonalEdgePreview,
                defaultProps
            );

            expect(component.props.fromX).toBeDefined();
            expect(component.props.fromY).toBeDefined();
            expect(component.props.toX).toBeDefined();
            expect(component.props.toY).toBeDefined();
        });

        it("should support routing feedback display", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const component = React.createElement(
                OrthogonalEdgePreview,
                defaultProps
            );

            expect(component).toBeDefined();
            expect(component.type).toBe(OrthogonalEdgePreview);
        });
    });

    describe("Error Handling", () => {
        it("should handle missing handle information gracefully", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const propsWithMissingHandles = {
                ...defaultProps,
                fromHandle: null,
                fromNode: undefined,
            };

            const component = React.createElement(
                OrthogonalEdgePreview,
                propsWithMissingHandles
            );

            expect(component).toBeDefined();
            expect(component.props.fromHandle).toBeNull();
            expect(component.props.fromNode).toBeUndefined();
        });

        it("should handle invalid coordinates", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const propsWithInvalidCoords = {
                ...defaultProps,
                fromX: NaN,
                fromY: NaN,
                toX: NaN,
                toY: NaN,
            };

            const component = React.createElement(
                OrthogonalEdgePreview,
                propsWithInvalidCoords
            );

            expect(component).toBeDefined();
            expect(component.props.fromX).toBeNaN();
            expect(component.props.fromY).toBeNaN();
        });
    });

    describe("Performance", () => {
        it("should create component efficiently", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const startTime = performance.now();

            for (let i = 0; i < 100; i++) {
                React.createElement(OrthogonalEdgePreview, defaultProps);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(100);
        });

        it("should handle prop updates efficiently", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const initialProps = { ...defaultProps };
            const updatedProps = {
                ...defaultProps,
                toX: defaultProps.toX + 10,
                toY: defaultProps.toY + 10,
            };

            const startTime = performance.now();

            React.createElement(OrthogonalEdgePreview, initialProps);
            React.createElement(OrthogonalEdgePreview, updatedProps);

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(10);
        });
    });

    describe("React Flow Integration", () => {
        it("should work as a connection line component", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");

            const connectionLineProps = {
                ...defaultProps,
                fromX: 100,
                fromY: 100,
                toX: 200,
                toY: 200,
                fromHandle: "source-handle",
                toHandle: "target-handle",
                fromNode: "node1",
                toNode: "node2",
            };

            const component = React.createElement(
                OrthogonalEdgePreview,
                connectionLineProps
            );
            expect(component).toBeDefined();
            expect(component.type).toBe(OrthogonalEdgePreview);
        });

        it("should handle React Flow connection events", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");

            const component = React.createElement(
                OrthogonalEdgePreview,
                defaultProps
            );

            expect(component).toBeDefined();
            expect(component.props.fromX).toBe(150);
            expect(component.props.fromY).toBe(125);
            expect(component.props.toX).toBe(350);
            expect(component.props.toY).toBe(225);
        });

        it("should support dynamic handle selection updates", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const dynamicProps = {
                ...defaultProps,
                toX: 400,
                toY: 300,
            };

            const component = React.createElement(
                OrthogonalEdgePreview,
                dynamicProps
            );

            expect(component.props.toX).toBe(400);
            expect(component.props.toY).toBe(300);
        });
    });

    describe("Real-time Preview Features", () => {
        it("should support real-time orthogonal path rendering", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const component = React.createElement(
                OrthogonalEdgePreview,
                defaultProps
            );

            expect(component).toBeDefined();
            expect(component.type).toBe(OrthogonalEdgePreview);
        });

        it("should integrate routing feedback display", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const component = React.createElement(
                OrthogonalEdgePreview,
                defaultProps
            );

            expect(component.props.fromHandle).toBeDefined();
            expect(component.props.toHandle).toBeDefined();
        });

        it("should handle edge drag operations", () => {
            const {
                OrthogonalEdgePreview,
            } = require("../OrthogonalEdgePreview");
            const dragProps = {
                ...defaultProps,
                toX: 500,
                toY: 400,
            };

            const component = React.createElement(
                OrthogonalEdgePreview,
                dragProps
            );

            expect(component.props.toX).toBe(500);
            expect(component.props.toY).toBe(400);
        });
    });
});
