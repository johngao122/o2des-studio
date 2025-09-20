/**
 * Node Handle Extraction Utilities
 *
 * This module provides functions to extract handle information (IDs and coordinates)
 * from different node types. It replicates the exact logic used in each node component
 * for consistent handle positioning and ID generation.
 */

import { BaseNode } from "@/types/base";
import {
    getGridAlignedHandlePositions,
    getArrowHandlePositions,
    getPillHandlePositions,
    getStandardHandlePositions,
    HANDLE_RADIUS,
} from "./math";

/**
 * Interface representing a node handle with its ID, coordinates, and metadata
 */
export interface NodeHandleInfo {
    id: string;
    coordinates: { x: number; y: number };
    side: "top" | "right" | "bottom" | "left";
    type: "source" | "target";
    nodeId: string;
}

/**
 * Interface for node dimensions
 */
export interface NodeDimensions {
    width: number;
    height: number;
}

/**
 * Interface for node position
 */
export interface NodePosition {
    x: number;
    y: number;
}

/**
 * Interface for parsed handle ID components
 */
export interface ParsedHandleId {
    nodeId: string;
    side: "top" | "right" | "bottom" | "left";
    index: number;
}

/**
 * Parse a handle ID to extract nodeId, side, and index
 * Handles node IDs that contain hyphens and special corner handle naming
 */
function parseHandleId(handleId: string): ParsedHandleId | null {
    if (typeof handleId !== "string" || !handleId) {
        return null;
    }

    const sides: Array<"top" | "right" | "bottom" | "left"> = [
        "top",
        "right",
        "bottom",
        "left",
    ];

    const cornerPatterns = [
        { pattern: "-top-left-", side: "top" as const },
        { pattern: "-top-right-", side: "top" as const },
        { pattern: "-bottom-left-", side: "bottom" as const },
        { pattern: "-bottom-right-", side: "bottom" as const },
    ];

    for (const { pattern, side } of cornerPatterns) {
        const patternIndex = handleId.lastIndexOf(pattern);
        if (patternIndex !== -1) {
            const nodeId = handleId.substring(0, patternIndex);
            const indexPart = handleId.substring(patternIndex + pattern.length);
            const index = parseInt(indexPart, 10);

            if (!isNaN(index)) {
                return { nodeId, side, index };
            }
        }
    }

    for (const side of sides) {
        const sidePattern = `-${side}-`;
        const sideIndex = handleId.lastIndexOf(sidePattern);
        if (sideIndex !== -1) {
            const nodeId = handleId.substring(0, sideIndex);
            const indexPart = handleId.substring(
                sideIndex + sidePattern.length
            );
            const index = parseInt(indexPart, 10);

            if (!isNaN(index)) {
                return { nodeId, side, index };
            }
        }
    }

    return null;
}

/**
 * Extract handle information for Activity nodes
 * Replicates the exact logic from ActivityNode.tsx including special naming for corner handles
 */
