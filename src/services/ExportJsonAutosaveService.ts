import { toast } from "sonner";

/**
 * Service to handle autosaving the export JSON data to session storage
 */
export class ExportJsonAutosaveService {
    private static instance: ExportJsonAutosaveService;
    private debounceTimeout: NodeJS.Timeout | null = null;
    private readonly STORAGE_KEY = "o2des_export_json_autosave";
    private readonly DEBOUNCE_DELAY = 1000;

    private constructor() {}

    public static getInstance(): ExportJsonAutosaveService {
        if (!ExportJsonAutosaveService.instance) {
            ExportJsonAutosaveService.instance =
                new ExportJsonAutosaveService();
        }
        return ExportJsonAutosaveService.instance;
    }

    /**
     * Save the export JSON data to session storage with debouncing
     */
    public autosaveJson(jsonData: any): void {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        this.debounceTimeout = setTimeout(() => {
            try {
                const serializedData = JSON.stringify(jsonData, null, 2);
                sessionStorage.setItem(this.STORAGE_KEY, serializedData);
            } catch (error) {
                console.error("Error autosaving export JSON:", error);
                toast.error("Failed to autosave JSON changes");
            }
        }, this.DEBOUNCE_DELAY);
    }

    /**
     * Load the autosaved export JSON data from session storage
     */
    public loadSavedJson(): any | null {
        try {
            const savedData = sessionStorage.getItem(this.STORAGE_KEY);
            if (!savedData) return null;

            return JSON.parse(savedData);
        } catch (error) {
            console.error("Error loading autosaved export JSON:", error);
            this.clearSavedJson();
            return null;
        }
    }

    /**
     * Check if there's autosaved JSON data
     */
    public hasSavedJson(): boolean {
        try {
            const savedData = sessionStorage.getItem(this.STORAGE_KEY);
            return savedData !== null && savedData.trim() !== "";
        } catch (error) {
            console.error("Error checking for saved JSON:", error);
            return false;
        }
    }

    /**
     * Clear the autosaved export JSON data from session storage
     */
    public clearSavedJson(): void {
        sessionStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Update the original export data in session storage
     */
    public updateOriginalExportData(jsonData: any): void {
        try {
            const serializedData = JSON.stringify(jsonData, null, 2);
            sessionStorage.setItem("o2des_export_json", serializedData);
        } catch (error) {
            console.error("Error updating original export data:", error);
        }
    }
}
