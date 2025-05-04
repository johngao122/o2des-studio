/**
 * Utility functions for transforming coordinates between different coordinate systems
 * in the ReactFlow application.
 */

/**
 * Interface for position coordinates
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * Interface for viewport transform
 */
export interface ViewportTransform {
    x: number;
    y: number;
    zoom: number;
}

/**
 * Interface for bounding box
 */
export interface BoundingBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * Converts ReactFlow coordinates to screen/DOM coordinates
 *
 * This is the inverse of ReactFlow's project() method
 *
 * @param position - The position in flow coordinates
 * @param viewport - The current viewport transform (x, y, zoom)
 * @returns Position in screen/DOM coordinates
 */
export function flowToScreenPosition(
    position: Position,
    viewport: ViewportTransform
): Position {
    return {
        x: position.x * viewport.zoom + viewport.x,
        y: position.y * viewport.zoom + viewport.y,
    };
}

/**
 * Converts screen/DOM coordinates to ReactFlow coordinates
 *
 * This is essentially what ReactFlow's project() method does
 *
 * @param position - The position in screen/DOM coordinates
 * @param viewport - The current viewport transform (x, y, zoom)
 * @returns Position in flow coordinates
 */
export function screenToFlowPosition(
    position: Position,
    viewport: ViewportTransform
): Position {
    return {
        x: (position.x - viewport.x) / viewport.zoom,
        y: (position.y - viewport.y) / viewport.zoom,
    };
}

/**
 * Get the center point of a DOM element in ReactFlow coordinates
 *
 * @param element - The DOM element
 * @param viewport - The current viewport transform
 * @returns The center position in flow coordinates
 */
export function getElementCenterInFlowCoordinates(
    element: HTMLElement,
    viewport: ViewportTransform
): Position {
    const rect = element.getBoundingClientRect();
    const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
    };

    return screenToFlowPosition(center, viewport);
}

/**
 * Convert bounding box in flow coordinates to DOM/screen coordinates
 *
 * @param bbox - Bounding box in flow coordinates {left, top, width, height}
 * @param viewport - The current viewport transform
 * @returns Bounding box in screen coordinates
 */
export function flowBBoxToScreenBBox(
    bbox: BoundingBox,
    viewport: ViewportTransform
): BoundingBox {
    const topLeft = flowToScreenPosition(
        { x: bbox.left, y: bbox.top },
        viewport
    );
    const bottomRight = flowToScreenPosition(
        { x: bbox.left + bbox.width, y: bbox.top + bbox.height },
        viewport
    );

    return {
        left: topLeft.x,
        top: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
    };
}

/**
 * Convert relative flow coordinates delta to screen coordinates delta
 *
 * @param delta - Change in position in flow coordinates
 * @param zoom - Current zoom level
 * @returns Change in position in screen coordinates
 */
export function flowDeltaToScreenDelta(
    delta: Position,
    zoom: number
): Position {
    return {
        x: delta.x * zoom,
        y: delta.y * zoom,
    };
}

/**
 * Calculate bounding box from an array of positions
 *
 * @param positions - Array of positions to get bounding box for
 * @returns Bounding box encompassing all positions
 */
export function getBoundingBoxFromPositions(
    positions: Position[]
): BoundingBox | null {
    if (positions.length === 0) return null;

    let minX = positions[0].x;
    let minY = positions[0].y;
    let maxX = positions[0].x;
    let maxY = positions[0].y;

    positions.forEach((pos) => {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x);
        maxY = Math.max(maxY, pos.y);
    });

    return {
        left: minX,
        top: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

/**
 * Get the center point of a bounding box
 *
 * @param bbox - Bounding box
 * @returns Center position of the bounding box
 */
export function getBoundingBoxCenter(bbox: BoundingBox): Position {
    return {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
    };
}

/**
 * Calculate distance between two positions
 *
 * @param pos1 - First position
 * @param pos2 - Second position
 * @returns Distance between the two positions
 */
export function getDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Convert between ReactFlow coordinates and absolute DOM coordinates
 * This is useful when positioning DOM elements that need to align with ReactFlow elements
 *
 * @param flowPosition - Position in ReactFlow coordinates
 * @param viewport - Current viewport transform
 * @param containerRect - Bounding rectangle of the ReactFlow container
 * @returns Position in absolute document coordinates
 */
export function flowToAbsolutePosition(
    flowPosition: Position,
    viewport: ViewportTransform,
    containerRect: DOMRect
): Position {
    const relativePosition = flowToScreenPosition(flowPosition, viewport);

    return {
        x: relativePosition.x + containerRect.left,
        y: relativePosition.y + containerRect.top,
    };
}

/**
 * Convert from absolute DOM coordinates to ReactFlow coordinates
 *
 * @param absolutePosition - Position in absolute document coordinates
 * @param viewport - Current viewport transform
 * @param containerRect - Bounding rectangle of the ReactFlow container
 * @returns Position in ReactFlow coordinates
 */
export function absoluteToFlowPosition(
    absolutePosition: Position,
    viewport: ViewportTransform,
    containerRect: DOMRect
): Position {
    const relativePosition = {
        x: absolutePosition.x - containerRect.left,
        y: absolutePosition.y - containerRect.top,
    };

    return screenToFlowPosition(relativePosition, viewport);
}
