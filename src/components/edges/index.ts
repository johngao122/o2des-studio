import EventGraphEdge from "./eventbased/EventGraphEdge";
import InitializationEdge from "./eventbased/InitializationEdge";

export const EDGE_TYPES = {
    EVENT_GRAPH: "eventGraph",
    INITIALIZATION: "initialization",
} as const;

export const edgeTypes = {
    eventGraph: EventGraphEdge,
    initialization: InitializationEdge,
} as const;

export { EventGraphEdge, InitializationEdge };
