"use client";

import React, { ChangeEvent, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
    FileIcon,
    Edit,
    Eye,
    LayoutGrid,
    Settings,
    HelpCircle,
    ChevronDown,
    Save,
    Undo,
    Redo,
    Copy,
    Scissors,
    ClipboardPaste,
    ZoomIn,
    ZoomOut,
    Maximize,
    Upload,
    Moon,
    Sun,
    Keyboard,
    Pencil,
    Check,
    Download,
    BookOpen,
    ArrowRight,
    ArrowDown,
    Code,
} from "lucide-react";
import { KeyboardShortcuts, formatShortcut } from "@/lib/constants/shortcuts";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectExportService } from "@/services/ProjectExportService";
import { CommandController } from "@/controllers/CommandController";
import { toast } from "sonner";
import superjson from "superjson";
import { FlowDirection } from "@/services/DagreLayoutService";

interface SerializedState {
    projectName: string;
    nodes: any[];
    edges: any[];
    metadata: any;
}

interface ToolbarProps {
    onNewProject?: () => void;
    onSave?: () => void;
    onLoad?: (event: ChangeEvent<HTMLInputElement>) => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onFitView?: () => void;
    onToggleDarkMode?: () => void;
    isDarkMode?: boolean;
    lastAction?: string;
    onShowShortcuts?: () => void;
    onCopy?: () => void;
    onPaste?: () => void;
    onToggleSidebar?: () => void;
    onToggleMinimap?: () => void;
    onToggleControls?: () => void;
    isSidebarVisible?: boolean;
    isMinimapVisible?: boolean;
    isControlsVisible?: boolean;
    onToggleDevMode?: () => void;
    isDevModeEnabled?: boolean;
}

