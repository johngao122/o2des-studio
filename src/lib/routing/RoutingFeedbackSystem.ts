/**
 * Routing Feedback System for providing visual and logging feedback
 * about orthogonal routing decisions and metrics
 */

import { HandleInfo, RoutingMetrics, OrthogonalPath } from "./types";
import { RoutingComparison } from "./OrthogonalRoutingEngine";

export interface RoutingDecision {
    selectedPath: OrthogonalPath;
    alternativePath: OrthogonalPath;
    reason: string;
    efficiency: number;
    timestamp: number;
}

export interface FeedbackOptions {
    enableConsoleLogging?: boolean;
    enableVisualIndicators?: boolean;
    logLevel?: "debug" | "info" | "warn" | "error";
    visualIndicatorDuration?: number;
}

export interface VisualIndicator {
    id: string;
    type: "handle-highlight" | "path-preview" | "routing-decision";
    element: HTMLElement | null;
    data: any;
    timestamp: number;
}

/**
 * Central system for providing feedback about routing decisions
 */
export class RoutingFeedbackSystem {
    private options: Required<FeedbackOptions>;
    private activeIndicators: Map<string, VisualIndicator> = new Map();
    private routingHistory: RoutingDecision[] = [];
    private readonly maxHistorySize = 100;

    constructor(options: FeedbackOptions = {}) {
        this.options = {
            enableConsoleLogging: options.enableConsoleLogging ?? true,
            enableVisualIndicators: options.enableVisualIndicators ?? true,
            logLevel: options.logLevel ?? "info",
            visualIndicatorDuration: options.visualIndicatorDuration ?? 3000,
        };
    }

    /**
     * Display routing decision information
     */
    displayRoutingDecision(decision: RoutingDecision): void {
        this.addToHistory(decision);

        if (this.options.enableConsoleLogging) {
            this.logRoutingDecision(decision);
        }

        if (this.options.enableVisualIndicators) {
            this.showRoutingDecisionIndicator(decision);
        }
    }

    /**
     * Highlight selected handles during edge creation
     */
    highlightSelectedHandles(handles: HandleInfo[]): void {
        if (!this.options.enableVisualIndicators) return;

        this.clearIndicatorsByType("handle-highlight");

        handles.forEach((handle, index) => {
            const indicatorId = `handle-highlight-${handle.nodeId}-${
                handle.id
            }-${Date.now()}-${index}`;

            const indicator: VisualIndicator = {
                id: indicatorId,
                type: "handle-highlight",
                element: this.findHandleElement(handle),
                data: { handle },
                timestamp: Date.now(),
            };

            this.activeIndicators.set(indicatorId, indicator);
            this.applyHandleHighlight(indicator);
        });

        if (this.options.enableConsoleLogging) {
            this.logHandleSelection(handles);
        }

        setTimeout(() => {
            this.clearIndicatorsByType("handle-highlight");
        }, this.options.visualIndicatorDuration);
    }

    /**
     * Log routing metrics to console
     */
    logRoutingMetrics(metrics: RoutingMetrics): void {
        if (!this.options.enableConsoleLogging) return;

        const logData = {
            timestamp: new Date().toISOString(),
            pathLength: metrics.pathLength,
            segmentCount: metrics.segmentCount,
            routingType: metrics.routingType,
            efficiency: metrics.efficiency,
            handleCombination: metrics.handleCombination,
        };

        switch (this.options.logLevel) {
            case "debug":
                console.debug("🔍 Routing Metrics:", logData);
                break;
            case "info":
                console.info("📊 Routing Metrics:", logData);
                break;
            case "warn":
                console.warn("⚠️ Routing Metrics:", logData);
                break;
            case "error":
                console.error("❌ Routing Metrics:", logData);
                break;
        }
    }

    /**
     * Show path comparison information
     */
    showPathComparison(comparison: RoutingComparison): void {
        const decision: RoutingDecision = {
            selectedPath: comparison.selectedPath,
            alternativePath: comparison.alternativePath,
            reason: comparison.reason,
            efficiency: comparison.efficiency,
            timestamp: Date.now(),
        };

        this.displayRoutingDecision(decision);

        if (this.options.enableVisualIndicators) {
            this.showPathComparisonIndicator(comparison);
        }
    }

    /**
     * Clear all active visual indicators
     */
    clearAllIndicators(): void {
        this.activeIndicators.forEach((indicator) => {
            this.removeVisualIndicator(indicator);
        });
        this.activeIndicators.clear();
    }

    /**
     * Clear indicators of a specific type
     */
    clearIndicatorsByType(type: VisualIndicator["type"]): void {
        const indicatorsToRemove: string[] = [];

        this.activeIndicators.forEach((indicator, id) => {
            if (indicator.type === type) {
                this.removeVisualIndicator(indicator);
                indicatorsToRemove.push(id);
            }
        });

        indicatorsToRemove.forEach((id) => {
            this.activeIndicators.delete(id);
        });
    }

    /**
     * Get routing history
     */
    getRoutingHistory(): RoutingDecision[] {
        return [...this.routingHistory];
    }

    /**
     * Get current feedback options
     */
    getOptions(): Required<FeedbackOptions> {
        return { ...this.options };
    }

