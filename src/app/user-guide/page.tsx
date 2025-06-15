"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Introduction } from "@/components/UserGuide/Introduction";
import { InterfaceOverview } from "@/components/UserGuide/InterfaceOverview";
import { FirstModelTutorial } from "@/components/UserGuide/FirstModelTutorial";
import { ComponentLibrary } from "@/components/UserGuide/ComponentLibrary";

function useIsMac() {
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
    }, []);

    return isMac;
}

function getModifierKey(isMac: boolean) {
    return isMac ? "Cmd" : "Ctrl";
}

export default function UserGuide() {
    const isMac = useIsMac();
    const modKey = getModifierKey(isMac);

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Studio
                                </Button>
                            </Link>
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                <h1 className="text-xl font-semibold">
                                    User Guide
                                </h1>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8 max-w-4xl">
                <Introduction />

                {/* Quick Navigation */}
                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6">
                        Guide Contents
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            {
                                title: "Interface Overview",
                                description:
                                    "Learn about the main interface components",
                                href: "#interface",
                            },
                            {
                                title: "Creating Your First Model",
                                description:
                                    "Step-by-step tutorial for beginners",
                                href: "#first-model",
                            },
                            {
                                title: "Component Library",
                                description:
                                    "Explore available simulation components",
                                href: "#components",
                            },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="bg-card border border-border rounded-lg p-4 hover:bg-card/80 transition-colors"
                            >
                                <h3 className="font-medium mb-2">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    {item.description}
                                </p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:text-primary/80 p-0 h-auto font-medium"
                                >
                                    Read more →
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>

                <InterfaceOverview modKey={modKey} />

                <FirstModelTutorial />

                <ComponentLibrary />

                {/* Quick Start CTA */}
                <section className="text-center">
                    <div className="bg-card border border-border rounded-lg p-8">
                        <h2 className="text-2xl font-semibold mb-4">
                            Ready to Start Building?
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            Jump right into O²DES Studio and start creating your
                            first simulation model.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/">
                                <Button size="lg" className="gap-2">
                                    <Settings className="h-4 w-4" />
                                    Open Studio
                                </Button>
                            </Link>
                            <Button variant="outline" size="lg">
                                Continue Reading Guide
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
