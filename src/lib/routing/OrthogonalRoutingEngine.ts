/**
 * Orthogonal Routing Engine for calculating optimal orthogonal paths between node handles
 */

import {
    HandleInfo,
    NodeBounds,
    OrthogonalPath,
    ControlPoint,
    RoutingMetrics,
} from "./types";
import {
    generateControlPoints,
    createOrthogonalPath,
    compareOrthogonalPaths,
} from "./pathGeneration";

export interface RoutingComparison {
    selectedPath: OrthogonalPath;
    alternativePath: OrthogonalPath;
    reason: string;
    efficiency: number;
}

export interface RoutingOptions {
    avoidObstacles?: boolean;
    obstacles?: NodeBounds[];
    preferredRouting?: "horizontal-first" | "vertical-first";
}

/**
 * Core engine for calculating orthogonal paths between node handles
 */
export class OrthogonalRoutingEngine {
    private pathCache: Map<string, OrthogonalPath> = new Map();

    /**
     * Calculate the optimal orthogonal path between two handles
     */
    calculateOrthogonalPath(
        sourceHandle: HandleInfo,
        targetHandle: HandleInfo,
        options: RoutingOptions = {}
    ): OrthogonalPath {
        const cacheKey = this.generateCacheKey(
            sourceHandle,
            targetHandle,
            options
        );

        if (this.pathCache.has(cacheKey)) {
            return this.pathCache.get(cacheKey)!;
        }

        const horizontalFirstPath = createOrthogonalPath(
            sourceHandle,
            targetHandle,
            "horizontal-first"
        );

        const verticalFirstPath = createOrthogonalPath(
            sourceHandle,
            targetHandle,
            "vertical-first"
        );

        const optimalPath = this.selectOptimalPath(
            horizontalFirstPath,
            verticalFirstPath,
            options
        );

        this.pathCache.set(cacheKey, optimalPath);

        return optimalPath;
    }

    /**
     * Compare routing options and return comparison details
     */
    compareRoutingOptions(
        horizontalFirst: OrthogonalPath,
        verticalFirst: OrthogonalPath
    ): RoutingComparison {
        const selectedPath = compareOrthogonalPaths(
            horizontalFirst,
            verticalFirst
        );
        const alternativePath =
            selectedPath === horizontalFirst ? verticalFirst : horizontalFirst;

        let reason: string;
        if (horizontalFirst.totalLength < verticalFirst.totalLength) {
            reason = `Horizontal-first routing selected: shorter path (${horizontalFirst.totalLength} vs ${verticalFirst.totalLength})`;
        } else if (verticalFirst.totalLength < horizontalFirst.totalLength) {
            reason = `Vertical-first routing selected: shorter path (${verticalFirst.totalLength} vs ${horizontalFirst.totalLength})`;
        } else {
            reason = `Horizontal-first routing selected: equal path lengths, using tie-breaker rule`;
        }

        return {
            selectedPath,
            alternativePath,
            reason,
            efficiency: selectedPath.efficiency,
        };
    }

    /**
     * Generate control points from an orthogonal path
     */
    generateControlPoints(path: OrthogonalPath): ControlPoint[] {
        return generateControlPoints(path.segments);
    }

    /**
     * Calculate routing metrics for a path
     */
    calculateRoutingMetrics(
        path: OrthogonalPath,
        sourceHandle: HandleInfo,
        targetHandle: HandleInfo
    ): RoutingMetrics {
        return {
            pathLength: path.totalLength,
            segmentCount: path.segments.length,
            routingType: path.routingType,
            efficiency: path.efficiency,
            handleCombination: `${sourceHandle.nodeId}:${sourceHandle.side} -> ${targetHandle.nodeId}:${targetHandle.side}`,
        };
    }

    /**
     * Calculate orthogonal path using React Flow edge coordinates
     */
    calculateOrthogonalPathFromEdgeCoordinates(
        sourceX: number,
        sourceY: number,
        targetX: number,
        targetY: number,
        sourcePosition?: string,
        targetPosition?: string,
        options: RoutingOptions = {}
    ): OrthogonalPath {
        const sourceHandle: HandleInfo = {
            id: "source",
            nodeId: "source",
            position: { x: sourceX, y: sourceY },
            side: this.positionToSide(sourcePosition || "right"),
            type: "source",
        };

        const targetHandle: HandleInfo = {
            id: "target",
            nodeId: "target",
            position: { x: targetX, y: targetY },
            side: this.positionToSide(targetPosition || "left"),
            type: "target",
        };

        return this.calculateOrthogonalPath(
            sourceHandle,
            targetHandle,
            options
        );
    }

    /**
     * Calculate orthogonal path with obstacle avoidance (basic implementation)
     */
    calculatePathWithObstacles(
        sourceHandle: HandleInfo,
        targetHandle: HandleInfo,
        obstacles: NodeBounds[]
    ): OrthogonalPath {
        return this.calculateOrthogonalPath(sourceHandle, targetHandle, {
            avoidObstacles: true,
            obstacles,
        });
    }

    /**
     * Clear the path cache
     */
    clearCache(): void {
        this.pathCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.pathCache.size,
            keys: Array.from(this.pathCache.keys()),
        };
    }

    /**
     * Select the optimal path based on options and comparison
     */
    private selectOptimalPath(
        horizontalFirst: OrthogonalPath,
        verticalFirst: OrthogonalPath,
        options: RoutingOptions
    ): OrthogonalPath {
        if (options.preferredRouting) {
            const preferred =
                options.preferredRouting === "horizontal-first"
                    ? horizontalFirst
                    : verticalFirst;
            const alternative =
                options.preferredRouting === "horizontal-first"
                    ? verticalFirst
                    : horizontalFirst;

            const efficiencyThreshold = 0.2;
            const lengthDifference =
                (preferred.totalLength - alternative.totalLength) /
                alternative.totalLength;

            if (lengthDifference <= efficiencyThreshold) {
                return preferred;
            }
        }

        return compareOrthogonalPaths(horizontalFirst, verticalFirst);
    }

    /**
     * Convert React Flow position to handle side
     */
    private positionToSide(
        position: string
    ): "left" | "right" | "top" | "bottom" {
        switch (position) {
            case "left":
                return "left";
            case "right":
                return "right";
            case "top":
                return "top";
            case "bottom":
                return "bottom";
            default:
                return "right";
        }
    }

    /**
     * Generate cache key for path memoization
     */
    private generateCacheKey(
        sourceHandle: HandleInfo,
        targetHandle: HandleInfo,
        options: RoutingOptions
    ): string {
        const sourceKey = `${sourceHandle.nodeId}:${sourceHandle.side}:${sourceHandle.position.x},${sourceHandle.position.y}`;
        const targetKey = `${targetHandle.nodeId}:${targetHandle.side}:${targetHandle.position.x},${targetHandle.position.y}`;
        const optionsKey = JSON.stringify(options);

        return `${sourceKey}->${targetKey}|${optionsKey}`;
    }
}

/**
 * Default instance for global use
 */
export const orthogonalRoutingEngine = new OrthogonalRoutingEngine();
