/**
 * Edge Utilities
 *
 * This module provides utilities for edge creation and dependency detection.
 */

import { BaseNode } from "@/types/base";
import { getHandleSide } from "./nodeHandles";

/**
 * Determines if a connection should be automatically created as a dependency edge
 *
 * Dependency criteria:
 * 1. Both source and target nodes must be of type "activity"
 * 2. Both source and target handles must be top or bottom handles
 *
 * @param sourceNode - The source node of the connection
 * @param targetNode - The target node of the connection
 * @param sourceHandle - The source handle ID
 * @param targetHandle - The target handle ID
 * @returns true if the connection should be a dependency edge, false otherwise
 */
export function isDependencyConnection(
    sourceNode: BaseNode | undefined,
    targetNode: BaseNode | undefined,
    sourceHandle: string | null | undefined,
    targetHandle: string | null | undefined
): boolean {
    if (sourceNode?.type !== "activity" || targetNode?.type !== "activity") {
        return false;
    }

    const sourceSide = getHandleSide(sourceHandle);
    const targetSide = getHandleSide(targetHandle);

    return (
        (sourceSide === "top" || sourceSide === "bottom") &&
        (targetSide === "top" || targetSide === "bottom")
    );
}
