import EventGraphEdge from "./eventbased/EventGraphEdge";
import InitializationEdge from "./eventbased/InitializationEdge";
import RCQEdge from "./activitybased/resourceconstrained/RCQEdge";
import BaseEdgeComponent from "./BaseEdgeComponent";

export const EDGE_TYPES = {
    EVENT_GRAPH: "eventGraph",
    INITIALIZATION: "initialization",
    RCQ: "rcq",
} as const;

export const edgeTypes = {
    eventGraph: EventGraphEdge,
    initialization: InitializationEdge,
    rcq: RCQEdge,
} as const;

export { EventGraphEdge, InitializationEdge, RCQEdge, BaseEdgeComponent };