export function getActivityNodeHandles(
    nodeId: string,
    nodePosition: NodePosition,
    dimensions: NodeDimensions,
    headerHeight: number = 35
): NodeHandleInfo[] {
    const handlePositions = getGridAlignedHandlePositions(
        dimensions.width,
        dimensions.height,
        headerHeight
    );

    const handles: NodeHandleInfo[] = [];

    handlePositions.top.forEach((leftPos, index) => {
        let handleId = `${nodeId}-top-${index}`;
        if (index === 0) {
            handleId = `${nodeId}-top-left-${index}`;
        } else if (index === handlePositions.top.length - 1) {
            handleId = `${nodeId}-top-right-${index}`;
        }

        handles.push({
            id: handleId,
            coordinates: {
                x: nodePosition.x + leftPos,
                y: nodePosition.y + headerHeight + HANDLE_RADIUS,
            },
            side: "top",
            type: "source",
            nodeId,
        });
    });

    handlePositions.right.forEach((topPos, index) => {
        handles.push({
            id: `${nodeId}-right-${index}`,
            coordinates: {
                x: nodePosition.x + dimensions.width - HANDLE_RADIUS,
                y: nodePosition.y + topPos,
            },
            side: "right",
            type: "source",
            nodeId,
        });
    });

    handlePositions.bottom.forEach((leftPos, index) => {
        let handleId = `${nodeId}-bottom-${index}`;
        if (index === 0) {
            handleId = `${nodeId}-bottom-right-${index}`;
        } else if (index === handlePositions.bottom.length - 1) {
            handleId = `${nodeId}-bottom-left-${index}`;
        }

        handles.push({
            id: handleId,
            coordinates: {
                x: nodePosition.x + leftPos,
                y: nodePosition.y + headerHeight + dimensions.height - HANDLE_RADIUS,
            },
            side: "bottom",
            type: "source",
            nodeId,
        });
    });

    handlePositions.left.forEach((topPos, index) => {
        handles.push({
            id: `${nodeId}-left-${index}`,
            coordinates: {
                x: nodePosition.x + HANDLE_RADIUS,
                y: nodePosition.y + topPos,
            },
            side: "left",
            type: "target",
            nodeId,
        });
    });

    return handles;
}

/**
 * Extract handle information for Generator (Arrow) nodes
 * Replicates the exact logic from GeneratorNode.tsx using arrow handle positions
 */
export function getGeneratorNodeHandles(
    nodeId: string,
    nodePosition: NodePosition,
    dimensions: NodeDimensions
): NodeHandleInfo[] {
    const arrowHandles = getArrowHandlePositions(
        dimensions.width,
        dimensions.height
    );

    const handles: NodeHandleInfo[] = [];

    arrowHandles.top.forEach((handle, index) => {
        handles.push({
            id: `${nodeId}-top-${index}`,
            coordinates: {
                x: nodePosition.x + handle.x,
                y: nodePosition.y + handle.y,
            },
            side: "top",
            type: "source",
            nodeId,
        });
    });

    arrowHandles.right.forEach((handle, index) => {
        handles.push({
            id: `${nodeId}-right-${index}`,
            coordinates: {
                x: nodePosition.x + handle.x,
                y: nodePosition.y + handle.y,
            },
            side: "right",
            type: "source",
            nodeId,
        });
    });

    arrowHandles.bottom.forEach((handle, index) => {
        handles.push({
            id: `${nodeId}-bottom-${index}`,
            coordinates: {
                x: nodePosition.x + handle.x,
                y: nodePosition.y + handle.y,
            },
            side: "bottom",
            type: "source",
            nodeId,
        });
    });

    arrowHandles.left.forEach((handle, index) => {
        handles.push({
            id: `${nodeId}-left-${index}`,
            coordinates: {
                x: nodePosition.x + handle.x,
                y: nodePosition.y + handle.y,
            },
            side: "left",
            type: "source",
            nodeId,
        });
    });

    return handles;
}

/**
 * Extract handle information for Terminator (Pill) nodes
 * Replicates the exact logic from TerminatorNode.tsx using pill handle positions
 */