export function Toolbar({
    onNewProject,
    onSave,
    onLoad,
    onZoomIn,
    onZoomOut,
    onFitView,
    onToggleDarkMode,
    isDarkMode,
    lastAction,
    onShowShortcuts,
    onCopy,
    onPaste,
    onToggleSidebar,
    onToggleMinimap,
    onToggleControls,
    isSidebarVisible,
    isMinimapVisible,
    isControlsVisible,
    onToggleDevMode,
    isDevModeEnabled,
}: ToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const [isExporting, setIsExporting] = useState(false);
    const {
        undo,
        redo,
        canUndo,
        canRedo,
        projectName,
        updateProjectName,
        metadata,
    } = useStore();
    const getSerializedState = useStore.getState().getSerializedState;
    const commandController = CommandController.getInstance();
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(projectName);
    const inputRef = useRef<HTMLInputElement>(null);

    const [formattedDate, setFormattedDate] = useState<string>("");
    const [flowDirection, setFlowDirection] = useState<FlowDirection>("LR");

    useEffect(() => {
        setNameValue(projectName);
    }, [projectName]);

    useEffect(() => {
        if (isEditingName && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditingName]);

    useEffect(() => {
        if (metadata?.modified) {
            try {
                const date = new Date(metadata.modified);
                setFormattedDate(
                    date.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                );
            } catch (e) {
                setFormattedDate("Unknown");
            }
        }
    }, [metadata?.modified]);

    const handleNameSubmit = () => {
        updateProjectName(nameValue);
        setIsEditingName(false);
    };

    const handleDirectionalLayout = (direction: FlowDirection) => {
        try {
            setFlowDirection(direction);
            commandController.applyDagreLayout(direction);
            toast.success(
                `${
                    direction === "LR" ? "Horizontal" : "Vertical"
                } layout applied successfully`
            );
        } catch (error) {
            console.error("Error applying layout:", error);
            toast.error("Failed to apply layout");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleNameSubmit();
        } else if (e.key === "Escape") {
            setNameValue(projectName);
            setIsEditingName(false);
        }
    };

    const handleFileUploadClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleExportToSimulator = async () => {
        setIsExporting(true);
        try {
            const diagramData = getSerializedState();

            const parsedState = superjson.parse(diagramData) as SerializedState;

            const exportData = ProjectExportService.convertToStructuredModel({
                json: {
                    nodes: parsedState.nodes || [],
                    edges: parsedState.edges || [],
                },
            });

            const exportJson = JSON.stringify(exportData, null, 2);

            sessionStorage.setItem("o2des_export_json", exportJson);
            sessionStorage.setItem("o2des_diagram_serialized", diagramData);

            const stored = sessionStorage.getItem("o2des_export_json");
            const storedDiagram = sessionStorage.getItem(
                "o2des_diagram_serialized"
            );

            router.push("/export");

            toast.success("Export data prepared successfully");
        } catch (error) {
            console.error("Export failed:", error);
            console.error(
                "Error stack:",
                error instanceof Error ? error.stack : "No stack trace"
            );
            toast.error("Failed to export diagram", {
                description:
                    error instanceof Error ? error.message : "Unknown error",
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex items-center h-10 px-2 border-b bg-background">
            <div className="flex items-center space-x-1">
                {/* Logo */}
                <div className="w-6 h-6 bg-orange-500 flex items-center justify-center rounded">
                    <FileIcon className="h-4 w-4 text-white" />
                </div>

                {/* Project Name */}
                <div className="flex items-center mr-4 h-8">
                    {isEditingName ? (
                        <div className="flex items-center bg-secondary/30 rounded px-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={nameValue}
                                onChange={(e) => setNameValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleNameSubmit}
                                className="border-none bg-transparent focus:outline-none focus:ring-1 focus:ring-primary h-8 px-2 text-sm font-medium w-48"
                                aria-label="Project name"
                            />
                            <Button
                                onClick={handleNameSubmit}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-1"
                                aria-label="Save project name"
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div
                            className="flex items-center cursor-pointer hover:bg-secondary/30 rounded px-2 h-8 transition-colors"
                            onClick={() => setIsEditingName(true)}
                            title="Click to edit project name"
                        >
                            <span className="text-sm font-medium text-foreground">
                                {projectName}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-1 opacity-50 hover:opacity-100 transition-opacity"
                                aria-label="Edit project name"
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* File Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                            File
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={onNewProject}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <FileIcon className="mr-2 h-4 w-4" />
                                    New Project
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(
                                        KeyboardShortcuts.NEW_PROJECT
                                    )}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={onSave}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Download className="mr-2 h-4 w-4" />
                                    Save Project
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.SAVE)}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleFileUploadClick}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Load Project
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.LOAD)}
                                </span>
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={handleExportToSimulator}
                            disabled={isExporting}
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            {isExporting
                                ? "Exporting..."
                                : "Export to Simulator"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={onLoad}
                />

                {/* Edit Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                            Edit
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={undo} disabled={!canUndo()}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Undo className="mr-2 h-4 w-4" />
                                    Undo
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.UNDO)}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={redo} disabled={!canRedo()}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Redo className="mr-2 h-4 w-4" />
                                    Redo
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.REDO)}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={onCopy}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.COPY)}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Scissors className="mr-2 h-4 w-4" />
                                    Cut
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.CUT)}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onPaste}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <ClipboardPaste className="mr-2 h-4 w-4" />
                                    Paste
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.PASTE)}
                                </span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* View Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                            View
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onZoomIn?.()}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <ZoomIn className="mr-2 h-4 w-4" />
                                    Zoom In
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.ZOOM_IN)}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onZoomOut?.()}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <ZoomOut className="mr-2 h-4 w-4" />
                                    Zoom Out
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.ZOOM_OUT)}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onFitView}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Maximize className="mr-2 h-4 w-4" />
                                    Fit to View
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.FIT_VIEW)}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <Separator className="my-1" />
                        <DropdownMenuItem onSelect={onToggleDarkMode}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    {isDarkMode ? (
                                        <Sun className="mr-2 h-4 w-4" />
                                    ) : (
                                        <Moon className="mr-2 h-4 w-4" />
                                    )}
                                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(
                                        KeyboardShortcuts.TOGGLE_DARK_MODE
                                    )}
                                </span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Layout Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                            Layout
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem
                            onSelect={() => handleDirectionalLayout("LR")}
                        >
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Horizontal Flow
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => handleDirectionalLayout("TB")}
                        >
                            <ArrowDown className="mr-2 h-4 w-4" />
                            Vertical Flow
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Extras Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                            Extras
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={onToggleSidebar}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    {isSidebarVisible
                                        ? "Hide Sidebar"
                                        : "Show Sidebar"}
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(
                                        KeyboardShortcuts.TOGGLE_SIDEBAR
                                    )}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onToggleMinimap}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Eye className="mr-2 h-4 w-4" />
                                    {isMinimapVisible
                                        ? "Hide Minimap"
                                        : "Show Minimap"}
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(
                                        KeyboardShortcuts.TOGGLE_MINIMAP
                                    )}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onToggleControls}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    {isControlsVisible
                                        ? "Hide Controls"
                                        : "Show Controls"}
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(
                                        KeyboardShortcuts.TOGGLE_CONTROLS
                                    )}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={onToggleDevMode}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Code className="mr-2 h-4 w-4" />
                                    {isDevModeEnabled
                                        ? "Disable Developer Mode"
                                        : "Enable Developer Mode"}
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(
                                        KeyboardShortcuts.TOGGLE_DEV_MODE
                                    )}
                                </span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Help Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                            Help
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                            <Link
                                href="/user-guide"
                                className="flex items-center w-full"
                            >
                                <BookOpen className="mr-2 h-4 w-4" />
                                User Guide
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={onShowShortcuts}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Keyboard className="mr-2 h-4 w-4" />
                                    Keyboard Shortcuts
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(
                                        KeyboardShortcuts.SHOW_SHORTCUTS
                                    )}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Documentation
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="ml-auto flex items-center space-x-2">
                {/* Dev Mode Badge */}
                {isDevModeEnabled && (
                    <Button
                        onClick={onToggleDevMode}
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 font-semibold"
                        title="Click to disable developer mode"
                    >
                        DEV MODE
                    </Button>
                )}

                {/* Last modified info */}
                {formattedDate && (
                    <div className="text-xs text-muted-foreground flex items-center mr-2">
                        <span className="mr-1">Last modified:</span>
                        <span className="font-medium">{formattedDate}</span>
                    </div>
                )}
                <span className="text-xs text-muted-foreground">
                    {lastAction || "All changes saved"}
                </span>
            </div>
        </div>
    );
}
