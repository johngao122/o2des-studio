import { isCurveFlipped, getOffsetPoint, calculateDynamicOffset } from "./math";

/**
 * Calculate an offset point for edge labels based on the edge path and parameters.
 * Takes into account the curve orientation, distance between nodes, and provides appropriate
 * offset positions for visual elements.
 */
export function calculateOffsetPointForEdge(
    x: number,
    y: number,
    angle: number,
    baseOffset: number,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    controlPoint?: { x: number; y: number },
    minScaleFactor: number = 0.1,
    maxScaleFactor: number = 1.5
) {
    const flipOffset = controlPoint
        ? isCurveFlipped(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlPoint.x,
              controlPoint.y
          )
        : false;

    const offsetDirection = flipOffset ? -1 : 1;

    const dynamicOffset = calculateDynamicOffset(
        baseOffset,
        sourceX,
        sourceY,
        targetX,
        targetY,
        minScaleFactor,
        maxScaleFactor
    );

    const offsetAngle = angle + 90 * offsetDirection;
    const offsetPoint = getOffsetPoint(x, y, offsetAngle, dynamicOffset);

    return { x: offsetPoint.x, y: offsetPoint.y, flipped: flipOffset };
}
