"use client";

import "reactflow/dist/style.css";
import { useStore } from "../store";
import { Toolbar } from "@/components/Toolbar";
import ComponentDrawer from "@/components/ComponentDrawer";
import { useCallback, useState, useRef } from "react";
import { DiagramCanvas } from "@/components/DiagramCanvas";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ViewController } from "@/controllers/ViewController";
import { PropertiesBar } from "@/components/PropertiesBar";

const viewController = new ViewController();

export default function DiagramEditor() {
    const {
        getSerializedState,
        loadSerializedState,
        selectedProperties,
        updateSelectedProperties,
    } = useStore();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [lastAction, setLastAction] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Placeholder functions for toolbar actions
    const handleSave = useCallback(() => {
        const state = getSerializedState();
        setLastAction("Diagram saved");
    }, [getSerializedState]);

    const handleLoad = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    loadSerializedState(content);
                    setLastAction("Diagram loaded");
                };
                reader.readAsText(file);
            }
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

    // Initialize keyboard shortcuts
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
                {selectedProperties.length > 0 && (
                    <PropertiesBar
                        properties={selectedProperties}
                        onPropertyChange={(key, value) => {
                            const updatedProperties = selectedProperties.map(
                                (prop) =>
                                    prop.key === key ? { ...prop, value } : prop
                            );
                            updateSelectedProperties(updatedProperties);
                        }}
                    />
                )}
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
