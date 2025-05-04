import { useEffect } from "react";
import { useStore } from "@/store";
import { KeyboardShortcuts } from "@/lib/constants/shortcuts";

interface UseKeyboardShortcutsProps {
    onSave?: () => void;
    onLoad?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onFitView?: () => void;
    onToggleDarkMode?: () => void;
    onShowShortcuts?: () => void;
}

export function useKeyboardShortcuts({
    onSave,
    onLoad,
    onZoomIn,
    onZoomOut,
    onFitView,
    onToggleDarkMode,
    onShowShortcuts,
}: UseKeyboardShortcutsProps) {
    const { undo, redo } = useStore();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check if the key is pressed with the correct modifier (Command/Control)
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
                // case "s":
                //     event.preventDefault();
                //     onSave?.();
                //     break;
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
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        onSave,
        onLoad,
        onZoomIn,
        onZoomOut,
        onFitView,
        onToggleDarkMode,
        onShowShortcuts,
        undo,
        redo,
    ]);
}
