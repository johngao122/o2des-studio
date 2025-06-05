/**
 * Math utility functions for calculations related to curves, points, and transformations
 * Functions are calculated at 60fps
 */

/**
 * Calculate a point on a cubic bezier curve at parameter t
 */
export function getBezierPoint(
    t: number,
    sourceX: number,
    sourceY: number,
    controlX: number,
    controlY: number,
    targetX: number,
    targetY: number
): { x: number; y: number } {
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const oneMinusTCubed = oneMinusTSquared * oneMinusT;
    const tSquared = t * t;
    const tCubed = tSquared * t;

    const x =
        oneMinusTCubed * sourceX +
        3 * oneMinusTSquared * t * controlX +
        3 * oneMinusT * tSquared * controlX +
        tCubed * targetX;

    const y =
        oneMinusTCubed * sourceY +
        3 * oneMinusTSquared * t * controlY +
        3 * oneMinusT * tSquared * controlY +
        tCubed * targetY;

    return { x, y };
}

/**
 * Calculate tangent vector at point t on a bezier curve
 */
export function getBezierTangent(
    t: number,
    sourceX: number,
    sourceY: number,
    controlX: number,
    controlY: number,
    targetX: number,
    targetY: number
): { x: number; y: number; angle: number } {
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const tSquared = t * t;

    const tx =
        3 * oneMinusTSquared * (controlX - sourceX) +
        6 * oneMinusT * t * (controlX - controlX) +
        3 * tSquared * (targetX - controlX);

    const ty =
        3 * oneMinusTSquared * (controlY - sourceY) +
        6 * oneMinusT * t * (controlY - controlY) +
        3 * tSquared * (targetY - controlY);

    const angle = Math.atan2(ty, tx) * (180 / Math.PI);

    return { x: tx, y: ty, angle };
}

/**
 * Check if a control point is on the left or right side of the source-target line
 */
export function isCurveFlipped(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    controlX: number,
    controlY: number
): boolean {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;

    const cpx = controlX - sourceX;
    const cpy = controlY - sourceY;

    const crossProduct = dx * cpy - dy * cpx;

    return crossProduct < 0;
}

/**
 * Calculate an offset point from another point in a specific direction
 */
export function getOffsetPoint(
    x: number,
    y: number,
    angle: number,
    offset: number
): { x: number; y: number } {
    const angleRadians = angle * (Math.PI / 180);

    const offsetX = x + Math.cos(angleRadians) * offset;
    const offsetY = y + Math.sin(angleRadians) * offset;

    return { x: offsetX, y: offsetY };
}

/**
 * Parse SVG transform matrix to extract scale and translation values
 */
export function parseTransformMatrix(transformStyle: string): {
    scale: number;
    offsetX: number;
    offsetY: number;
} {
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (transformStyle && transformStyle !== "none") {
        const matrix = transformStyle.match(/matrix.*\((.+)\)/);
        if (matrix && matrix[1]) {
            const values = matrix[1].split(", ");
            scale = parseFloat(values[0]);
            offsetX = parseFloat(values[4]);
            offsetY = parseFloat(values[5]);
        }
    }

    return { scale, offsetX, offsetY };
}

/**
 * Calculate position in flow coordinates from client coordinates
 */
export function clientToFlowPosition(
    clientX: number,
    clientY: number,
    transformMatrix: { scale: number; offsetX: number; offsetY: number }
): { x: number; y: number } {
    const { scale, offsetX, offsetY } = transformMatrix;
    return {
        x: (clientX - offsetX) / scale,
        y: (clientY - offsetY) / scale,
    };
}

/**
 * Calculate a dynamic offset based on the distance between points
 */
export function calculateDynamicOffset(
    baseOffset: number,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    minScaleFactor: number,
    maxScaleFactor: number
): number {
    const sourceToDist = Math.sqrt(
        Math.pow(sourceX - targetX, 2) + Math.pow(sourceY - targetY, 2)
    );
    return Math.min(
        Math.max(baseOffset, sourceToDist * minScaleFactor),
        baseOffset * maxScaleFactor
    );
}

