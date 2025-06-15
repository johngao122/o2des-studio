import { BookOpen, Settings, Zap } from "lucide-react";
import { VisualToolbar } from "@/components/VisualToolbar";
import { VisualPropertiesBar } from "@/components/VisualPropertiesBar";

interface InterfaceOverviewProps {
    modKey: string;
}

export function InterfaceOverview({ modKey }: InterfaceOverviewProps) {
    return (
        <section className="mb-12" id="interface">
            <h2 className="text-3xl font-bold mb-8">Learning the Interface</h2>
            <p className="text-muted-foreground mb-8 text-lg">
                This tutorial will teach you how to use each part of O²DES
                Studio&apos;s interface effectively. Follow along to learn the
                essential skills for building simulation models.
            </p>

            <div className="space-y-8">
                {/* Toolbar Tutorial */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Settings className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2">
                                Using the Toolbar
                            </h3>
                            <p className="text-muted-foreground">
                                Learn how to manage your projects and access
                                essential tools
                            </p>
                        </div>
                    </div>

                    {/* Visual Example First */}
                    <div className="mb-6">
                        <div className="border border-border rounded-lg overflow-hidden">
                            <VisualToolbar projectName="My Simulation Project" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            The toolbar at the top of your screen - this is your
                            main control center
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="border-l-4 border-primary/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 1: Project Management
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>Click the project name</strong>{" "}
                                    (currently &quot;My Simulation
                                    Project&quot;) to rename it
                                </li>
                                <li>
                                    <strong>Use &quot;New&quot;</strong> to
                                    start a fresh simulation model
                                </li>
                                <li>
                                    <strong>Click &quot;Save&quot;</strong>{" "}
                                    regularly to preserve your work
                                </li>
                                <li>
                                    <strong>Use &quot;Load&quot;</strong> to
                                    open previously saved models
                                </li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-primary/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 2: Basic Editing
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>Undo ({modKey}+Z)</strong> -
                                    Reverses your last action
                                </li>
                                <li>
                                    <strong>Redo ({modKey}+Y)</strong> - Brings
                                    back an undone action
                                </li>
                                <li>
                                    <strong>Copy ({modKey}+C)</strong> and{" "}
                                    <strong>Paste ({modKey}+V)</strong> -
                                    Duplicate selected components
                                </li>
                                <li>
                                    <strong>Delete (Del)</strong> - Remove
                                    selected components
                                </li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-primary/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 3: View Controls
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>Zoom In/Out</strong> - Get closer or
                                    see more of your model
                                </li>
                                <li>
                                    <strong>Fit to Screen</strong> -
                                    Automatically zoom to show your entire model
                                </li>
                                <li>
                                    <strong>Theme Toggle</strong> - Switch
                                    between light and dark modes
                                </li>
                                <li>
                                    <strong>Auto Layout</strong> - Automatically
                                    organize your components neatly
                                </li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-primary/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 4: Getting Help
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>Help Menu</strong> - Access keyboard
                                    shortcuts and documentation
                                </li>
                                <li>
                                    <strong>Export</strong> - Generate code from
                                    your visual model
                                </li>
                                <li>
                                    <strong>Status Bar</strong> - Shows your
                                    last action and save status
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Component Drawer Tutorial */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2">
                                Adding Components to Your Model
                            </h3>
                            <p className="text-muted-foreground">
                                Learn how to use the component drawer to build
                                your simulation
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="border-l-4 border-green-500/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 1: Understanding Component Types
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4 mt-3">
                                <div>
                                    <p className="font-medium text-sm mb-2">
                                        Activity-Based Components:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        For resource-constrained queueing
                                        systems and activity networks
                                    </p>
                                </div>
                                <div>
                                    <p className="font-medium text-sm mb-2">
                                        Event-Based Components:
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        For discrete event modeling with state
                                        changes and scheduling
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-l-4 border-green-500/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 2: Adding Components (Drag & Drop)
                            </h4>
                            <ol className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>1.</strong> Click and hold on any
                                    component in the drawer
                                </li>
                                <li>
                                    <strong>2.</strong> Drag it onto the canvas
                                    (the main white area)
                                </li>
                                <li>
                                    <strong>3.</strong> Release to place the
                                    component where you want it
                                </li>
                                <li>
                                    <strong>4.</strong> The component appears
                                    with a default name and settings
                                </li>
                            </ol>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm">
                                <strong>Try it now:</strong> Drag any node into
                                the canvas
                            </p>
                        </div>
                    </div>
                </div>

                {/* Canvas Tutorial */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2">
                                Working on the Canvas
                            </h3>
                            <p className="text-muted-foreground">
                                Master the main workspace where you build your
                                simulation models
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="border-l-4 border-purple-500/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 1: Basic Navigation
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>Mouse wheel up/down:</strong> Zoom
                                    in and out of your model
                                </li>
                                <li>
                                    <strong>
                                        Click and drag on empty space:
                                    </strong>{" "}
                                    Pan around the canvas
                                </li>
                                <li>
                                    <strong>Double-click empty space:</strong>{" "}
                                    Return to center view
                                </li>
                                <li>
                                    <strong>Use toolbar zoom buttons:</strong>{" "}
                                    Precise zoom control
                                </li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-purple-500/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 2: Selecting Components
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>Single click:</strong> Select one
                                    component (blue outline appears)
                                </li>
                                <li>
                                    <strong>
                                        Ctrl+click (Cmd+click on Mac):
                                    </strong>{" "}
                                    Add to selection
                                </li>
                                <li>
                                    <strong>
                                        Click and drag on empty space:
                                    </strong>{" "}
                                    Draw selection box
                                </li>
                                <li>
                                    <strong>Click empty space:</strong> Deselect
                                    everything
                                </li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-purple-500/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 3: Moving Components
                            </h4>
                            <ol className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>1.</strong> Select the component(s)
                                    you want to move
                                </li>
                                <li>
                                    <strong>2.</strong> Click and drag the
                                    selected component
                                </li>
                                <li>
                                    <strong>3.</strong> Components snap to grid
                                    for neat alignment
                                </li>
                                <li>
                                    <strong>4.</strong> Release to place in new
                                    position
                                </li>
                            </ol>
                        </div>

                        <div className="border-l-4 border-purple-500/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 4: Connecting Components
                            </h4>
                            <ol className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>1.</strong> Hover over a component
                                    until you see connection dots
                                </li>
                                <li>
                                    <strong>2.</strong> Click and drag from one
                                    dot to another component
                                </li>
                                <li>
                                    <strong>3.</strong> An arrow appears showing
                                    the flow direction
                                </li>
                                <li>
                                    <strong>4.</strong> This creates the path
                                    entities will follow
                                </li>
                            </ol>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">
                                <strong>💡 Tip:</strong> You can&apos;t connect
                                incompatible components - the system will guide
                                you to make valid connections only.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Properties Bar Tutorial */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Settings className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2">
                                Configuring Component Properties
                            </h3>
                            <p className="text-muted-foreground">
                                Learn how to customize your components&apos;
                                behavior and settings
                            </p>
                        </div>
                    </div>

                    {/* Visual Example */}
                    <div className="mb-6">
                        <div className="border border-border rounded-lg overflow-hidden">
                            <VisualPropertiesBar
                                selectedComponent="generator"
                                className="h-96"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            The properties panel appears when you select a
                            component
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="border-l-4 border-orange-500/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 1: Opening Properties
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>Click on any component</strong> to
                                    select it
                                </li>
                                <li>
                                    <strong>
                                        Properties panel opens automatically
                                    </strong>{" "}
                                    on the right side
                                </li>
                                <li>
                                    <strong>Different components</strong> show
                                    different property options
                                </li>
                                <li>
                                    <strong>No selection</strong> means no
                                    properties panel
                                </li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-orange-500/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 2: Basic Properties
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>Name:</strong> Change the
                                    component&apos;s display name
                                </li>
                                <li>
                                    <strong>ID:</strong> Unique identifier
                                    (usually auto-generated)
                                </li>
                                <li>
                                    <strong>Description:</strong> Add notes
                                    about this component&apos;s purpose
                                </li>
                                <li>
                                    <strong>Position:</strong> Exact X,Y
                                    coordinates on canvas
                                </li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-orange-500/50 pl-4">
                            <h4 className="font-medium mb-2">
                                Step 3: Making Changes
                            </h4>
                            <ol className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>1.</strong> Click in any text field
                                    to edit
                                </li>
                                <li>
                                    <strong>2.</strong> Use dropdowns to select
                                    from preset options
                                </li>
                                <li>
                                    <strong>3.</strong> Adjust sliders for
                                    numeric values
                                </li>
                                <li>
                                    <strong>4.</strong> Changes apply
                                    immediately to your model
                                </li>
                            </ol>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">
                                <strong>💡 Pro tip:</strong> Right-click on any
                                component to access additional options like
                                duplication and deletion.
                            </p>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">
                                <strong>💡 Tip:</strong> The properties panel
                                updates automatically when you select different
                                components, so you can quickly switch between
                                configuring multiple elements.
                            </p>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">
                                <strong>💡 Tip:</strong> You can&apos;t select
                                components that are incompatible with your
                                current selection - this helps prevent
                                configuration errors.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mt-8">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Zap className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-medium mb-2">
                            You&apos;re Ready for the Next Step!
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Now that you understand the interface, you&apos;re
                            ready to build your first complete simulation model.
                            The next section will guide you through creating a
                            simple but functional simulation step by step.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
