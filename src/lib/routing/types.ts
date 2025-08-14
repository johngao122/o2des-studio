/**
 * Core data structures for orthogonal edge routing system
 */

export interface Point {
    x: number;
    y: number;
}

export interface HandleInfo {
    id: string;
    nodeId: string;
    position: Point;
    side: "top" | "right" | "bottom" | "left";
    type: "source" | "target";
}

export interface NodeInfo {
    id: string;
    bounds: NodeBounds;
    handles: HandleInfo[];
}

export interface NodeBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PathSegment {
    start: Point;
    end: Point;
    direction: "horizontal" | "vertical";
    length: number;
}

export interface OrthogonalPath {
    segments: PathSegment[];
    totalLength: number;
    routingType: "horizontal-first" | "vertical-first";
    efficiency: number;
    controlPoints: ControlPoint[];
}

export interface ControlPoint {
    x: number;
    y: number;
    type: "corner" | "intermediate";
}

export interface HandleCombination {
    sourceHandle: HandleInfo;
    targetHandle: HandleInfo;
    manhattanDistance: number;
    pathLength: number;
    efficiency: number;
    routingType: "horizontal-first" | "vertical-first";
}

export interface RoutingMetrics {
    pathLength: number;
    segmentCount: number;
    routingType: "horizontal-first" | "vertical-first";
    efficiency: number;
    handleCombination: string;
}

export interface RoutingDecision {
    selectedPath: OrthogonalPath;
    alternativePath: OrthogonalPath;
    reason: string;
    efficiency: number;
}
