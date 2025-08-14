/**
 * Tests for RoutingFeedbackSystem
 */

import {
    RoutingFeedbackSystem,
    RoutingDecision,
    FeedbackOptions,
    VisualIndicator,
} from "../RoutingFeedbackSystem";
import {
    HandleInfo,
    RoutingMetrics,
    OrthogonalPath,
    PathSegment,
    ControlPoint,
} from "../types";
import { RoutingComparison } from "../OrthogonalRoutingEngine";

// Mock console methods
const mockConsole = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Mock DOM methods
const mockElement = {
    classList: {
        add: jest.fn(),
        remove: jest.fn(),
    },
    style: {} as CSSStyleDeclaration,
    remove: jest.fn(),
} as unknown as HTMLElement;

const mockDocument = {
    createElement: jest.fn(() => mockElement),
    querySelector: jest.fn(() => mockElement),
    body: {
        appendChild: jest.fn(),
    },
};

// Setup mocks
beforeAll(() => {
    global.console = mockConsole as any;
    global.document = mockDocument as any;
    global.setTimeout = jest.fn((callback) => {
        callback();
        return 1;
    }) as any;
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe("RoutingFeedbackSystem", () => {
    // Test data
    const createMockHandle = (
        id: string,
        nodeId: string,
        side: "top" | "right" | "bottom" | "left",
        type: "source" | "target",
        x = 100,
        y = 100
    ): HandleInfo => ({
        id,
        nodeId,
        position: { x, y },
        side,
        type,
    });

    const createMockPath = (
        routingType: "horizontal-first" | "vertical-first",
        totalLength = 200
    ): OrthogonalPath => ({
        segments: [
            {
                start: { x: 0, y: 0 },
                end: { x: 100, y: 0 },
                direction: "horizontal" as const,
                length: 100,
            },
            {
                start: { x: 100, y: 0 },
                end: { x: 100, y: 100 },
                direction: "vertical" as const,
                length: 100,
            },
        ] as PathSegment[],
        totalLength,
        routingType,
        efficiency: 0.8,
        controlPoints: [
            { x: 100, y: 0, type: "corner" as const },
        ] as ControlPoint[],
    });

    const createMockRoutingDecision = (): RoutingDecision => ({
        selectedPath: createMockPath("horizontal-first", 200),
        alternativePath: createMockPath("vertical-first", 220),
        reason: "Horizontal-first routing selected: shorter path (200 vs 220)",
        efficiency: 0.8,
        timestamp: Date.now(),
    });

    const createMockRoutingComparison = (): RoutingComparison => ({
        selectedPath: createMockPath("horizontal-first", 200),
        alternativePath: createMockPath("vertical-first", 220),
        reason: "Horizontal-first routing selected: shorter path (200 vs 220)",
        efficiency: 0.8,
    });

    describe("Constructor and Options", () => {
        it("should initialize with default options", () => {
            const system = new RoutingFeedbackSystem();
            const options = system.getOptions();

            expect(options.enableConsoleLogging).toBe(true);
            expect(options.enableVisualIndicators).toBe(true);
            expect(options.logLevel).toBe("info");
            expect(options.visualIndicatorDuration).toBe(3000);
        });

        it("should initialize with custom options", () => {
            const customOptions: FeedbackOptions = {
                enableConsoleLogging: false,
                enableVisualIndicators: false,
                logLevel: "debug",
                visualIndicatorDuration: 5000,
            };

            const system = new RoutingFeedbackSystem(customOptions);
            const options = system.getOptions();

            expect(options.enableConsoleLogging).toBe(false);
            expect(options.enableVisualIndicators).toBe(false);
            expect(options.logLevel).toBe("debug");
            expect(options.visualIndicatorDuration).toBe(5000);
        });

        it("should update options", () => {
            const system = new RoutingFeedbackSystem();

            system.updateOptions({
                enableConsoleLogging: false,
                logLevel: "warn",
            });

            const options = system.getOptions();
            expect(options.enableConsoleLogging).toBe(false);
            expect(options.logLevel).toBe("warn");
            expect(options.enableVisualIndicators).toBe(true); // Should remain unchanged
        });
    });

    describe("Routing Decision Display", () => {
        it("should display routing decision with logging enabled", () => {
            const system = new RoutingFeedbackSystem({
                enableConsoleLogging: true,
                enableVisualIndicators: false,
            });

            const decision = createMockRoutingDecision();
            system.displayRoutingDecision(decision);

            expect(mockConsole.info).toHaveBeenCalledWith(
                "🛣️ Routing Decision:",
                expect.objectContaining({
                    selectedRouting: "horizontal-first",
                    selectedLength: 200,
                    alternativeRouting: "vertical-first",
                    alternativeLength: 220,
                    reason: decision.reason,
                    efficiency: 0.8,
                })
            );
        });

        it("should display routing decision with visual indicators enabled", () => {
            const system = new RoutingFeedbackSystem({
                enableConsoleLogging: false,
                enableVisualIndicators: true,
            });

            const decision = createMockRoutingDecision();
            system.displayRoutingDecision(decision);

            expect(mockDocument.createElement).toHaveBeenCalledWith("div");
            expect(mockDocument.body.appendChild).toHaveBeenCalled();
        });

        it("should add routing decision to history", () => {
            const system = new RoutingFeedbackSystem();
            const decision = createMockRoutingDecision();

            system.displayRoutingDecision(decision);

            const history = system.getRoutingHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toEqual(decision);
        });

        it("should maintain history size limit", () => {
            const system = new RoutingFeedbackSystem();

            // Add more than the max history size (100)
            for (let i = 0; i < 105; i++) {
                const decision = createMockRoutingDecision();
                decision.timestamp = Date.now() + i;
                system.displayRoutingDecision(decision);
            }

            const history = system.getRoutingHistory();
            expect(history).toHaveLength(100);
        });
    });

    describe("Handle Highlighting", () => {
        it("should highlight selected handles", () => {
            const system = new RoutingFeedbackSystem({
                enableVisualIndicators: true,
            });

            const handles = [
                createMockHandle("h1", "node1", "right", "source"),
                createMockHandle("h2", "node2", "left", "target"),
            ];

            system.highlightSelectedHandles(handles);

            expect(mockDocument.querySelector).toHaveBeenCalledTimes(2);
            expect(mockConsole.info).toHaveBeenCalledWith(
                "🎯 Handle Selection:",
                expect.arrayContaining([
                    expect.objectContaining({
                        nodeId: "node1",
                        handleId: "h1",
                        side: "right",
                        type: "source",
                    }),
                    expect.objectContaining({
                        nodeId: "node2",
                        handleId: "h2",
                        side: "left",
                        type: "target",
                    }),
                ])
            );
        });

        it("should apply highlight styles to handle elements", () => {
            const system = new RoutingFeedbackSystem({
                enableVisualIndicators: true,
            });

            const handles = [
                createMockHandle("h1", "node1", "right", "source"),
            ];
            system.highlightSelectedHandles(handles);

            expect(mockElement.classList.add).toHaveBeenCalledWith(
                "routing-handle-highlight"
            );
        });

        it("should not highlight handles when visual indicators are disabled", () => {
            const system = new RoutingFeedbackSystem({
                enableVisualIndicators: false,
            });

            const handles = [
                createMockHandle("h1", "node1", "right", "source"),
            ];
            system.highlightSelectedHandles(handles);

            expect(mockDocument.querySelector).not.toHaveBeenCalled();
            expect(mockElement.classList.add).not.toHaveBeenCalled();
        });
    });

    describe("Routing Metrics Logging", () => {
        it("should log routing metrics with info level", () => {
            const system = new RoutingFeedbackSystem({
                logLevel: "info",
            });

            const metrics: RoutingMetrics = {
                pathLength: 200,
                segmentCount: 3,
                routingType: "horizontal-first",
                efficiency: 0.85,
                handleCombination: "node1:right -> node2:left",
            };

            system.logRoutingMetrics(metrics);

            expect(mockConsole.info).toHaveBeenCalledWith(
                "📊 Routing Metrics:",
                expect.objectContaining({
                    pathLength: 200,
                    segmentCount: 3,
                    routingType: "horizontal-first",
                    efficiency: 0.85,
                    handleCombination: "node1:right -> node2:left",
                })
            );
        });

        it("should log routing metrics with different log levels", () => {
            const testCases = [
                { level: "debug" as const, method: mockConsole.debug },
                { level: "warn" as const, method: mockConsole.warn },
                { level: "error" as const, method: mockConsole.error },
            ];

            testCases.forEach(({ level, method }) => {
                jest.clearAllMocks();

                const system = new RoutingFeedbackSystem({ logLevel: level });
                const metrics: RoutingMetrics = {
                    pathLength: 200,
                    segmentCount: 3,
                    routingType: "horizontal-first",
                    efficiency: 0.85,
                    handleCombination: "node1:right -> node2:left",
                };

                system.logRoutingMetrics(metrics);

                expect(method).toHaveBeenCalled();
            });
        });

        it("should not log when console logging is disabled", () => {
            const system = new RoutingFeedbackSystem({
                enableConsoleLogging: false,
            });

            const metrics: RoutingMetrics = {
                pathLength: 200,
                segmentCount: 3,
                routingType: "horizontal-first",
                efficiency: 0.85,
                handleCombination: "node1:right -> node2:left",
            };

            system.logRoutingMetrics(metrics);

            expect(mockConsole.info).not.toHaveBeenCalled();
        });
    });

    describe("Path Comparison", () => {
        it("should show path comparison", () => {
            const system = new RoutingFeedbackSystem();
            const comparison = createMockRoutingComparison();

            system.showPathComparison(comparison);

            expect(mockConsole.info).toHaveBeenCalledWith(
                "🛣️ Routing Decision:",
                expect.objectContaining({
                    selectedRouting: "horizontal-first",
                    alternativeRouting: "vertical-first",
                })
            );

            expect(mockDocument.createElement).toHaveBeenCalled();
            expect(mockDocument.body.appendChild).toHaveBeenCalled();
        });
    });

    describe("Indicator Management", () => {
        it("should clear all indicators", () => {
            const system = new RoutingFeedbackSystem();

            // Add some indicators
            const handles = [
                createMockHandle("h1", "node1", "right", "source"),
            ];
            system.highlightSelectedHandles(handles);

            const decision = createMockRoutingDecision();
            system.displayRoutingDecision(decision);

            // Clear all indicators
            system.clearAllIndicators();

            const stats = system.getStatistics();
            expect(stats.activeIndicators).toBe(0);
        });

        it("should clear indicators by type", () => {
            const system = new RoutingFeedbackSystem();

            // Add handle highlights
            const handles = [
                createMockHandle("h1", "node1", "right", "source"),
            ];
            system.highlightSelectedHandles(handles);

            // Clear only handle highlights
            system.clearIndicatorsByType("handle-highlight");

            expect(mockElement.classList.remove).toHaveBeenCalledWith(
                "routing-handle-highlight"
            );
        });
    });

    describe("Statistics", () => {
        it("should provide accurate statistics", () => {
            // Mock setTimeout to not execute immediately
            const originalSetTimeout = global.setTimeout;
            global.setTimeout = jest.fn((callback, delay) => {
                return 1;
            }) as any;

            const system = new RoutingFeedbackSystem();

            // Add some indicators and history
            const handles = [
                createMockHandle("h1", "node1", "right", "source"),
            ];
            system.highlightSelectedHandles(handles);

            const decision = createMockRoutingDecision();
            system.displayRoutingDecision(decision);

            const stats = system.getStatistics();

            expect(stats.activeIndicators).toBeGreaterThan(0);
            expect(stats.historySize).toBe(1);
            expect(stats.indicatorTypes).toHaveProperty("handle-highlight");

            // Restore original setTimeout
            global.setTimeout = originalSetTimeout;
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty handle arrays", () => {
            const system = new RoutingFeedbackSystem();

            expect(() => {
                system.highlightSelectedHandles([]);
            }).not.toThrow();
        });

        it("should handle null DOM elements gracefully", () => {
            mockDocument.querySelector.mockReturnValue(null as any);

            const system = new RoutingFeedbackSystem();
            const handles = [
                createMockHandle("h1", "node1", "right", "source"),
            ];

            expect(() => {
                system.highlightSelectedHandles(handles);
            }).not.toThrow();
        });

        it("should handle missing DOM methods gracefully", () => {
            const originalCreateElement = mockDocument.createElement;
            mockDocument.createElement.mockImplementation(() => {
                throw new Error("DOM not available");
            });

            const system = new RoutingFeedbackSystem({
                enableVisualIndicators: true,
                enableConsoleLogging: true,
            });
            const decision = createMockRoutingDecision();

            expect(() => {
                system.displayRoutingDecision(decision);
            }).not.toThrow();

            // Should still log the decision even if visual indicators fail
            expect(mockConsole.info).toHaveBeenCalledWith(
                "🛣️ Routing Decision:",
                expect.any(Object)
            );

            // Should log the warning about failed indicator creation
            expect(mockConsole.warn).toHaveBeenCalledWith(
                "Failed to create routing decision indicator:",
                expect.any(Error)
            );

            // Restore original method
            mockDocument.createElement.mockImplementation(
                originalCreateElement
            );
        });
    });
});
