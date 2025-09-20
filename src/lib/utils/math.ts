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
            // Split on commas or whitespace to be robust across browsers
            const values = matrix[1].split(/[\s,]+/).filter((v) => v.length);
            // matrix(a, b, c, d, e, f) → a/d: scale, e: offsetX, f: offsetY
            // Fallback to defaults if parsing fails
            const parsedScale = parseFloat(values[0]);
            const parsedOffsetX = parseFloat(values[4]);
            const parsedOffsetY = parseFloat(values[5]);
            if (Number.isFinite(parsedScale)) scale = parsedScale;
            if (Number.isFinite(parsedOffsetX)) offsetX = parsedOffsetX;
            if (Number.isFinite(parsedOffsetY)) offsetY = parsedOffsetY;
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
 * Visual handle size (matches Tailwind !w-3/!h-3, i.e. 12px) / 2
 * Used to offset handles so their centers sit slightly inside the node
 */
export const HANDLE_RADIUS = 6;

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

    const centerY = topY + alignedHeight * 0.5;
    const hasApproxCenter = verticalPositions.some(
        (pos) => Math.abs(pos - centerY) < GRID_SIZE * 0.1
    );

    if (!hasApproxCenter) {
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

/**
 * Get a point and perpendicular angle at parameter t along an SVG path
 * Uses actual path geometry for accurate positioning and rotation
 */
export function getPointAndAngleOnPath(
    path: string,
    t: number,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
): { x: number; y: number; angle: number } {
    try {
        const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );
        const pathElement = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        );
        pathElement.setAttribute("d", path);
        svg.appendChild(pathElement);
        document.body.appendChild(svg);

        const totalLength = pathElement.getTotalLength();
        const point = pathElement.getPointAtLength(totalLength * t);

        const offset = Math.min(1, totalLength * 0.01);
        const nextT = Math.min(1, t + offset / totalLength);
        const prevT = Math.max(0, t - offset / totalLength);

        const nextPoint = pathElement.getPointAtLength(totalLength * nextT);
        const prevPoint = pathElement.getPointAtLength(totalLength * prevT);

        const dx = nextPoint.x - prevPoint.x;
        const dy = nextPoint.y - prevPoint.y;
        const tangentAngle = Math.atan2(dy, dx) * (180 / Math.PI);

        const perpendicularAngle = tangentAngle + 90;

        document.body.removeChild(svg);

        return { x: point.x, y: point.y, angle: perpendicularAngle };
    } catch (error) {
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const tangentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        const perpendicularAngle = tangentAngle + 90;

        return {
            x: sourceX + dx * t,
            y: sourceY + dy * t,
            angle: perpendicularAngle,
        };
    }
}

/**
 * Calculate edge positions for multiple points along an edge
 * Returns both path-based positions (for markers) and simple edge points (for dragging)
 */
export function calculateEdgePositions(
    edgePath: string,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    positions: number[],
    isSimpleMode: boolean,
    centerX: number,
    centerY: number
): {
    pathPoints: Array<{ x: number; y: number; angle: number }>;
    edgePoints: Array<{ x: number; y: number }>;
} {
    const pathPoints = positions.map((t) =>
        getPointAndAngleOnPath(edgePath, t, sourceX, sourceY, targetX, targetY)
    );

    let edgePoints: Array<{ x: number; y: number }>;

    if (isSimpleMode) {
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;

        edgePoints = positions.map((t) => ({
            x: sourceX + dx * t,
            y: sourceY + dy * t,
        }));
    } else {
        edgePoints = positions.map(() => ({ x: centerX, y: centerY }));
    }

    return { pathPoints, edgePoints };
}

/**
 * Get all handle coordinates for a node based on its position and size
 */
