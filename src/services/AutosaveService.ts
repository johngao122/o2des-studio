import { useStore } from "../store";
import { SerializationService } from "./SerializationService";
import { toast } from "sonner";

/**
 * Service to handle autosaving the project state to session storage
 */
export class AutosaveService {
    private static instance: AutosaveService;
    private serializationService: SerializationService;
    private debounceTimeout: NodeJS.Timeout | null = null;
    private readonly STORAGE_KEY = "o2des_studio_autosave";
    private readonly NOTIFICATION_SHOWN_KEY =
        "o2des_autosave_notification_shown";
    private readonly DEBOUNCE_DELAY = 1000;

    private constructor() {
        this.serializationService = new SerializationService();
    }

    public static getInstance(): AutosaveService {
        if (!AutosaveService.instance) {
            AutosaveService.instance = new AutosaveService();
        }
        return AutosaveService.instance;
    }

    /**
     * Save the current project state to session storage with debouncing
     */
    public autosave(): void {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        this.debounceTimeout = setTimeout(() => {
            try {
                const store = useStore.getState();

                if (!store.nodes.length && !store.edges.length) {
                    console.log("Skipping autosave - project is empty");
                    return;
                }

                const serializedState = store.getSerializedState();

                // Debug logs for serialized state
                console.log("Serialized state for autosave:", serializedState);
                try {
                    const parsedState = JSON.parse(serializedState);
                    console.log("Parsed state:", {
                        projectName: parsedState.projectName,
                        nodesCount: parsedState.nodes?.length || 0,
                        edgesCount: parsedState.edges?.length || 0,
                        metadata: parsedState.metadata,
                    });
                } catch (err) {
                    console.error(
                        "Failed to parse serialized state for debugging:",
                        err
                    );
                }

                sessionStorage.setItem(this.STORAGE_KEY, serializedState);
                console.log("Project autosaved to session storage");

                this.showAutosaveNotification();
            } catch (error) {
                console.error("Error autosaving project:", error);
            }
        }, this.DEBOUNCE_DELAY);
    }

    /**
     * Show a notification about autosave feature (only once per session)
     */
    private showAutosaveNotification(): void {
        if (!sessionStorage.getItem(this.NOTIFICATION_SHOWN_KEY)) {
            toast.info("Autosave enabled", {
                description:
                    "Your project will be automatically saved as you work",
                duration: 5000,
            });
            sessionStorage.setItem(this.NOTIFICATION_SHOWN_KEY, "true");
        }
    }

    /**
     * Check if there's a valid saved project state in session storage
     */
    public hasSavedState(): boolean {
        const savedState = sessionStorage.getItem(this.STORAGE_KEY);
        return !!savedState;
    }

    /**
     * Load the autosaved project state from session storage
     */
    public loadSavedState(): void {
        try {
            const savedState = sessionStorage.getItem(this.STORAGE_KEY);
            if (savedState) {
                console.log("Loading autosaved state:", savedState);
                try {
                    const parsedState = JSON.parse(savedState);
                    console.log("Parsed autosaved state:", {
                        projectName: parsedState.projectName,
                        nodesCount: parsedState.nodes?.length || 0,
                        edgesCount: parsedState.edges?.length || 0,
                        metadata: parsedState.metadata,
                    });
                } catch (err) {
                    console.error(
                        "Failed to parse saved state for debugging:",
                        err
                    );
                }

                useStore.getState().loadSerializedState(savedState);
                console.log("Autosaved project loaded from session storage");
            }
        } catch (error) {
            console.error("Error loading autosaved project:", error);
            toast.error("Could not load autosaved project", {
                description:
                    error instanceof Error
                        ? error.message
                        : "The autosaved data appears to be invalid",
                duration: 4000,
            });
            this.clearSavedState();
        }
    }

    /**
     * Clear the autosaved project state from session storage
     */
    public clearSavedState(): void {
        sessionStorage.removeItem(this.STORAGE_KEY);
        console.log("Autosaved project state cleared");
    }
}