/**
 * Calculate a default control point for a bezier curve
 */
export function calculateDefaultControlPoint(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    offsetDistance: number = 50
): { x: number; y: number } {
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;

    const length = Math.sqrt(dx * dx + dy * dy);
    const normalX = -dy / length;
    const normalY = dx / length;

    return {
        x: midX + normalX * offsetDistance,
        y: midY + normalY * offsetDistance,
    };
}

/**
 * Calculate the midpoint between two points
 */
export function getMidpoint(
    x1: number,
    y1: number,
    x2: number,
    y2: number
): { x: number; y: number } {
    return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
    };
}

/**
 * Calculate the perpendicular point at a specific position along a line
 */
export function getPerpendicularPoint(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    t: number,
    distance: number
): { x: number; y: number } {
    const pointX = x1 + (x2 - x1) * t;
    const pointY = y1 + (y2 - y1) * t;

    const dx = x2 - x1;
    const dy = y2 - y1;

    const length = Math.sqrt(dx * dx + dy * dy);

    const perpX = -dy / length;
    const perpY = dx / length;

    return {
        x: pointX + perpX * distance,
        y: pointY + perpY * distance,
    };
}

/**
 * Calculate the angle between two points in degrees
 */
export function getAngleBetweenPoints(
    x1: number,
    y1: number,
    x2: number,
    y2: number
): number {
    return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}

/**
 * Generate an SVG path string for a cubic bezier curve
 */
export function createBezierPathString(
    sourceX: number,
    sourceY: number,
    controlX: number,
    controlY: number,
    targetX: number,
    targetY: number
): string {
    return `M ${sourceX},${sourceY} C ${controlX},${controlY} ${controlX},${controlY} ${targetX},${targetY}`;
}

/**
 * Project a point onto a bezier curve and find the closest point
 */
export function projectPointOntoBezierCurve(
    point: { x: number; y: number },
    startX: number,
    startY: number,
    controlPoint: { x: number; y: number },
    endX: number,
    endY: number,
    minT: number,
    maxT: number
): { t: number; x: number; y: number } {
    try {
        if (
            !controlPoint ||
            isNaN(startX) ||
            isNaN(startY) ||
            isNaN(controlPoint.x) ||
            isNaN(controlPoint.y) ||
            isNaN(endX) ||
            isNaN(endY) ||
            isNaN(minT) ||
            isNaN(maxT)
        ) {
            return {
                t: (minT + maxT) / 2,
                x: (startX + endX) / 2,
                y: (startY + endY) / 2,
            };
        }

        let closestT = 0;
        let minDistance = Infinity;

        for (let t = minT; t <= maxT; t += 0.1) {
            const curvePoint = getBezierPoint(
                t,
                startX,
                startY,
                controlPoint.x,
                controlPoint.y,
                endX,
                endY
            );
            const distanceSquared =
                Math.pow(curvePoint.x - point.x, 2) +
                Math.pow(curvePoint.y - point.y, 2);

            if (distanceSquared < minDistance) {
                minDistance = distanceSquared;
                closestT = t;
            }
        }

        const refinementRange = 0.05;
        let lowerT = Math.max(minT, closestT - refinementRange);
        let upperT = Math.min(maxT, closestT + refinementRange);

        const step = (upperT - lowerT) / 5;
        let refinedT = lowerT;
        let refinedMinDistance = Infinity;

        for (let j = 0; j <= 5; j++) {
            const t = lowerT + j * step;
            const curvePoint = getBezierPoint(
                t,
                startX,
                startY,
                controlPoint.x,
                controlPoint.y,
                endX,
                endY
            );
            const distanceSquared =
                Math.pow(curvePoint.x - point.x, 2) +
                Math.pow(curvePoint.y - point.y, 2);

            if (distanceSquared < refinedMinDistance) {
                refinedMinDistance = distanceSquared;
                refinedT = t;
            }
        }

        closestT = refinedT;

        const closestPoint = getBezierPoint(
            closestT,
            startX,
            startY,
            controlPoint.x,
            controlPoint.y,
            endX,
            endY
        );

        return {
            t: closestT,
            x: closestPoint.x,
            y: closestPoint.y,
        };
    } catch (error) {
        console.error("Error in projectPointOntoBezierCurve:", error);

        return {
            t: 0.5,
            x: (startX + endX) / 2,
            y: (startY + endY) / 2,
        };
    }
}

