import { Zap, Settings, BookOpen } from "lucide-react";
import {
    GeneratorNodePreview,
    ActivityNodePreview,
    TerminatorNodePreview,
    GlobalNodePreview,
    EventNodePreview,
    InitializationNodePreview,
    TableauNodePreview,
    ModuleFramePreview,
} from "@/components/ComponentPreviews";

export function ComponentLibrary() {
    return (
        <section className="mb-12" id="components">
            <h2 className="text-3xl font-bold mb-8">Component Library</h2>
            <p className="text-muted-foreground mb-8 text-lg">
                Explore the complete library of simulation components available
                in O²DES Studio. Each component serves a specific purpose in
                building discrete event systems.
            </p>

            <div className="space-y-12">
                {/* Activity-Based Components */}
                <div className="space-y-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <Zap className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-semibold">
                                Activity-Based Components
                            </h3>
                            <p className="text-muted-foreground">
                                Components for resource-constrained queueing
                                systems and activity networks
                            </p>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Generator Node */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Generator
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Creates entities (customers, parts,
                                        jobs) at specified intervals to initiate
                                        processes in your simulation.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Key Properties:
                                            </span>
                                            <ul className="mt-1 space-y-1 ml-4">
                                                <li>
                                                    • Arrival rate (entities per
                                                    time unit)
                                                </li>
                                                <li>
                                                    • Entity type and attributes
                                                </li>
                                                <li>
                                                    • Inter-arrival time
                                                    distribution
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Use Cases:
                                            </span>
                                            <span className="text-muted-foreground ml-1">
                                                Customer arrivals, job creation,
                                                supply deliveries
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center pt-4 border-t border-border">
                                    <GeneratorNodePreview />
                                </div>
                            </div>
                        </div>

                        {/* Activity Node */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Activity
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Represents a process that requires
                                        resources and takes time to complete.
                                        The core processing element.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Key Properties:
                                            </span>
                                            <ul className="mt-1 space-y-1 ml-4">
                                                <li>
                                                    • Resource requirements
                                                    (people, machines)
                                                </li>
                                                <li>• Processing duration</li>
                                                <li>
                                                    • Capacity and queue
                                                    discipline
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Use Cases:
                                            </span>
                                            <span className="text-muted-foreground ml-1">
                                                Service stations, manufacturing
                                                steps, inspections
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center pt-4 border-t border-border">
                                    <ActivityNodePreview />
                                </div>
                            </div>
                        </div>

                        {/* Terminator Node */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Terminator
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        End point where entities exit the
                                        system. Used to collect statistics and
                                        complete processes.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Key Properties:
                                            </span>
                                            <ul className="mt-1 space-y-1 ml-4">
                                                <li>
                                                    • Statistics collection
                                                    settings
                                                </li>
                                                <li>
                                                    • Entity disposal method
                                                </li>
                                                <li>
                                                    • Performance metrics
                                                    tracking
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Use Cases:
                                            </span>
                                            <span className="text-muted-foreground ml-1">
                                                System exits, completed jobs,
                                                customer departures
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center pt-4 border-t border-border">
                                    <TerminatorNodePreview />
                                </div>
                            </div>
                        </div>

                        {/* Global Node */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Global
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Manages system-wide resources and
                                        variables that multiple activities can
                                        access and modify.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Key Properties:
                                            </span>
                                            <ul className="mt-1 space-y-1 ml-4">
                                                <li>
                                                    • Resource pool definitions
                                                </li>
                                                <li>
                                                    • Global variables and
                                                    counters
                                                </li>
                                                <li>
                                                    • System-wide constraints
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Use Cases:
                                            </span>
                                            <span className="text-muted-foreground ml-1">
                                                Shared resources, system state,
                                                global parameters
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center pt-4 border-t border-border">
                                    <GlobalNodePreview />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Event-Based Components */}
                <div className="space-y-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Settings className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-semibold">
                                Event-Based Components
                            </h3>
                            <p className="text-muted-foreground">
                                Components for discrete event modeling with
                                state changes and scheduling
                            </p>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Initialization Node */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Initialization
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Sets up the initial state of the
                                        simulation including variables,
                                        parameters, and starting conditions.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Key Properties:
                                            </span>
                                            <ul className="mt-1 space-y-1 ml-4">
                                                <li>
                                                    • Initial variable values
                                                </li>
                                                <li>• System parameters</li>
                                                <li>
                                                    • Starting event schedule
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Use Cases:
                                            </span>
                                            <span className="text-muted-foreground ml-1">
                                                System startup, parameter
                                                initialization, warm-up
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center pt-4 border-t border-border">
                                    <InitializationNodePreview />
                                </div>
                            </div>
                        </div>

                        {/* Event Node */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Event
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Represents a discrete change in system
                                        state that occurs at a specific point in
                                        time.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Key Properties:
                                            </span>
                                            <ul className="mt-1 space-y-1 ml-4">
                                                <li>
                                                    • State update equations
                                                </li>
                                                <li>• Event parameters</li>
                                                <li>• Triggering conditions</li>
                                            </ul>
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Use Cases:
                                            </span>
                                            <span className="text-muted-foreground ml-1">
                                                State changes, arrivals,
                                                departures, decisions
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center pt-4 border-t border-border">
                                    <EventNodePreview />
                                </div>
                            </div>
                        </div>

                        {/* Tableau Node */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Tableau
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Visualization of event flows in a table
                                        format.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Key Properties:
                                            </span>
                                            <ul className="mt-1 space-y-1 ml-4">
                                                <li>
                                                    • Event scheduling logic
                                                </li>
                                                <li>
                                                    • State transition rules
                                                </li>
                                                <li>
                                                    • Complex condition handling
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Use Cases:
                                            </span>
                                            <span className="text-muted-foreground ml-1">
                                                Complex event relationships,
                                                batch processing, conditional
                                                flows
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center pt-4 border-t border-border">
                                    <TableauNodePreview />
                                </div>
                            </div>
                        </div>

                        {/* Module Frame */}
                        <div className="bg-card border border-border rounded-lg p-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-semibold mb-2">
                                        Module Frame
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Container for organizing and grouping
                                        related components into reusable
                                        modules.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Key Properties:
                                            </span>
                                            <ul className="mt-1 space-y-1 ml-4">
                                                <li>• Module boundaries</li>
                                                <li>• Interface definitions</li>
                                                <li>
                                                    • Hierarchical organization
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-medium">
                                                Use Cases:
                                            </span>
                                            <span className="text-muted-foreground ml-1">
                                                Subsystem organization, reusable
                                                components, modularity
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center pt-4 border-t border-border">
                                    <ModuleFramePreview />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Component Selection Guide */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-6 mt-8">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="font-medium mb-3">
                            Choosing the Right Components
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <h4 className="font-medium mb-2">
                                    For Simple Flow Systems:
                                </h4>
                                <ul className="text-muted-foreground space-y-1">
                                    <li>
                                        • Start with <strong>Generator</strong>{" "}
                                        → <strong>Activity</strong> →{" "}
                                        <strong>Terminator</strong>
                                    </li>
                                    <li>
                                        • Add <strong>Global</strong> nodes for
                                        shared resources
                                    </li>
                                    <li>
                                        • Perfect for service systems and
                                        manufacturing lines
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">
                                    For Complex Event Systems:
                                </h4>
                                <ul className="text-muted-foreground space-y-1">
                                    <li>
                                        • Begin with{" "}
                                        <strong>Initialization</strong> for
                                        setup
                                    </li>
                                    <li>
                                        • Use <strong>Event</strong> nodes for
                                        state changes
                                    </li>
                                    <li>
                                        • Employ <strong>Tableau</strong> for
                                        better visualization of complex events
                                    </li>
                                    <li>
                                        • Organize with{" "}
                                        <strong>Module Frames</strong>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
