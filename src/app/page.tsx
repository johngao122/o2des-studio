"use client";

import "reactflow/dist/style.css";
import { useStore } from "../store";
import { Toolbar } from "@/components/Toolbar";
import ComponentDrawer from "@/components/ComponentDrawer";
import { useCallback, useState, useRef, useEffect } from "react";
import { DiagramCanvas } from "@/components/DiagramCanvas";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ViewController } from "@/controllers/ViewController";
import { PropertiesBar } from "@/components/PropertiesBar";
import { toast } from "sonner";
import { SerializationService } from "@/services/SerializationService";
import { AutosaveService } from "@/services/AutosaveService";
import superjson from "superjson";

const viewController = new ViewController();
const serializationService = new SerializationService();
const autosaveService = AutosaveService.getInstance();

export default function DiagramEditor() {
    const {
        getSerializedState,
        loadSerializedState,
        selectedProperties,
        updateSelectedProperties,
        projectName,
        selectionInfo,
    } = useStore();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [lastAction, setLastAction] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        document.title = `${projectName} - O²DES Studio`;
    }, [projectName]);

    useEffect(() => {
        if (autosaveService.hasSavedState()) {
            autosaveService.loadSavedState();
            toast.success("Autosaved project restored", {
                description: "Your last session has been restored",
                duration: 3000,
            });
            setLastAction("Autosaved project restored");
        }
    }, []);

    const handleSave = useCallback(() => {
        try {
            const state = getSerializedState();

            const parsedState = superjson.parse(state);

            const fileState = JSON.stringify({
                json: parsedState,
                meta: {
                    values: {},
                },
            });

            const blob = new Blob([fileState], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${projectName
                .replace(/\s+/g, "_")
                .toLowerCase()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Project saved successfully", {
                description: `Saved as ${a.download}`,
                duration: 3000,
            });
            setLastAction("Project saved");

            autosaveService.clearSavedState();
        } catch (error) {
            console.error("Error saving project:", error);
            toast.error("Failed to save project", {
                description:
                    "An unexpected error occurred while saving your project.",
                duration: 4000,
            });
        }
    }, [getSerializedState, projectName]);

    const handleLoad = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = (e) => {
                const safeLoadProject = () => {
                    try {
                        const content = e.target?.result as string;

                        if (typeof content !== "string") {
                            toast.error("Invalid file", {
                                description: "File could not be read as text",
                                duration: 4000,
                            });
                            return;
                        }

                        let parsedContent;
                        try {
                            parsedContent = JSON.parse(content);
                        } catch (jsonError) {
                            let errorMessage = "Invalid JSON format";
                            if (jsonError instanceof Error) {
                                errorMessage = jsonError.message;
                            }
                            toast.error("Invalid save file", {
                                description: errorMessage,
                                duration: 4000,
                            });
                            return;
                        }

                        let projectData = parsedContent;
                        if (
                            parsedContent.json &&
                            typeof parsedContent.json === "object"
                        ) {
                            console.log(
                                "Detected nested JSON format, unwrapping..."
                            );
                            projectData = parsedContent.json;
                        }

                        if (
                            !projectData.nodes ||
                            !Array.isArray(projectData.nodes)
                        ) {
                            toast.error("Invalid project file", {
                                description:
                                    "Missing nodes array in project file",
                                duration: 4000,
                            });
                            return;
                        }

                        if (
                            !projectData.edges ||
                            !Array.isArray(projectData.edges)
                        ) {
                            toast.error("Invalid project file", {
                                description:
                                    "Missing edges array in project file",
                                duration: 4000,
                            });
                            return;
                        }

                        try {
                            const superJsonData =
                                superjson.stringify(projectData);

                            loadSerializedState(superJsonData);

                            toast.success("Project loaded successfully", {
                                description: `Loaded from ${file.name}`,
                                duration: 3000,
                            });
                            setLastAction("Project loaded");

                            autosaveService.clearSavedState();
                        } catch (loadError) {
                            console.error(
                                "Error in loadSerializedState:",
                                loadError
                            );
                            toast.error("Failed to load project", {
                                description:
                                    loadError instanceof Error
                                        ? loadError.message
                                        : "Error loading project data",
                                duration: 4000,
                            });
                        }
                    } catch (error) {
                        console.error("Project loading error:", error);
                        toast.error("Failed to load project", {
                            description:
                                error instanceof Error
                                    ? error.message
                                    : "An unexpected error occurred",
                            duration: 4000,
                        });
                    }
                };

                safeLoadProject();
            };

            reader.onerror = () => {
                toast.error("Failed to read file", {
                    description: "Could not read the selected file.",
                    duration: 4000,
                });
            };

            reader.readAsText(file);
            event.target.value = "";
        },
        [loadSerializedState]
    );

    const handleZoomIn = useCallback(() => {
        viewController.zoomIn();
        setLastAction("Zoomed in");
    }, []);

    const handleZoomOut = useCallback(() => {
        viewController.zoomOut();
        setLastAction("Zoomed out");
    }, []);

    const handleFitView = useCallback(() => {
        setLastAction("Fit to view");
    }, []);

    const handleToggleDarkMode = useCallback(() => {
        setIsDarkMode((prev) => !prev);
        document.documentElement.classList.toggle("dark");
        setLastAction(`Switched to ${isDarkMode ? "light" : "dark"} mode`);
    }, [isDarkMode]);

    const handleShowShortcuts = useCallback(() => {
        setLastAction("Showing shortcuts");
    }, []);

    useKeyboardShortcuts({
        onSave: handleSave,
        onLoad: () => fileInputRef.current?.click(),
        onZoomIn: handleZoomIn,
        onZoomOut: handleZoomOut,
        onFitView: handleFitView,
        onToggleDarkMode: handleToggleDarkMode,
        onShowShortcuts: handleShowShortcuts,
    });

    return (
        <div className="w-screen h-screen flex flex-col">
            <Toolbar
                onSave={handleSave}
                onLoad={handleLoad}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitView={handleFitView}
                onToggleDarkMode={handleToggleDarkMode}
                isDarkMode={isDarkMode}
                lastAction={lastAction}
                onShowShortcuts={handleShowShortcuts}
            />
            <div className="flex-1 flex">
                <ComponentDrawer />
                <DiagramCanvas />
                {selectedProperties.length > 0 || selectionInfo ? (
                    <PropertiesBar
                        properties={selectedProperties}
                        onPropertyChange={(key, value) => {
                            const updatedProperties = selectedProperties.map(
                                (prop) =>
                                    prop.key === key ? { ...prop, value } : prop
                            );
                            updateSelectedProperties(updatedProperties);
                        }}
                        selectionInfo={selectionInfo}
                    />
                ) : null}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleLoad}
            />
        </div>
    );
}