export function getTerminatorNodeHandles(
    nodeId: string,
    nodePosition: NodePosition,
    dimensions: NodeDimensions
): NodeHandleInfo[] {
    const pillHandles = getPillHandlePositions(
        dimensions.width,
        dimensions.height
    );

    const handles: NodeHandleInfo[] = [];

    pillHandles.top.forEach((handle, index) => {
        handles.push({
            id: `${nodeId}-top-${index}`,
            coordinates: {
                x: nodePosition.x + handle.x,
                y: nodePosition.y + handle.y,
            },
            side: "top",
            type: "source",
            nodeId,
        });
    });

    pillHandles.right.forEach((handle, index) => {
        handles.push({
            id: `${nodeId}-right-${index}`,
            coordinates: {
                x: nodePosition.x + handle.x,
                y: nodePosition.y + handle.y,
            },
            side: "right",
            type: "source",
            nodeId,
        });
    });

    pillHandles.bottom.forEach((handle, index) => {
        handles.push({
            id: `${nodeId}-bottom-${index}`,
            coordinates: {
                x: nodePosition.x + handle.x,
                y: nodePosition.y + handle.y,
            },
            side: "bottom",
            type: "source",
            nodeId,
        });
    });

    pillHandles.left.forEach((handle, index) => {
        handles.push({
            id: `${nodeId}-left-${index}`,
            coordinates: {
                x: nodePosition.x + handle.x,
                y: nodePosition.y + handle.y,
            },
            side: "left",
            type: "source",
            nodeId,
        });
    });

    return handles;
}

/**
 * Extract handle information for Event nodes
 * Replicates the exact logic from EventNode.tsx using standard handle positions
 */
export function getEventNodeHandles(
    nodeId: string,
    nodePosition: NodePosition,
    dimensions: NodeDimensions
): NodeHandleInfo[] {
    const handlePositions = getStandardHandlePositions(
        dimensions.width,
        dimensions.height
    );

    const handles: NodeHandleInfo[] = [];

    handlePositions.horizontal.slice(1, -1).forEach((leftPos, index) => {
        handles.push({
            id: `${nodeId}-top-${index}`,
            coordinates: {
                x: nodePosition.x + leftPos,
                y: nodePosition.y + 5,
            },
            side: "top",
            type: "source",
            nodeId,
        });
    });

    handlePositions.vertical.forEach((topPos, index) => {
        handles.push({
            id: `${nodeId}-right-${index}`,
            coordinates: {
                x: nodePosition.x + dimensions.width - 10,
                y: nodePosition.y + topPos - 10,
            },
            side: "right",
            type: "source",
            nodeId,
        });
    });

    handlePositions.horizontal.slice(1, -1).forEach((leftPos, index) => {
        handles.push({
            id: `${nodeId}-bottom-${index}`,
            coordinates: {
                x: nodePosition.x + leftPos,
                y: nodePosition.y + dimensions.height - 10,
            },
            side: "bottom",
            type: "source",
            nodeId,
        });
    });

    handlePositions.vertical.forEach((topPos, index) => {
        handles.push({
            id: `${nodeId}-left-${index}`,
            coordinates: {
                x: nodePosition.x + 5,
                y: nodePosition.y + topPos - 10,
            },
            side: "left",
            type: "target",
            nodeId,
        });
    });

    return handles;
}

/**
 * Extract handle information for Initialization nodes
 * Mirrors ActivityNode grid-aligned handle distribution with zero header offset
 */
export function getInitializationNodeHandles(
    nodeId: string,
    nodePosition: NodePosition,
    dimensions: NodeDimensions
): NodeHandleInfo[] {
    const headerHeight = 0;
    const handlePositions = getGridAlignedHandlePositions(
        dimensions.width,
        dimensions.height,
        headerHeight
    );

    const handles: NodeHandleInfo[] = [];

    handlePositions.top.forEach((leftPos, index) => {
        let handleId = `${nodeId}-top-${index}`;
        if (index === 0) {
            handleId = `${nodeId}-top-left-${index}`;
        } else if (index === handlePositions.top.length - 1) {
            handleId = `${nodeId}-top-right-${index}`;
        }

        handles.push({
            id: handleId,
            coordinates: {
                x: nodePosition.x + leftPos,
                y: nodePosition.y + headerHeight + HANDLE_RADIUS,
            },
            side: "top",
            type: "source",
            nodeId,
        });
    });

    handlePositions.right.forEach((topPos, index) => {
        handles.push({
            id: `${nodeId}-right-${index}`,
            coordinates: {
                x: nodePosition.x + dimensions.width - HANDLE_RADIUS,
                y: nodePosition.y + topPos,
            },
            side: "right",
            type: "source",
            nodeId,
        });
    });

    handlePositions.bottom.forEach((leftPos, index) => {
        let handleId = `${nodeId}-bottom-${index}`;
        if (index === 0) {
            handleId = `${nodeId}-bottom-right-${index}`;
        } else if (index === handlePositions.bottom.length - 1) {
            handleId = `${nodeId}-bottom-left-${index}`;
        }

        handles.push({
            id: handleId,
            coordinates: {
                x: nodePosition.x + leftPos,
                y: nodePosition.y + headerHeight + dimensions.height - HANDLE_RADIUS,
            },
            side: "bottom",
            type: "source",
            nodeId,
        });
    });

    handlePositions.left.forEach((topPos, index) => {
        handles.push({
            id: `${nodeId}-left-${index}`,
            coordinates: {
                x: nodePosition.x + HANDLE_RADIUS,
                y: nodePosition.y + topPos,
            },
            side: "left",
            type: "target",
            nodeId,
        });
    });

    return handles;
}