export function getAllHandleCoordinates(
    nodePosition: { x: number; y: number },
    nodeSize: { width: number; height: number },
    headerHeight: number = 35
) {
    const { top, bottom, left, right } = getGridAlignedHandlePositions(
        nodeSize.width,
        nodeSize.height,
        headerHeight
    );

    const { x: nodeX, y: nodeY } = nodePosition;

    return {
        top: top.map((x) => ({
            x: nodeX + x,
            y: nodeY + headerHeight + HANDLE_RADIUS,
        })),
        bottom: bottom.map((x) => ({
            x: nodeX + x,
            y: nodeY + headerHeight + nodeSize.height - HANDLE_RADIUS,
        })),
        left: left.map((y) => ({
            x: nodeX + HANDLE_RADIUS,
            y: nodeY + y,
        })),
        right: right.map((y) => ({
            x: nodeX + nodeSize.width - HANDLE_RADIUS,
            y: nodeY + y,
        })),
    };
}

/**
 * Generate SVG path for arrow shape that preserves angular geometry during resize
 * Only the horizontal sides elongate while maintaining fixed tip angle and indent
 */
export function generateArrowPath(
    width: number,
    height: number,
    fixedTipWidth: number = 30,
    fixedIndentWidth: number = 30
): string {
    const tipWidth = fixedTipWidth;
    const indentWidth = fixedIndentWidth;

    const topY = height * 0.1;
    const bottomY = height * 0.9;
    const centerY = height * 0.5;

    const bodyEndX = width - tipWidth;

    return `M ${indentWidth} ${centerY} 
            L 0 ${topY} 
            L ${bodyEndX} ${topY} 
            L ${width} ${centerY} 
            L ${bodyEndX} ${bottomY} 
            L 0 ${bottomY} 
            Z`;
}

/**
 * Generate SVG path for proper pill shape (rounded rectangle with semicircular ends)
 * Maintains perfect pill proportions during resize - rounded ends stay circular
 * Similar systematic approach to generateArrowPath
 */
export function generatePillPath(width: number, height: number): string {
    const radius = height / 2;
    const centerY = height / 2;

    const straightWidth = Math.max(0, width - height);

    const leftCurveCenter = radius;
    const rightCurveCenter = radius + straightWidth;

    if (straightWidth <= 0) {
        const centerX = width / 2;
        const r = Math.min(width, height) / 2;
        return `M ${centerX - r} ${centerY} 
                A ${r} ${r} 0 1 1 ${centerX + r} ${centerY}
                A ${r} ${r} 0 1 1 ${centerX - r} ${centerY} Z`;
    }

    return `M ${leftCurveCenter} 0 
            L ${rightCurveCenter} 0 
            A ${radius} ${radius} 0 0 1 ${rightCurveCenter} ${height}
            L ${leftCurveCenter} ${height}
            A ${radius} ${radius} 0 0 1 ${leftCurveCenter} 0 Z`;
}

/**
 * Generate SVG path for ellipse/terminator shape that maintains pill shape proportions
 * Ensures rounded ends don't deform during elongation or resizing
 * @deprecated Use generatePillPath for proper pill shapes
 */
export function generateEllipsePath(
    width: number,
    height: number,
    centerX?: number,
    centerY?: number
): { cx: number; cy: number; rx: number; ry: number } {
    const cx = centerX || width / 2;
    const cy = centerY || height / 2;

    const ry = height / 2;
    const minRx = height / 2;
    const rx = Math.max(minRx, width / 2);

    return { cx, cy, rx, ry };
}

/**
 * Calculate handle positions for pill-shaped nodes
 * Positions handles systematically on curved and straight portions
 * Following the pattern shown in the reference image
 */
