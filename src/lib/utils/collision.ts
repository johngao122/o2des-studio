import { BaseNode, BaseEdge } from "@/types/base";
import { calculateDefaultControlPoints } from "./edge";

/**
 * Check if a point is inside a node's bounding box
 */
export function isPointInsideNode(
    point: { x: number; y: number },
    node: BaseNode
): boolean {
    const nodeWidth =
        (typeof node.style?.width === "number"
            ? node.style.width
            : node.data?.width) || 200;
    const nodeHeight =
        (typeof node.style?.height === "number"
            ? node.style.height
            : node.data?.height) || 100;

    const nodeLeft = node.position.x;
    const nodeRight = node.position.x + nodeWidth;
    const nodeTop = node.position.y;
    const nodeBottom = node.position.y + nodeHeight;

    return (
        point.x >= nodeLeft &&
        point.x <= nodeRight &&
        point.y >= nodeTop &&
        point.y <= nodeBottom
    );
}

/**
 * Calculate the closest point on a node's border to a given point
 */
export function getClosestPointOnNodeBorder(
    point: { x: number; y: number },
    node: BaseNode
): { x: number; y: number } {
    const nodeWidth =
        (typeof node.style?.width === "number"
            ? node.style.width
            : node.data?.width) || 200;
    const nodeHeight =
        (typeof node.style?.height === "number"
            ? node.style.height
            : node.data?.height) || 100;

    const nodeLeft = node.position.x;
    const nodeRight = node.position.x + nodeWidth;
    const nodeTop = node.position.y;
    const nodeBottom = node.position.y + nodeHeight;
    const nodeCenterX = node.position.x + nodeWidth / 2;
    const nodeCenterY = node.position.y + nodeHeight / 2;

    const distToLeft = Math.abs(point.x - nodeLeft);
    const distToRight = Math.abs(point.x - nodeRight);
    const distToTop = Math.abs(point.y - nodeTop);
    const distToBottom = Math.abs(point.y - nodeBottom);

    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

    if (minDist === distToLeft) {
        return {
            x: nodeLeft,
            y: Math.max(nodeTop, Math.min(nodeBottom, point.y)),
        };
    } else if (minDist === distToRight) {
        return {
            x: nodeRight,
            y: Math.max(nodeTop, Math.min(nodeBottom, point.y)),
        };
    } else if (minDist === distToTop) {
        return {
            x: Math.max(nodeLeft, Math.min(nodeRight, point.x)),
            y: nodeTop,
        };
    } else {
        return {
            x: Math.max(nodeLeft, Math.min(nodeRight, point.x)),
            y: nodeBottom,
        };
    }
}

/**
 * Move a control point away from a node by a specified distance
 */
export function moveControlPointAwayFromNode(
    controlPoint: { x: number; y: number },
    node: BaseNode,
    distance: number = 50
): { x: number; y: number } {
    const nodeWidth =
        (typeof node.style?.width === "number"
            ? node.style.width
            : node.data?.width) || 200;
    const nodeHeight =
        (typeof node.style?.height === "number"
            ? node.style.height
            : node.data?.height) || 100;

    const nodeCenterX = node.position.x + nodeWidth / 2;
    const nodeCenterY = node.position.y + nodeHeight / 2;

    const deltaX = controlPoint.x - nodeCenterX;
    const deltaY = controlPoint.y - nodeCenterY;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (length === 0) {
        return { x: controlPoint.x + distance, y: controlPoint.y };
    }

    const unitX = deltaX / length;
    const unitY = deltaY / length;

    const borderPoint = getClosestPointOnNodeBorder(controlPoint, node);

    return {
        x: borderPoint.x + unitX * distance,
        y: borderPoint.y + unitY * distance,
    };
}

/**
 * Check all control points of an edge against all nodes and return adjusted control points
 */
export function adjustEdgeControlPointsForNodeCollisions(
    edge: BaseEdge,
    nodes: BaseNode[],
    distance: number = 50,
    maxIterations: number = 10
): { x: number; y: number }[] | null {
    let controlPoints = edge.data?.controlPoints;

    if (!controlPoints || controlPoints.length === 0) {
        return null;
    }

    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    const excludeNodeIds = new Set([edge.source, edge.target]);

    let adjustedControlPoints = [...controlPoints];
    let hasAnyCollisions = false;
    let iteration = 0;

    while (iteration < maxIterations) {
        let hasCollisionsThisIteration = false;

        for (let i = 0; i < adjustedControlPoints.length; i++) {
            const cp = adjustedControlPoints[i];

            for (const node of nodes) {
                if (excludeNodeIds.has(node.id)) {
                    continue;
                }

                if (isPointInsideNode(cp, node)) {
                    adjustedControlPoints[i] = moveControlPointAwayFromNode(
                        cp,
                        node,
                        distance
                    );
                    hasCollisionsThisIteration = true;
                    hasAnyCollisions = true;
                    break;
                }
            }
        }

        if (!hasCollisionsThisIteration) {
            break;
        }

        iteration++;
    }

    if (iteration >= maxIterations) {
        console.warn(
            `Collision resolution hit max iterations (${maxIterations}) for edge ${edge.id}`
        );
    }

    return hasAnyCollisions ? adjustedControlPoints : null;
}

/**
 * Check for collisions between edge control points and nodes for all edges
 */
export function checkAllEdgeControlPointCollisions(
    edges: BaseEdge[],
    nodes: BaseNode[],
    distance: number = 50,
    maxIterations: number = 10
): Array<{ edgeId: string; newControlPoints: { x: number; y: number }[] }> {
    const collisionAdjustments: Array<{
        edgeId: string;
        newControlPoints: { x: number; y: number }[];
    }> = [];

    for (const edge of edges) {
        const adjustedControlPoints = adjustEdgeControlPointsForNodeCollisions(
            edge,
            nodes,
            distance,
            maxIterations
        );
        if (adjustedControlPoints) {
            collisionAdjustments.push({
                edgeId: edge.id,
                newControlPoints: adjustedControlPoints,
            });
        }
    }

    return collisionAdjustments;
}
