import { Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Introduction() {
    return (
        <section className="mb-12">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-foreground mb-4">
                    Welcome to O²DES Studio
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Your comprehensive guide to building, simulating, and
                    analyzing discrete event systems with O²DES Studio.
                </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <Zap className="h-6 w-6 text-primary" />
                    Getting Started
                </h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                    O²DES Studio is a powerful web-based simulation platform
                    designed to help you create, visualize, and analyze discrete
                    event systems. Whether you're modeling manufacturing
                    processes, service systems, or complex workflows, O²DES
                    Studio provides the tools you need to build accurate
                    simulations and gain valuable insights.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">
                            What you can do with O²DES Studio:
                        </h3>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <span>
                                    Build visual simulation models using
                                    drag-and-drop components
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <span>
                                    Configure component properties and behaviors
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <span>
                                    Export and share your simulation models
                                </span>
                            </li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Key Features:</h3>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <span>Intuitive visual modeling interface</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                <span>
                                    Rich component library for common simulation
                                    elements
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium mb-2">
                            New to Discrete Event Simulation?
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Don't worry! This guide will walk you through the
                            basics of discrete event modeling and show you how
                            to leverage O²DES Studio's powerful features to
                            create your first simulation.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
