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
import { DevModeDialog } from "@/components/DevModeDialog";

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
    const refreshEdgeMarkerColors = useStore(
        (state) => state.refreshEdgeMarkerColors
    );
    const devMode = useStore((state) => state.devMode);
    const setDevMode = useStore((state) => state.setDevMode);

    const getSerializedState = useStore.getState().getSerializedState;
    const loadSerializedState = useStore.getState().loadSerializedState;

    const [isDarkMode, setIsDarkMode] = useState(true);
    const [lastAction, setLastAction] = useState<string>("");
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [isMinimapVisible, setIsMinimapVisible] = useState(true);
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
    const [isDevModeDialogOpen, setIsDevModeDialogOpen] = useState(false);
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
        refreshEdgeMarkerColors();
        setLastAction(`Switched to ${isDarkMode ? "light" : "dark"} mode`);
    }, [isDarkMode, refreshEdgeMarkerColors]);

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

    const handleOpenDevModeDialog = useCallback(() => {
        if (devMode.isEnabled) {
            // If already enabled, disable it directly
            setDevMode(false);
            toast.info("Developer mode disabled", {
                description: "Syntax validation is now enabled",
            });
            setLastAction("Developer mode disabled");
        } else {
            // If disabled, open dialog to enable
            setIsDevModeDialogOpen(true);
        }
    }, [devMode.isEnabled, setDevMode]);

    const handleDevModeEnabled = useCallback(() => {
        setDevMode(true);
        toast.success("Developer mode enabled", {
            description: "Syntax validation is now disabled",
        });
        setLastAction("Developer mode enabled");
    }, [setDevMode]);

    const handleCloseDevModeDialog = useCallback(() => {
        setIsDevModeDialogOpen(false);
    }, []);

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

            // Dev mode shortcut: Ctrl+Shift+E or Meta+Shift+E
            if (event.key === "E" && event.shiftKey && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                handleOpenDevModeDialog();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isShortcutsDialogOpen, handleCloseShortcuts, handleOpenDevModeDialog]);

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
                onToggleDevMode={handleOpenDevModeDialog}
                isDevModeEnabled={devMode.isEnabled}
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
            <DevModeDialog
                isOpen={isDevModeDialogOpen}
                onClose={handleCloseDevModeDialog}
                onSuccess={handleDevModeEnabled}
            />
        </div>
    );
}