/**
 * Throttle function execution to limit how often it can be called
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return function (...args: Parameters<T>) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            return func(...args);
        }
    };
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function (...args: Parameters<T>) {
        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

/**
 * Grid configuration
 */
export const GRID_SIZE = 10;

/**
 * Snap a value to the nearest grid position
 */
export function snapToGrid(
    value: number,
    gridSize: number = GRID_SIZE
): number {
    return Math.round(value / gridSize) * gridSize;
}

/**
 * Calculate grid-aligned handle positions for resizable nodes
 */
export function getGridAlignedHandlePositions(
    width: number,
    height: number,
    headerHeight: number = 35
) {
    const alignedWidth = snapToGrid(width);
    const alignedHeight = snapToGrid(height);

    const topY = headerHeight;
    const bottomY = topY + alignedHeight;

    const horizontalPositions = [];
    const numHorizontalHandles = Math.max(
        3,
        Math.floor(alignedWidth / (GRID_SIZE * 4)) + 1
    );

    for (let i = 0; i < numHorizontalHandles; i++) {
        const position = (i / (numHorizontalHandles - 1)) * alignedWidth;
        horizontalPositions.push(snapToGrid(position));
    }

    const verticalPositions = [];
    const numVerticalHandles = Math.max(
        2,
        Math.floor(alignedHeight / (GRID_SIZE * 3)) + 1
    );

    for (let i = 1; i < numVerticalHandles - 1; i++) {
        const position = topY + (i / (numVerticalHandles - 1)) * alignedHeight;
        verticalPositions.push(snapToGrid(position));
    }

    const centerY = snapToGrid(topY + alignedHeight * 0.5);
    if (!verticalPositions.includes(centerY)) {
        verticalPositions.push(centerY);
        verticalPositions.sort((a, b) => a - b);
    }

    return {
        top: horizontalPositions,
        right: verticalPositions,
        bottom: [...horizontalPositions].reverse(),
        left: [...verticalPositions].reverse(),
        headerHeight: topY,
        nodeHeight: alignedHeight,
        nodeWidth: alignedWidth,
    };
}

/**
 * Get standard grid-aligned handle positions for fixed-size nodes
 */
export function getStandardHandlePositions(
    nodeWidth: number,
    nodeHeight: number
) {
    const alignedWidth = snapToGrid(nodeWidth);
    const alignedHeight = snapToGrid(nodeHeight);

    const horizontalPositions = [
        0,
        snapToGrid(alignedWidth * 0.25),
        snapToGrid(alignedWidth * 0.5),
        snapToGrid(alignedWidth * 0.75),
        alignedWidth,
    ].filter((pos, index, arr) => index === 0 || pos !== arr[index - 1]);

    const verticalPositions = [
        snapToGrid(alignedHeight * 0.25),
        snapToGrid(alignedHeight * 0.5),
        snapToGrid(alignedHeight * 0.75),
    ].filter((pos, index, arr) => index === 0 || pos !== arr[index - 1]);

    return {
        horizontal: horizontalPositions,
        vertical: verticalPositions,
        nodeWidth: alignedWidth,
        nodeHeight: alignedHeight,
    };
}

/**
 * Check if three points are collinear (on the same line)
 */
export function arePointsCollinear(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    tolerance: number = 2
): boolean {
    const crossProduct = Math.abs(
        (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)
    );

    return crossProduct <= tolerance;
}
