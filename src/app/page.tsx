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
import { NodeController } from "@/controllers/NodeController";
import { EdgeController } from "@/controllers/EdgeController";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";

const viewController = ViewController.getInstance();
const serializationService = new SerializationService();
const autosaveService = AutosaveService.getInstance();
const nodeController = new NodeController();
const edgeController = new EdgeController();

export default function DiagramEditor() {
    const selectedProperties = useStore((state) => state.selectedProperties);
    const updateSelectedProperties = useStore(
        (state) => state.updateSelectedProperties
    );
    const projectName = useStore((state) => state.projectName);
    const selectionInfo = useStore((state) => state.selectionInfo);
    const newProject = useStore((state) => state.newProject);
    const copySelectedElements = useStore(
        (state) => state.copySelectedElements
    );
    const pasteElements = useStore((state) => state.pasteElements);

    const getSerializedState = useStore.getState().getSerializedState;
    const loadSerializedState = useStore.getState().loadSerializedState;

    const [isDarkMode, setIsDarkMode] = useState(true);
    const [lastAction, setLastAction] = useState<string>("");
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [isMinimapVisible, setIsMinimapVisible] = useState(true);
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        document.title = `${projectName} - O²DES Studio`;
    }, [projectName]);

    useEffect(() => {
        if (autosaveService.hasSavedState()) {
            try {
                autosaveService.loadSavedState();
                toast.success("Autosaved project restored", {
                    description: "Your last session has been restored",
                    duration: 3000,
                });
                setLastAction("Autosaved project restored");
            } catch (error) {
                console.error("Failed to load autosaved state:", error);
                toast.error("Failed to restore project", {
                    description:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                });
            }
        }
        nodeController.updateAllNodesGraphType();
        edgeController.updateAllEdgesGraphType();
    }, []);

    const handleSave = useCallback(() => {
        try {
            const stateJson = getSerializedState();
            const blob = new Blob([stateJson], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const safeProjectName = projectName
                .replace(/[^a-z0-9_-\s]/gi, "_")
                .replace(/\s+/g, "_");
            a.download = `${safeProjectName || "o2des_project"}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Project saved successfully");
            setLastAction("Project saved");
        } catch (error) {
            console.error("Failed to save project:", error);
            toast.error("Failed to save project");
        }
    }, [getSerializedState, projectName]);

    const handleLoad = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                try {
                    loadSerializedState(content);
                    toast.success("Project loaded successfully");
                    setLastAction(`Loaded project: ${file.name}`);
                } catch (error) {
                    console.error("Failed to load project:", error);
                    toast.error("Failed to load project", {
                        description:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    });
                }
            };
            reader.onerror = (e) => {
                console.error("File reading error:", e);
                toast.error("Failed to read file");
            };
            reader.readAsText(file);
            event.target.value = "";
        },
        []
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
        viewController.fitView();
        setLastAction("Fit to view");
    }, []);

    const handleToggleDarkMode = useCallback(() => {
        setIsDarkMode((prev) => !prev);
        document.documentElement.classList.toggle("dark");
        setLastAction(`Switched to ${isDarkMode ? "light" : "dark"} mode`);
    }, [isDarkMode]);

    const handleShowShortcuts = useCallback(() => {
        setIsShortcutsDialogOpen(true);
        setLastAction("Opened keyboard shortcuts");
    }, []);

    const handleCloseShortcuts = useCallback(() => {
        setIsShortcutsDialogOpen(false);
    }, []);

    const handleNewProject = useCallback(() => {
        newProject();
        toast.success("New project created");
        setLastAction("Created new project");
    }, [newProject]);

    const handleCopy = useCallback(() => {
        copySelectedElements();
    }, [copySelectedElements]);

    const handlePaste = useCallback(() => {
        pasteElements();
    }, [pasteElements]);

    const handleToggleSidebar = useCallback(() => {
        setIsSidebarVisible((prev) => !prev);
        setLastAction(`${isSidebarVisible ? "Hidden" : "Shown"} sidebar`);
    }, [isSidebarVisible]);

    const handleToggleMinimap = useCallback(() => {
        setIsMinimapVisible((prev) => !prev);
        setLastAction(`${isMinimapVisible ? "Hidden" : "Shown"} minimap`);
    }, [isMinimapVisible]);

    const handleToggleControls = useCallback(() => {
        setIsControlsVisible((prev) => !prev);
        setLastAction(`${isControlsVisible ? "Hidden" : "Shown"} controls`);
    }, [isControlsVisible]);

    useKeyboardShortcuts({
        onSave: handleSave,
        onLoad: () => fileInputRef.current?.click(),
        onZoomIn: handleZoomIn,
        onZoomOut: handleZoomOut,
        onFitView: handleFitView,
        onToggleDarkMode: handleToggleDarkMode,
        onShowShortcuts: handleShowShortcuts,
        onNewProject: handleNewProject,
        onCopy: handleCopy,
        onPaste: handlePaste,
        onToggleSidebar: handleToggleSidebar,
        onToggleMinimap: handleToggleMinimap,
        onToggleControls: handleToggleControls,
    });

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isShortcutsDialogOpen) {
                handleCloseShortcuts();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isShortcutsDialogOpen, handleCloseShortcuts]);

    return (
        <div className="w-screen h-screen flex flex-col overflow-hidden">
            <Toolbar
                onNewProject={handleNewProject}
                onSave={handleSave}
                onLoad={handleLoad}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitView={handleFitView}
                onToggleDarkMode={handleToggleDarkMode}
                isDarkMode={isDarkMode}
                lastAction={lastAction}
                onShowShortcuts={handleShowShortcuts}
                onCopy={handleCopy}
                onPaste={handlePaste}
                onToggleSidebar={handleToggleSidebar}
                onToggleMinimap={handleToggleMinimap}
                onToggleControls={handleToggleControls}
                isSidebarVisible={isSidebarVisible}
                isMinimapVisible={isMinimapVisible}
                isControlsVisible={isControlsVisible}
            />
            <div className="flex-1 flex overflow-hidden">
                {isSidebarVisible && <ComponentDrawer />}
                <DiagramCanvas
                    isMinimapVisible={isMinimapVisible}
                    isControlsVisible={isControlsVisible}
                />
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
            <KeyboardShortcutsDialog
                isOpen={isShortcutsDialogOpen}
                onClose={handleCloseShortcuts}
            />
        </div>
    );
}
