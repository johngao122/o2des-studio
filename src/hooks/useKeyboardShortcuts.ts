import { useEffect } from "react";
import { useStore } from "@/store";
import { KeyboardShortcuts } from "@/lib/constants/shortcuts";

interface UseKeyboardShortcutsProps {
    onNewProject?: () => void;
    onSave?: () => void;
    onLoad?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onFitView?: () => void;
    onToggleDarkMode?: () => void;
    onShowShortcuts?: () => void;
    onCopy?: () => void;
    onPaste?: () => void;
    onToggleSidebar?: () => void;
    onToggleMinimap?: () => void;
    onToggleControls?: () => void;
}

export function useKeyboardShortcuts({
    onNewProject,
    onSave,
    onLoad,
    onZoomIn,
    onZoomOut,
    onFitView,
    onToggleDarkMode,
    onShowShortcuts,
    onCopy,
    onPaste,
    onToggleSidebar,
    onToggleMinimap,
    onToggleControls,
}: UseKeyboardShortcutsProps) {
    const { undo, redo } = useStore();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
            const modifier = isMac ? event.metaKey : event.ctrlKey;

            if (!modifier) return;

            switch (event.key.toLowerCase()) {
                case "z":
                    if (event.shiftKey) {
                        event.preventDefault();
                        redo();
                    } else {
                        event.preventDefault();
                        undo();
                    }
                    break;

                case "c":
                    event.preventDefault();
                    onCopy?.();
                    break;

                case "v":
                    event.preventDefault();
                    onPaste?.();
                    break;

                case "o":
                    event.preventDefault();
                    onLoad?.();
                    break;
                case "=":
                    event.preventDefault();
                    onZoomIn?.();
                    break;
                case "-":
                    event.preventDefault();
                    onZoomOut?.();
                    break;
                case "0":
                    event.preventDefault();
                    onFitView?.();
                    break;
                case "d":
                    if (event.shiftKey) {
                        event.preventDefault();
                        onToggleDarkMode?.();
                    }
                    break;
                case "/":
                    event.preventDefault();
                    onShowShortcuts?.();
                    break;
                case "n":
                    event.preventDefault();
                    onNewProject?.();
                    break;
                case "b":
                    event.preventDefault();
                    onToggleSidebar?.();
                    break;
                case "m":
                    event.preventDefault();
                    onToggleMinimap?.();
                    break;
                case "k":
                    event.preventDefault();
                    onToggleControls?.();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        onNewProject,
        onSave,
        onLoad,
        onZoomIn,
        onZoomOut,
        onFitView,
        onToggleDarkMode,
        onShowShortcuts,
        onCopy,
        onPaste,
        onToggleSidebar,
        onToggleMinimap,
        onToggleControls,
        undo,
        redo,
    ]);
}
