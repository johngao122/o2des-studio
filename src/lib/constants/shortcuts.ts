export const KeyboardShortcuts = {
    SAVE: ["Meta", "S"],
    LOAD: ["Meta", "O"],
    UNDO: ["Meta", "Z"],
    REDO: ["Meta", "Shift", "Z"],
    COPY: ["Meta", "C"],
    CUT: ["Meta", "X"],
    PASTE: ["Meta", "V"],
    ZOOM_IN: ["Meta", "="],
    ZOOM_OUT: ["Meta", "-"],
    FIT_VIEW: ["Meta", "0"],
    TOGGLE_DARK_MODE: ["Meta", "Shift", "D"],
    TOGGLE_SIDEBAR: ["Meta", "B"],
    TOGGLE_MINIMAP: ["Meta", "M"],
    TOGGLE_CONTROLS: ["Meta", "K"],
    SHOW_SHORTCUTS: ["Meta", "/"],
} as const;

export function formatShortcut(keys: readonly string[]): string {
    return keys
        .map((key) => {
            switch (key) {
                case "Meta":
                    return "⌘";
                case "Shift":
                    return "⇧";
                case "Alt":
                    return "⌥";
                case "Control":
                    return "⌃";
                default:
                    return key.toUpperCase();
            }
        })
        .join(" + ");
}
