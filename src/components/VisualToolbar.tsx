import React from "react";
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
    Eye,
    LayoutGrid,
    Plus,
    Settings,
    HelpCircle,
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
    Download,
    BookOpen,
} from "lucide-react";

interface VisualToolbarProps {
    className?: string;
    projectName?: string;
    lastAction?: string;
    isDarkMode?: boolean;
    showModifiedDate?: boolean;
}

export function VisualToolbar({
    className = "",
    projectName = "Sample Project",
    lastAction = "All changes saved",
    isDarkMode = true,
    showModifiedDate = true,
}: VisualToolbarProps) {
    const formattedDate = "Dec 15, 2:30 PM";

    return (
        <div
            className={`flex items-center h-10 px-2 border-b bg-background ${className}`}
        >
            <div className="flex items-center space-x-1">
                {/* Logo */}
                <div className="w-6 h-6 bg-orange-500 flex items-center justify-center rounded">
                    <FileIcon className="h-4 w-4 text-white" />
                </div>

                {/* Project Name */}
                <div className="flex items-center mr-4 h-8">
                    <div
                        className="flex items-center cursor-pointer hover:bg-secondary/30 rounded px-2 h-8 transition-colors"
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
                </div>

                {/* File Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                            File
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <FileIcon className="mr-2 h-4 w-4" />
                                    New Project
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    Ctrl+N
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Download className="mr-2 h-4 w-4" />
                                    Save Project
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    Ctrl+S
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Load Project
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    Ctrl+O
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <FileIcon className="mr-2 h-4 w-4" />
                            Load Example
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Export to Simulator
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Edit Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                            Edit
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Undo className="mr-2 h-4 w-4" />
                                    Undo
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    Ctrl+Z
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Redo className="mr-2 h-4 w-4" />
                                    Redo
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    Ctrl+Y
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
                                    Ctrl+C
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
                                    Ctrl+X
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
                                    Ctrl+V
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
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <ZoomIn className="mr-2 h-4 w-4" />
                                    Zoom In
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    Ctrl++
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <ZoomOut className="mr-2 h-4 w-4" />
                                    Zoom Out
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    Ctrl+-
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Maximize className="mr-2 h-4 w-4" />
                                    Fit to View
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    Ctrl+0
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <Separator className="my-1" />
                        <DropdownMenuItem>
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
                                    Ctrl+D
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
                            Auto Layout
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
                                    Ctrl+B
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
                                    Ctrl+M
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
                                    Ctrl+Shift+C
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
                        <DropdownMenuItem>
                            <BookOpen className="mr-2 h-4 w-4" />
                            User Guide
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <div className="flex justify-between w-full items-center">
                                <div className="flex items-center">
                                    <Keyboard className="mr-2 h-4 w-4" />
                                    Keyboard Shortcuts
                                </div>
                                <span className="text-xs text-muted-foreground ml-8">
                                    ?
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
                {/* Last modified info */}
                {showModifiedDate && (
                    <div className="text-xs text-muted-foreground flex items-center mr-2">
                        <span className="mr-1">Last modified:</span>
                        <span className="font-medium">{formattedDate}</span>
                    </div>
                )}
                <span className="text-xs text-muted-foreground">
                    {lastAction}
                </span>
            </div>
        </div>
    );
}