    /**
     * Update feedback options
     */
    updateOptions(newOptions: Partial<FeedbackOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Get statistics about feedback system usage
     */
    getStatistics(): {
        activeIndicators: number;
        historySize: number;
        indicatorTypes: Record<string, number>;
    } {
        const indicatorTypes: Record<string, number> = {};

        this.activeIndicators.forEach((indicator) => {
            indicatorTypes[indicator.type] =
                (indicatorTypes[indicator.type] || 0) + 1;
        });

        return {
            activeIndicators: this.activeIndicators.size,
            historySize: this.routingHistory.length,
            indicatorTypes,
        };
    }

    /**
     * Add routing decision to history
     */
    private addToHistory(decision: RoutingDecision): void {
        this.routingHistory.push(decision);

        if (this.routingHistory.length > this.maxHistorySize) {
            this.routingHistory.shift();
        }
    }

    /**
     * Log routing decision to console
     */
    private logRoutingDecision(decision: RoutingDecision): void {
        const logData = {
            timestamp: new Date(decision.timestamp).toISOString(),
            selectedRouting: decision.selectedPath.routingType,
            selectedLength: decision.selectedPath.totalLength,
            alternativeRouting: decision.alternativePath.routingType,
            alternativeLength: decision.alternativePath.totalLength,
            reason: decision.reason,
            efficiency: decision.efficiency,
        };

        console.info("🛣️ Routing Decision:", logData);
    }

    /**
     * Log handle selection to console
     */
    private logHandleSelection(handles: HandleInfo[]): void {
        const logData = handles.map((handle) => ({
            nodeId: handle.nodeId,
            handleId: handle.id,
            side: handle.side,
            type: handle.type,
            position: handle.position,
        }));

        console.info("🎯 Handle Selection:", logData);
    }

    /**
     * Show visual indicator for routing decision
     */
    private showRoutingDecisionIndicator(decision: RoutingDecision): void {
        try {
            const indicatorId = `routing-decision-${Date.now()}`;

            const indicator: VisualIndicator = {
                id: indicatorId,
                type: "routing-decision",
                element: this.createRoutingDecisionElement(decision),
                data: { decision },
                timestamp: Date.now(),
            };

            this.activeIndicators.set(indicatorId, indicator);

            setTimeout(() => {
                this.removeVisualIndicator(indicator);
                this.activeIndicators.delete(indicatorId);
            }, this.options.visualIndicatorDuration);
        } catch (error) {
            if (this.options.enableConsoleLogging) {
                console.warn(
                    "Failed to create routing decision indicator:",
                    error
                );
            }
        }
    }

    /**
     * Show visual indicator for path comparison
     */
    private showPathComparisonIndicator(comparison: RoutingComparison): void {
        try {
            const indicatorId = `path-comparison-${Date.now()}`;

            const indicator: VisualIndicator = {
                id: indicatorId,
                type: "path-preview",
                element: this.createPathComparisonElement(comparison),
                data: { comparison },
                timestamp: Date.now(),
            };

            this.activeIndicators.set(indicatorId, indicator);

            setTimeout(() => {
                this.removeVisualIndicator(indicator);
                this.activeIndicators.delete(indicatorId);
            }, this.options.visualIndicatorDuration);
        } catch (error) {
            if (this.options.enableConsoleLogging) {
                console.warn(
                    "Failed to create path comparison indicator:",
                    error
                );
            }
        }
    }

    /**
     * Find DOM element for a handle (placeholder implementation)
     */
    private findHandleElement(handle: HandleInfo): HTMLElement | null {
        const selector = `[data-handleid="${handle.id}"][data-nodeid="${handle.nodeId}"]`;
        return document.querySelector(selector);
    }

    /**
     * Apply visual highlight to a handle
     */
    private applyHandleHighlight(indicator: VisualIndicator): void {
        if (!indicator.element) return;

        indicator.element.classList.add("routing-handle-highlight");
        indicator.element.style.boxShadow =
            "0 0 8px 2px rgba(59, 130, 246, 0.8)";
        indicator.element.style.borderColor = "#3b82f6";
        indicator.element.style.borderWidth = "2px";
    }

    /**
     * Create DOM element for routing decision indicator
     */
    private createRoutingDecisionElement(
        decision: RoutingDecision
    ): HTMLElement {
        const element = document.createElement("div");
        element.className = "routing-decision-indicator";
        element.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-family: monospace;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        element.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 4px;">
                🛣️ ${decision.selectedPath.routingType.toUpperCase()}
            </div>
            <div style="font-size: 11px; opacity: 0.9;">
                ${decision.reason}
            </div>
            <div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">
                Length: ${decision.selectedPath.totalLength.toFixed(1)}px
            </div>
        `;

        document.body.appendChild(element);
        return element;
    }

    /**
     * Create DOM element for path comparison indicator
     */
    private createPathComparisonElement(
        comparison: RoutingComparison
    ): HTMLElement {
        const element = document.createElement("div");
        element.className = "path-comparison-indicator";
        element.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 11px;
            font-family: monospace;
            z-index: 10000;
            max-width: 280px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `;

        const lengthDiff = Math.abs(
            comparison.selectedPath.totalLength -
                comparison.alternativePath.totalLength
        );

        element.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 2px;">
                📊 Path Comparison
            </div>
            <div style="font-size: 10px;">
                Selected: ${comparison.selectedPath.totalLength.toFixed(
                    1
                )}px<br>
                Alternative: ${comparison.alternativePath.totalLength.toFixed(
                    1
                )}px<br>
                Difference: ${lengthDiff.toFixed(1)}px
            </div>
        `;

        document.body.appendChild(element);
        return element;
    }

    /**
     * Remove a visual indicator from the DOM
     */
    private removeVisualIndicator(indicator: VisualIndicator): void {
        if (indicator.element) {
            if (indicator.type === "handle-highlight") {
                indicator.element.classList.remove("routing-handle-highlight");
                indicator.element.style.boxShadow = "";
                indicator.element.style.borderColor = "";
                indicator.element.style.borderWidth = "";
            } else {
                indicator.element.remove();
            }
        }
    }
}

/**
 * Default instance for global use
 */
export const routingFeedbackSystem = new RoutingFeedbackSystem();
