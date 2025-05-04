import { useStore } from "../store";
import { SerializationService } from "./SerializationService";
import { toast } from "sonner";
import superjson from "superjson";

interface SerializedState {
    projectName: string;
    nodes: any[];
    edges: any[];
    metadata: {
        version: string;
        created: string;
        modified: string;
        projectName: string;
        description?: string;
        author?: string;
        tags?: string[];
    };
}

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
    private readonly DEBOUNCE_DELAY = 500;

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
                    return;
                }

                const serializedState = store.getSerializedState();

                const parsedState =
                    superjson.parse<SerializedState>(serializedState);

                const wrappedState = JSON.stringify({
                    json: parsedState,
                    meta: {
                        values: {},
                    },
                });

                sessionStorage.setItem(this.STORAGE_KEY, wrappedState);

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
        try {
            const savedState = sessionStorage.getItem(this.STORAGE_KEY);
            if (!savedState) return false;

            const parsed = JSON.parse(savedState);

            const projectData = parsed.json || parsed;

            return !!(
                projectData &&
                projectData.nodes &&
                Array.isArray(projectData.nodes) &&
                projectData.nodes.length > 0 &&
                projectData.edges &&
                Array.isArray(projectData.edges)
            );
        } catch (error) {
            console.error("Error checking saved state:", error);
            return false;
        }
    }

    /**
     * Load the autosaved project state from session storage
     */
    public loadSavedState(): void {
        try {
            const savedState = sessionStorage.getItem(this.STORAGE_KEY);
            if (!savedState) return;

            const parsed = JSON.parse(savedState);

            const projectData = parsed.json || parsed;

            const superJsonData = superjson.stringify(projectData);

            useStore.getState().loadSerializedState(superJsonData);
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
    }
}
