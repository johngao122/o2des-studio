import EventGraphEdge from "./eventbased/EventGraphEdge";
import InitializationEdge from "./eventbased/InitializationEdge";

// Edge type constants
export const EDGE_TYPES = {
    EVENT_GRAPH: "eventGraph",
    INITIALIZATION: "initialization",
} as const;

// Edge components mapping
export const edgeTypes = {
    eventGraph: EventGraphEdge,
    initialization: InitializationEdge,
    // add other edges here
} as const;

export { EventGraphEdge, InitializationEdge };