export function getPillHandlePositions(width: number, height: number) {
    const radius = height / 2;
    const centerY = height / 2;
    const straightWidth = Math.max(0, width - height);

    const leftCurveCenter = radius;
    const rightCurveCenter = radius + straightWidth;

    const handles: {
        top: Array<{ x: number; y: number }>;
        right: Array<{ x: number; y: number }>;
        bottom: Array<{ x: number; y: number }>;
        left: Array<{ x: number; y: number }>;
    } = {
        top: [],
        right: [],
        bottom: [],
        left: [],
    };

    handles.left.push(
        {
            x: leftCurveCenter - radius * 0.5,
            y: centerY - radius * 0.9 + 5,
        },
        { x: 0 + 5, y: centerY },
        { x: leftCurveCenter - radius * 0.5, y: centerY + radius * 0.9 - 5 }
    );

    if (straightWidth > 30) {
        handles.top.push({ x: width / 2, y: 0 + 5 });
    } else {
        handles.top.push({ x: width / 2, y: 0 });
    }

    handles.right.push(
        {
            x: rightCurveCenter + radius * 0.5,
            y: centerY - radius * 0.9 + 5,
        },
        { x: width - 5, y: centerY },
        {
            x: rightCurveCenter + radius * 0.5,
            y: centerY + radius * 0.9 - 5,
        }
    );

    if (straightWidth > 30) {
        handles.bottom.push({ x: width / 2, y: height - 7 });
    } else {
        handles.bottom.push({ x: width / 2, y: height });
    }

    return handles;
}

/**
 * Calculate handle positions for a perfect ellipse (no straight segments)
 * Places three handles per side similar to pill, but hugging the ellipse.
 */
export function getEllipseHandlePositions(width: number, height: number) {
    const cx = width / 2;
    const cy = height / 2;
    const rx = Math.max(1, width / 2);
    const ry = Math.max(1, height / 2);

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const yOnEllipseForX = (x: number, top: boolean) => {
        const dx = (x - cx) / rx;
        const inside = clamp01(1 - dx * dx);
        const dy = ry * Math.sqrt(inside);
        return top ? cy - dy : cy + dy;
    };

    const xOnEllipseForY = (y: number, right: boolean) => {
        const dy = (y - cy) / ry;
        const inside = clamp01(1 - dy * dy);
        const dx = rx * Math.sqrt(inside);
        return right ? cx + dx : cx - dx;
    };

    // One handle on top/bottom, three on left/right
    const top = [{ x: cx, y: yOnEllipseForX(cx, true) }];
    const bottom = [{ x: cx, y: yOnEllipseForX(cx, false) }];

    // Left handles: evenly spaced along the left curve
    const left = [
        { x: xOnEllipseForY(height * 0.05, false), y: height * 0.05 },
        { x: xOnEllipseForY(cy, false) + 7, y: cy },
        { x: xOnEllipseForY(height * 0.95, false), y: height * 0.95 },
    ];

    // Right handles: evenly spaced along the right curve
    const right = [
        { x: xOnEllipseForY(height * 0.05, true), y: height * 0.05 },
        { x: xOnEllipseForY(cy, true) - 7, y: cy },
        { x: xOnEllipseForY(height * 0.95, true), y: height * 0.95 },
    ];

    return { top, right, bottom, left };
}

/**
 * Calculate handle positions for arrow-shaped nodes
 */
export function getArrowHandlePositions(
    width: number,
    height: number,
    fixedTipWidth: number = 30,
    fixedIndentWidth: number = 30
) {
    const topY = height * 0.1;
    const bottomY = height * 0.9;
    const centerY = height * 0.5;
    const bodyEndX = width - fixedTipWidth;

    return {
        top: [{ x: bodyEndX * 0.5 + 10, y: topY + 5 }],

        right: [
            { x: bodyEndX - 8, y: topY },
            { x: width - 5, y: centerY },
            { x: bodyEndX - 8, y: bottomY },
        ],

        bottom: [{ x: bodyEndX * 0.5 + 10, y: bottomY - 5 }],

        left: [
            { x: 0 + 8, y: topY },
            { x: fixedIndentWidth + 5, y: centerY },
            { x: 0 + 8, y: bottomY },
        ],
    };
}
