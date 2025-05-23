import InitializationNode from "./eventbased/InitializationNode";
import EventNode from "./eventbased/EventNode";
import ModuleFrame from "./eventbased/ModuleFrame";
import TableauNode from "./eventbased/TableauNode";
import GeneratorNode from "./activitybased/resourceconstrainedqueues/GeneratorNode";
import ActivityNode from "./activitybased/resourceconstrainedqueues/ActivityNode";

export const NODE_TYPES = {
    INITIALIZATION: "initialization",
    EVENT: "event",
    MODULE_FRAME: "moduleFrame",
    TABLEAU: "tableau",
    GENERATOR: "generator",
    ACTIVITY: "activity",
} as const;

export const EVENT_BASED_NODES = {
    initialization: InitializationNode,
    event: EventNode,
    moduleFrame: ModuleFrame,
    tableau: TableauNode,
} as const;

export const ACTIVITY_BASED_NODES = {
    generator: GeneratorNode,
    activity: ActivityNode,
} as const;

export const nodeTypes = {
    ...EVENT_BASED_NODES,
    ...ACTIVITY_BASED_NODES,
} as const;

export const NODE_GROUPS = {
    eventBased: {
        title: "Event-Based",
        nodes: EVENT_BASED_NODES,
    },
    activityBased: {
        title: "Activity-Based",
        nodes: ACTIVITY_BASED_NODES,
    },
} as const;

export {
    InitializationNode,
    EventNode,
    ModuleFrame,
    TableauNode,
    GeneratorNode,
    ActivityNode,
};
