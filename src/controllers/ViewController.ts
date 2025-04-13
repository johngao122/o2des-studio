import { useStore } from "../store";

type ViewportUpdater = (x: number, y: number, zoom: number) => void;

export class ViewController {
    private viewportUpdater: ViewportUpdater | null = null;

    setViewportUpdater(updater: ViewportUpdater) {
        this.viewportUpdater = updater;
    }

    setViewport(x: number, y: number, zoom: number) {
        useStore.setState((state) => ({
            viewportTransform: { x, y, zoom },
        }));
        this.viewportUpdater?.(x, y, zoom);
    }

    getViewport() {
        return useStore.getState().viewportTransform;
    }

    zoomIn() {
        console.log("Zooming in");
        const viewport = this.getViewport();
        const newZoom = viewport.zoom * 1.2;
        this.setViewport(viewport.x, viewport.y, newZoom);
    }

    zoomOut() {
        console.log("Zooming out");
        const viewport = this.getViewport();
        const newZoom = viewport.zoom / 1.2;
        this.setViewport(viewport.x, viewport.y, newZoom);
    }
}
