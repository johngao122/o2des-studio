"use client";

import React, { ChangeEvent, useRef } from "react";
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
    Plus,
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
} from "lucide-react";
import { KeyboardShortcuts, formatShortcut } from "@/lib/constants/shortcuts";
import { useStore } from "@/store";

interface ToolbarProps {
    onSave?: () => void;
    onLoad?: (event: ChangeEvent<HTMLInputElement>) => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onFitView?: () => void;
    onToggleDarkMode?: () => void;
    isDarkMode?: boolean;
    lastAction?: string;
    onShowShortcuts?: () => void;
}

export function Toolbar({
    onSave,
    onLoad,
    onZoomIn,
    onZoomOut,
    onFitView,
    onToggleDarkMode,
    isDarkMode,
    lastAction,
    onShowShortcuts,
}: ToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { undo, redo, canUndo, canRedo } = useStore();

    const handleFileUploadClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="flex items-center h-10 px-2 border-b bg-background">
            <div className="flex items-center space-x-1">
                {/* Logo */}
                <div className="w-6 h-6 bg-orange-500 flex items-center justify-center rounded">
                    <FileIcon className="h-4 w-4 text-white" />
                </div>

                {/* File Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                            File
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={onSave}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
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
                                    Load
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(KeyboardShortcuts.LOAD)}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => {
                                const event = new CustomEvent(
                                    "loadExampleDiagram"
                                );
                                window.dispatchEvent(event);
                            }}
                        >
                            <FileIcon className="mr-2 h-4 w-4" />
                            Load Example
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
                        <DropdownMenuItem>
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
                        <DropdownMenuItem>
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

                {/* Arrange Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                            Arrange
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem>
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            Align
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
                        <DropdownMenuItem>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Component
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Toggle Sidebar
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(
                                        KeyboardShortcuts.TOGGLE_SIDEBAR
                                    )}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Eye className="mr-2 h-4 w-4" />
                                    Toggle Minimap
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(
                                        KeyboardShortcuts.TOGGLE_MINIMAP
                                    )}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Toggle Controls
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    {formatShortcut(
                                        KeyboardShortcuts.TOGGLE_CONTROLS
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
                        <DropdownMenuItem onSelect={onShowShortcuts}>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Settings className="mr-2 h-4 w-4" />
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

            <div className="ml-auto flex items-center">
                <span className="text-xs text-muted-foreground mr-2">
                    {lastAction || "All changes saved"}
                </span>
            </div>
        </div>
    );
}
