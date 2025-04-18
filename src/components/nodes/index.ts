import InitializationNode from "./eventbased/InitializationNode";
import EventNode from "./eventbased/EventNode";

// Node type constants
export const NODE_TYPES = {
    INITIALIZATION: "initialization",
    EVENT: "event",
} as const;

// Node components mapping
export const nodeTypes = {
    initialization: InitializationNode,
    event: EventNode,
    // add other nodes here
} as const;

export { InitializationNode, EventNode };
