import {
    isCurveFlipped,
    getOffsetPoint,
    calculateDynamicOffset,
    arePointsCollinear,
} from "./math";

/**
 * Calculate default control points for a multi-segment edge path
 */
export function calculateDefaultControlPoints(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
): {
    cp1: { x: number; y: number };
    cp2: { x: number; y: number };
    cp3: { x: number; y: number };
} {
    const cp1 = {
        x: sourceX + (targetX - sourceX) * 0.25,
        y: sourceY + (targetY - sourceY) * 0.25,
    };
    const cp2 = {
        x: sourceX + (targetX - sourceX) * 0.5,
        y: sourceY + (targetY - sourceY) * 0.5,
    };
    const cp3 = {
        x: sourceX + (targetX - sourceX) * 0.75,
        y: sourceY + (targetY - sourceY) * 0.75,
    };
    return { cp1, cp2, cp3 };
}

/**
 * Simplify control points by removing unnecessary ones that form straight lines
 * Ensures at least one control point remains for edge system functionality
 */
export function simplifyControlPoints(
    controlPoints: { x: number; y: number }[],
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
): { x: number; y: number }[] {
    if (controlPoints.length === 0) return controlPoints;

    // Consider the full path including endpoints so we can prune
    // the first/last control points if they are redundant with
    // the source/target (previous implementation always preserved them).
    const allPoints = [
        { x: sourceX, y: sourceY },
        ...controlPoints,
        { x: targetX, y: targetY },
    ];

    const cleaned: { x: number; y: number }[] = [{ x: sourceX, y: sourceY }];

    for (let i = 1; i < allPoints.length - 1; i++) {
        const prevPoint = allPoints[i - 1];
        const currentPoint = allPoints[i];
        const nextPoint = allPoints[i + 1];

        if (!arePointsCollinear(prevPoint, currentPoint, nextPoint, 1)) {
            cleaned.push(currentPoint);
            continue;
        }

        // If perfectly (or near-)collinear, still keep points that are
        // materially offset from the straight line so slight user intent
        // is preserved.
        const midpoint = {
            x: (prevPoint.x + nextPoint.x) / 2,
            y: (prevPoint.y + nextPoint.y) / 2,
        };
        const distanceFromMidpoint = Math.sqrt(
            Math.pow(currentPoint.x - midpoint.x, 2) +
                Math.pow(currentPoint.y - midpoint.y, 2)
        );
        if (distanceFromMidpoint > 10) {
            cleaned.push(currentPoint);
        }
    }

    cleaned.push({ x: targetX, y: targetY });

    // Remove the synthetic endpoints before returning
    const result = cleaned.slice(1, -1);

    if (result.length === 0) {
        const middleIndex = Math.floor(controlPoints.length / 2);
        return [controlPoints[middleIndex]];
    }

    return result;
}

/**
 * Create SVG path with rounded corners at control points
 * Generates straight segments with smooth rounded transitions
 */
export function createRoundedPath(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    controlPoints: { x: number; y: number }[],
    cornerRadius: number = 15
): string {
    if (controlPoints.length === 0) {
        return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    }

    const allPoints = [
        { x: sourceX, y: sourceY },
        ...controlPoints,
        { x: targetX, y: targetY },
    ];

    if (allPoints.length < 3) {
        return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    }

    let path = `M ${allPoints[0].x} ${allPoints[0].y}`;

    for (let i = 1; i < allPoints.length - 1; i++) {
        const prevPoint = allPoints[i - 1];
        const currentPoint = allPoints[i];
        const nextPoint = allPoints[i + 1];

        const incomingVector = {
            x: currentPoint.x - prevPoint.x,
            y: currentPoint.y - prevPoint.y,
        };
        const outgoingVector = {
            x: nextPoint.x - currentPoint.x,
            y: nextPoint.y - currentPoint.y,
        };

        const incomingLength = Math.sqrt(
            incomingVector.x ** 2 + incomingVector.y ** 2
        );
        const outgoingLength = Math.sqrt(
            outgoingVector.x ** 2 + outgoingVector.y ** 2
        );

        if (incomingLength === 0 || outgoingLength === 0) {
            path += ` L ${currentPoint.x} ${currentPoint.y}`;
            continue;
        }

        const incomingUnit = {
            x: incomingVector.x / incomingLength,
            y: incomingVector.y / incomingLength,
        };
        const outgoingUnit = {
            x: outgoingVector.x / outgoingLength,
            y: outgoingVector.y / outgoingLength,
        };

        const maxRadius = Math.min(
            incomingLength / 2,
            outgoingLength / 2,
            cornerRadius
        );

        const arcStart = {
            x: currentPoint.x - incomingUnit.x * maxRadius,
            y: currentPoint.y - incomingUnit.y * maxRadius,
        };
        const arcEnd = {
            x: currentPoint.x + outgoingUnit.x * maxRadius,
            y: currentPoint.y + outgoingUnit.y * maxRadius,
        };

        path += ` L ${arcStart.x} ${arcStart.y}`;
        path += ` Q ${currentPoint.x} ${currentPoint.y} ${arcEnd.x} ${arcEnd.y}`;
    }

    path += ` L ${allPoints[allPoints.length - 1].x} ${
        allPoints[allPoints.length - 1].y
    }`;

    return path;
}

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

/**
 * Places control points at fixed percentage marks along a straight line between source and target handles.
 * Uses 25%, 50%, and 75% positions regardless of the number of existing control points.
 */
export function spreadControlPointsEvenly(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    numberOfControlPoints: number
): { x: number; y: number }[] {
    if (numberOfControlPoints <= 0) {
        return [];
    }

    const controlPoints: { x: number; y: number }[] = [];

    const percentageMarks = [0.25, 0.5, 0.75];

    const pointsToPlace = Math.min(
        numberOfControlPoints,
        percentageMarks.length
    );

    for (let i = 0; i < pointsToPlace; i++) {
        const t = percentageMarks[i];

        const x = sourceX + (targetX - sourceX) * t;
        const y = sourceY + (targetY - sourceY) * t;

        controlPoints.push({ x, y });
    }

    return controlPoints;
}

/**
 * Redistributes existing control points evenly along the straight line between source and target.
 * Maintains the same number of control points but spreads them evenly.
 */
export function redistributeControlPointsEvenly(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    existingControlPoints: { x: number; y: number }[]
): { x: number; y: number }[] {
    if (existingControlPoints.length === 0) {
        return [];
    }

    return spreadControlPointsEvenly(
        sourceX,
        sourceY,
        targetX,
        targetY,
        existingControlPoints.length
    );
}
