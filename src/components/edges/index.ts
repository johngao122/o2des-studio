import EventGraphEdge from "./eventbased/EventGraphEdge";

// Edge type constants
export const EDGE_TYPES = {
    EVENT_GRAPH: "eventGraph",
} as const;

// Edge components mapping
export const edgeTypes = {
    eventGraph: EventGraphEdge,
    // add other edges here
} as const;

export { EventGraphEdge };
