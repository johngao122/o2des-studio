import { Edge } from "reactflow";

export interface Condition {
    id: string;
    expression: string;
}

export interface BaseEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    conditions: Condition[];
    type?: string;
    animated?: boolean;
    style?: React.CSSProperties;
    data?: any;
    selected?: boolean;
    markerStart?: string;
    markerEnd?: string;
    zIndex?: number;
    hidden?: boolean;
    deletable?: boolean;
    focusable?: boolean;
    updatable?: boolean;
    interactionWidth?: number;
}
