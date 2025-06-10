import Image from "next/image";
import { Zap } from "lucide-react";

import Step1Screenshot from "@/screenshots/CreatingYourFirstModel/Step 1.png";
import Step2Screenshot from "@/screenshots/CreatingYourFirstModel/Step 2.png";
import Step3Screenshot from "@/screenshots/CreatingYourFirstModel/Step 3.png";
import Step4Screenshot from "@/screenshots/CreatingYourFirstModel/Step 4.png";

export function FirstModelTutorial() {
    return (
        <section className="mb-12" id="first-model">
            <h2 className="text-3xl font-bold mb-8">
                Creating Your First Model
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
                Follow this step-by-step tutorial to create your first complete
                simulation model. We'll build a simple server system and export
                it for simulation.
            </p>

            <div className="space-y-8">
                {/* Step 1: Draw the Model */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-emerald-600 font-bold text-lg">
                                1
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2">
                                Step 1: Draw the Model
                            </h3>
                            <p className="text-muted-foreground">
                                Create the basic structure of your simulation
                                using drag-and-drop components
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="border-l-4 border-emerald-500/50 pl-4">
                            <h4 className="font-medium mb-3">
                                What you'll build:
                            </h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                A simple queue model with a generator creating
                                customers, a queue for waiting, and a server to
                                process them.
                            </p>

                            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                                    <span className="font-medium text-sm">
                                        Your First Model Components:
                                    </span>
                                </div>
                                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                                    <li>
                                        • <strong>Generator:</strong> Creates
                                        customers at regular intervals
                                    </li>
                                    <li>
                                        • <strong>Activity:</strong> An activity
                                        that takes a certain amount of time to
                                        complete
                                    </li>
                                    <li>
                                        • <strong>Terminator:</strong> The model
                                        ends here
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="border-l-4 border-emerald-500/50 pl-4">
                            <h4 className="font-medium mb-3">
                                Follow these steps:
                            </h4>
                            <ol className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        1
                                    </span>
                                    <div>
                                        <strong>
                                            Open the component drawer
                                        </strong>{" "}
                                        on the left side of the screen
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        2
                                    </span>
                                    <div>
                                        <strong>Drag a Generator</strong> onto
                                        the canvas (left side of your model)
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        3
                                    </span>
                                    <div>
                                        <strong>Add the activities</strong> to
                                        the right of the Generator
                                    </div>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        4
                                    </span>
                                    <div>
                                        <strong>Add a Terminator</strong> at the
                                        end (rightmost position)
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        5
                                    </span>
                                    <div>
                                        <strong>Connect the components</strong>{" "}
                                        by dragging edges between them
                                    </div>
                                </li>
                            </ol>
                        </div>

                        {/* Screenshot */}
                        <div className="mt-6">
                            <div className="border border-border rounded-lg overflow-hidden">
                                <Image
                                    src={Step1Screenshot}
                                    alt="Step 1: Drawing the initial model with Generator, Queue, Server, and Sink components connected in sequence"
                                    className="w-full h-auto"
                                    placeholder="blur"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Your model should look like this after Step 1 -
                                four connected components in a flow
                            </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <p className="text-sm">
                                <strong>💡 Pro tip:</strong> Don't worry about
                                perfect alignment yet - we'll fix that in Step
                                2! Focus on getting all components placed and
                                connected properly.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step 2: Neaten with Auto Align */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 font-bold text-lg">
                                2
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2">
                                Step 2: Neaten the Model with Auto Align
                                (Optional)
                            </h3>
                            <p className="text-muted-foreground">
                                Use O²DES Studio's auto-layout feature to create
                                a clean, professional-looking model
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="border-l-4 border-blue-500/50 pl-4">
                            <h4 className="font-medium mb-3">
                                How to use Auto Align:
                            </h4>
                            <ol className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        1
                                    </span>
                                    <div>
                                        <strong>
                                            Click the "Auto Layout" button
                                        </strong>{" "}
                                        in the toolbar at the top of the screen
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        2
                                    </span>
                                    <div>
                                        <strong>Watch the magic happen!</strong>{" "}
                                        Your components automatically arrange
                                        themselves in a left to right flow
                                    </div>
                                </li>
                            </ol>
                        </div>

                        {/* Screenshot */}
                        <div className="mt-6">
                            <div className="border border-border rounded-lg overflow-hidden">
                                <Image
                                    src={Step2Screenshot}
                                    alt="Step 2: Model after auto-alignment showing neatly spaced components in a clean horizontal layout"
                                    className="w-full h-auto"
                                    placeholder="blur"
                                />
                            </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-sm">
                                <strong>✨ Result:</strong> Your model now has
                                perfect spacing and alignment. This makes it
                                easier to tidy up the model when the model gets
                                too complex
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step 3: Export to Simulator */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-600 font-bold text-lg">
                                3
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2">
                                Step 3: Export to Simulator
                            </h3>
                            <p className="text-muted-foreground">
                                Convert your visual model into simulation-ready
                                code that can be executed
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="border-l-4 border-purple-500/50 pl-4">
                            <h4 className="font-medium mb-3">
                                What happens during export:
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    • <strong>Code generation:</strong> Your
                                    visual model becomes executable simulation
                                    code
                                </li>
                                <li>
                                    • <strong>Parameter extraction:</strong> All
                                    component settings are converted to
                                    simulation parameters
                                </li>
                                <li>
                                    • <strong>Structure validation:</strong> The
                                    system checks your model for completeness
                                </li>
                                <li>
                                    • <strong>JSON output:</strong> Creates a
                                    structured file that simulators can
                                    understand
                                </li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-purple-500/50 pl-4">
                            <h4 className="font-medium mb-3">Export steps:</h4>
                            <ol className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/50 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        1
                                    </span>
                                    <div>
                                        <strong>Save your model first</strong>{" "}
                                        using Ctrl+S (Cmd+S on Mac) to ensure
                                        you don't lose your work
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/50 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        2
                                    </span>
                                    <div>
                                        <strong>
                                            Click the "Export" button
                                        </strong>{" "}
                                        in the top toolbar (usually shows a
                                        download or arrow icon)
                                    </div>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/50 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        3
                                    </span>
                                    <div>
                                        <strong>Download the file</strong> - it
                                        will be a JSON file
                                    </div>
                                </li>
                            </ol>
                        </div>

                        {/* Screenshot */}
                        <div className="mt-6">
                            <div className="border border-border rounded-lg overflow-hidden">
                                <Image
                                    src={Step3Screenshot}
                                    alt="Step 3: Export dialog showing options to export the model to simulator format"
                                    className="w-full h-auto"
                                    placeholder="blur"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                The export dialog - choose your preferred format
                                and download location
                            </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <p className="text-sm">
                                <strong>⚡ What's next:</strong> After export,
                                you'll have a JSON file containing all your
                                model's structure and parameters. This file can
                                be loaded into simulation engines or modified as
                                needed.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step 4: Check and Adjust JSON */}
                <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-600 font-bold text-lg">
                                4
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2">
                                Step 4: Check and Adjust the JSON
                            </h3>
                            <p className="text-muted-foreground">
                                Review and fine-tune your exported simulation
                                parameters
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="border-l-4 border-orange-500/50 pl-4">
                            <h4 className="font-medium mb-3">
                                Why review the JSON?
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>
                                    • <strong>Parameter validation:</strong>{" "}
                                    Ensure all values make sense for your
                                    simulation
                                </li>
                                <li>
                                    • <strong>Fine-tuning:</strong> Adjust
                                    timing, rates, and capacities for realistic
                                    behavior
                                </li>
                                <li>
                                    • <strong>Understanding structure:</strong>{" "}
                                    Learn how your visual model translates to
                                    code
                                </li>
                                <li>
                                    • <strong>Debugging:</strong> Catch any
                                    issues before running the simulation
                                </li>
                            </ul>
                        </div>

                        <div className="border-l-4 border-orange-500/50 pl-4">
                            <h4 className="font-medium mb-3">
                                Key things to check:
                            </h4>
                            <ol className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/50 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        1
                                    </span>
                                    <div>
                                        <strong>Generator settings:</strong>{" "}
                                        Check arrival rates and entity types are
                                        appropriate
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/50 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        2
                                    </span>
                                    <div>
                                        <strong>Entity Relationships:</strong>{" "}
                                        Verify the relationships between the
                                        subflows are correct
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/50 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        3
                                    </span>
                                    <div>
                                        <strong>Connections:</strong> Ensure all
                                        connections are correct
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/50 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
                                        4
                                    </span>
                                    <div>
                                        <strong>User drawing errors:</strong>{" "}
                                        Check for any errors in the model
                                        structure
                                    </div>
                                </li>
                            </ol>
                        </div>

                        <div className="border-l-4 border-orange-500/50 pl-4">
                            <h4 className="font-medium mb-3">
                                Common adjustments:
                            </h4>
                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                <pre className="text-xs text-muted-foreground overflow-x-auto">
                                    {`{
  "generator": {
    "arrivalRate": 1.0,     
    "entityType": "Customer"
  },
  "server": {
    "serviceTime": 2.0,     
    "capacity": 1           
  },
  "queue": {
    "maxCapacity": 10,      
    "discipline": "FIFO"    
  }
}`}
                                </pre>
                            </div>
                        </div>

                        {/* Screenshot */}
                        <div className="mt-6">
                            <div className="border border-border rounded-lg overflow-hidden">
                                <Image
                                    src={Step4Screenshot}
                                    alt="Step 4: JSON editor showing the exported model structure with parameters that can be adjusted"
                                    className="w-full h-auto"
                                    placeholder="blur"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Your exported JSON file opened in an editor -
                                review and adjust parameters as needed
                            </p>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-sm">
                                <strong>🎉 Congratulations!</strong> You've
                                successfully created, refined, and exported your
                                first simulation model. Your JSON file is now
                                ready to be loaded into a simulation engine for
                                execution and analysis.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary and Next Steps */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-lg p-6 mt-8">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Zap className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="font-medium mb-2">
                            What You've Accomplished
                        </h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>
                                ✅ Built a complete simulation model from
                                scratch
                            </li>
                            <li>
                                ✅ Learned the proper workflow for model
                                creation
                            </li>
                            <li>✅ Used auto-layout</li>
                            <li>
                                ✅ Exported your model for simulation execution
                            </li>
                            <li>
                                ✅ Reviewed and understood the generated code
                                structure
                            </li>
                        </ul>
                        <p className="text-sm text-muted-foreground mt-3">
                            You're now ready to explore more advanced features
                            like complex routing, multiple servers, and detailed
                            analytics. The next sections will cover these topics
                            in depth.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
