import InitializationNode from "./eventbased/InitializationNode";

// Node type constants
export const NODE_TYPES = {
    INITIALIZATION: "initialization",
} as const;

// Node components mapping
export const nodeTypes = {
    initialization: InitializationNode,
    // add other nodes here
} as const;

export { InitializationNode };