/**
 * Extract handle information for Global nodes
 * Uses the same logic as ActivityNode (getGridAlignedHandlePositions)
 */
export function getGlobalNodeHandles(
    nodeId: string,
    nodePosition: NodePosition,
    dimensions: NodeDimensions
): NodeHandleInfo[] {
    return getActivityNodeHandles(nodeId, nodePosition, dimensions);
}

/**
 * Unified function to get all handles for any node type
 * Automatically detects node type and uses the appropriate extraction function
 */
export function getAllNodeHandles(node: BaseNode): NodeHandleInfo[] {
    const nodePosition = { x: node.position.x, y: node.position.y };
    const dimensions = {
        width: node.data?.width || node.width || 200,
        height: node.data?.height || node.height || 120,
    };

    switch (node.type) {
        case "activity":
            return getActivityNodeHandles(node.id, nodePosition, dimensions);
        case "generator":
            return getGeneratorNodeHandles(node.id, nodePosition, dimensions);
        case "terminator":
            return getTerminatorNodeHandles(node.id, nodePosition, dimensions);
        case "event":
            return getEventNodeHandles(node.id, nodePosition, dimensions);
        case "initialization":
            return getInitializationNodeHandles(
                node.id,
                nodePosition,
                dimensions
            );
        case "global":
            return getGlobalNodeHandles(node.id, nodePosition, dimensions);

        default:
            console.warn(`Unknown node type: ${node.type}`);
            return [];
    }
}

/**
 * Get handle coordinates by handle ID
 * Searches through all nodes to find the one containing the handle
 */
export function getHandleCoordinatesById(
    handleId: string,
    nodes: BaseNode[]
): { x: number; y: number } | null {
    if (typeof handleId !== "string" || !handleId || !Array.isArray(nodes)) {
        return null;
    }

    const parsed = parseHandleId(handleId);
    if (!parsed) {
        return null;
    }

    const node = nodes.find((n) => n.id === parsed.nodeId);
    if (!node) {
        return null;
    }

    const handles = getAllNodeHandles(node);

    const handle = handles.find((h) => h.id === handleId);
    return handle?.coordinates || null;
}

/**
 * Get complete handle information by handle ID
 * Returns full NodeHandleInfo object if found
 */
export function getHandleInfoById(
    handleId: string,
    nodes: BaseNode[]
): NodeHandleInfo | null {
    if (typeof handleId !== "string" || !handleId || !Array.isArray(nodes)) {
        return null;
    }

    const parsed = parseHandleId(handleId);
    if (!parsed) {
        return null;
    }

    const node = nodes.find((n) => n.id === parsed.nodeId);
    if (!node) {
        return null;
    }

    const handles = getAllNodeHandles(node);

    return handles.find((h) => h.id === handleId) || null;
}
