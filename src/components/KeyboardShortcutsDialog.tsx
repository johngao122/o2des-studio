import React from "react";
import { KeyboardShortcuts, formatShortcut } from "@/lib/constants/shortcuts";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface KeyboardShortcutsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const shortcutDescriptions = {
    NEW_PROJECT: "Create a new project",
    SAVE: "Save current project",
    LOAD: "Load a project file",
    UNDO: "Undo last action",
    REDO: "Redo last undone action",
    COPY: "Copy selected elements",
    CUT: "Cut selected elements",
    PASTE: "Paste copied elements",
    ZOOM_IN: "Zoom in",
    ZOOM_OUT: "Zoom out",
    FIT_VIEW: "Fit all elements to view",
    TOGGLE_DARK_MODE: "Toggle dark/light mode",
    TOGGLE_SIDEBAR: "Show/hide sidebar",
    TOGGLE_MINIMAP: "Show/hide minimap",
    TOGGLE_CONTROLS: "Show/hide controls",
    SHOW_SHORTCUTS: "Show keyboard shortcuts",
    TOGGLE_DEV_MODE: "Toggle developer mode",
} as const;

export function KeyboardShortcutsDialog({
    isOpen,
    onClose,
}: KeyboardShortcutsDialogProps) {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Keyboard Shortcuts
                    </h2>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-6">
                    <div className="grid gap-3">
                        {Object.entries(KeyboardShortcuts).map(
                            ([key, shortcut]) => (
                                <div
                                    key={key}
                                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                                >
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {
                                            shortcutDescriptions[
                                                key as keyof typeof shortcutDescriptions
                                            ]
                                        }
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded border border-gray-300 dark:border-zinc-600">
                                            {formatShortcut(shortcut)}
                                        </kbd>
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            Press{" "}
                            <kbd className="px-1 py-0.5 text-xs font-mono bg-gray-100 dark:bg-zinc-700 rounded">
                                Esc
                            </kbd>{" "}
                            or click outside to close
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
