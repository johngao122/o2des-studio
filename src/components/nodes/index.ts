import InitializationNode from "./eventbased/InitializationNode";
import EventNode from "./eventbased/EventNode";
import ModuleFrame from "./eventbased/ModuleFrame";

// Node type constants
export const NODE_TYPES = {
    INITIALIZATION: "initialization",
    EVENT: "event",
    MODULE_FRAME: "moduleFrame",
} as const;

// Node components mapping
export const nodeTypes = {
    initialization: InitializationNode,
    event: EventNode,
    moduleFrame: ModuleFrame,
} as const;

export { InitializationNode, EventNode, ModuleFrame };
