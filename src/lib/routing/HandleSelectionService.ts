/**
 * Handle Selection Service for orthogonal edge routing
 *
 * This service intelligently selects optimal source and target handles
 * using Manhattan distance calculations and efficiency metrics.
 */

import {
    Point,
    HandleInfo,
    NodeInfo,
    HandleCombination,
    OrthogonalPath,
} from "./types";
import {
    calculateHandleManhattanDistance,
    calculateRoutingEfficiency,
} from "./distance";

export interface HandleEvaluation {
    combination: HandleCombination;
    score: number;
    reason: string;
}

export class HandleSelectionService {
    /**
     * Find the optimal handle combination between source and target nodes
     * Uses Manhattan distance as the primary optimization criterion
     */
    findOptimalHandles(
        sourceNode: NodeInfo,
        targetNode: NodeInfo,
        targetPosition?: Point
    ): HandleCombination {
        const allCombinations = this.getAllHandleCombinations(
            sourceNode,
            targetNode
        );

        if (allCombinations.length === 0) {
            throw new Error("No valid handle combinations found between nodes");
        }

        const sortedCombinations = allCombinations.sort((a, b) => {
            if (a.manhattanDistance !== b.manhattanDistance) {
                return a.manhattanDistance - b.manhattanDistance;
            }

            if (a.efficiency !== b.efficiency) {
                return a.efficiency - b.efficiency;
            }

            if (a.routingType !== b.routingType) {
                return a.routingType === "horizontal-first" ? -1 : 1;
            }

            const handleOrder = { top: 0, right: 1, bottom: 2, left: 3 };
            const sourceOrder =
                handleOrder[a.sourceHandle.side] -
                handleOrder[b.sourceHandle.side];
            if (sourceOrder !== 0) return sourceOrder;

            return (
                handleOrder[a.targetHandle.side] -
                handleOrder[b.targetHandle.side]
            );
        });

        return sortedCombinations[0];
    }

    /**
     * Calculate Manhattan distance between two handles
     */
    calculateManhattanDistance(
        sourceHandle: HandleInfo,
        targetHandle: HandleInfo
    ): number {
        return calculateHandleManhattanDistance(sourceHandle, targetHandle);
    }

    /**
     * Evaluate a specific handle combination for routing efficiency
     */
    evaluateHandleCombination(
        sourceHandle: HandleInfo,
        targetHandle: HandleInfo
    ): HandleEvaluation {
        const manhattanDistance = this.calculateManhattanDistance(
            sourceHandle,
            targetHandle
        );
        const efficiency = calculateRoutingEfficiency(
            sourceHandle.position,
            targetHandle.position
        );

        const routingType = this.determinePreferredRoutingType(
            sourceHandle,
            targetHandle
        );

        const combination: HandleCombination = {
            sourceHandle,
            targetHandle,
            manhattanDistance,
            pathLength: manhattanDistance,
            efficiency,
            routingType,
        };

        const score = manhattanDistance + efficiency * 10;

        const reason = this.generateEvaluationReason(combination, score);

        return {
            combination,
            score,
            reason,
        };
    }

    /**
     * Get all possible handle combinations between two nodes
     */
    getAllHandleCombinations(
        sourceNode: NodeInfo,
        targetNode: NodeInfo
    ): HandleCombination[] {
        const combinations: HandleCombination[] = [];

        const sourceHandles = sourceNode.handles.filter(
            (h) => h.type === "source"
        );

        const targetHandles = targetNode.handles.filter(
            (h) => h.type === "target"
        );

        for (const sourceHandle of sourceHandles) {
            for (const targetHandle of targetHandles) {
                const evaluation = this.evaluateHandleCombination(
                    sourceHandle,
                    targetHandle
                );
                combinations.push(evaluation.combination);
            }
        }

        return combinations;
    }

    /**
     * Determine the preferred routing type based on handle positions and orientations
     */
    private determinePreferredRoutingType(
        sourceHandle: HandleInfo,
        targetHandle: HandleInfo
    ): "horizontal-first" | "vertical-first" {
        const dx = Math.abs(targetHandle.position.x - sourceHandle.position.x);
        const dy = Math.abs(targetHandle.position.y - sourceHandle.position.y);

        if (dx > dy) {
            return "horizontal-first";
        }

        if (dy > dx) {
            return "vertical-first";
        }

        const sourceIsHorizontal =
            sourceHandle.side === "left" || sourceHandle.side === "right";
        const targetIsHorizontal =
            targetHandle.side === "left" || targetHandle.side === "right";

        if (sourceIsHorizontal && targetIsHorizontal) {
            return "horizontal-first";
        }

        if (!sourceIsHorizontal && !targetIsHorizontal) {
            return "vertical-first";
        }

        return "horizontal-first";
    }

    /**
     * Generate a human-readable reason for the handle evaluation
     */
    private generateEvaluationReason(
        combination: HandleCombination,
        score: number
    ): string {
        const {
            sourceHandle,
            targetHandle,
            manhattanDistance,
            efficiency,
            routingType,
        } = combination;

        return (
            `${sourceHandle.side}-to-${targetHandle.side} connection: ` +
            `Manhattan distance ${manhattanDistance}, ` +
            `efficiency ${efficiency.toFixed(2)}, ` +
            `${routingType} routing, ` +
            `score ${score.toFixed(2)}`
        );
    }

    /**
     * Find the best handle combination for a specific target position during drag operations
     */
    findOptimalHandlesForPosition(
        sourceNode: NodeInfo,
        targetPosition: Point
    ): HandleInfo | null {
        const sourceHandles = sourceNode.handles.filter(
            (h) => h.type === "source"
        );

        if (sourceHandles.length === 0) {
            return null;
        }

        let bestHandle = sourceHandles[0];
        let bestDistance = calculateHandleManhattanDistance(bestHandle, {
            id: "temp",
            nodeId: "temp",
            position: targetPosition,
            side: "top",
            type: "target",
        });

        for (const handle of sourceHandles) {
            const distance = calculateHandleManhattanDistance(handle, {
                id: "temp",
                nodeId: "temp",
                position: targetPosition,
                side: "top",
                type: "target",
            });

            if (distance < bestDistance) {
                bestDistance = distance;
                bestHandle = handle;
            }
        }

        return bestHandle;
    }
}
