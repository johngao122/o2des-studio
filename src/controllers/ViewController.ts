import { useStore } from "../store";

type ViewportUpdater = (x: number, y: number, zoom: number) => void;
type FitViewFunction = () => void;

export class ViewController {
    private static instance: ViewController | null = null;
    private viewportUpdater: ViewportUpdater | null = null;
    private fitViewFunction: FitViewFunction | null = null;

    private constructor() {}

    static getInstance(): ViewController {
        if (!ViewController.instance) {
            ViewController.instance = new ViewController();
        }
        return ViewController.instance;
    }

    setViewportUpdater(updater: ViewportUpdater) {
        this.viewportUpdater = updater;
    }

    setFitViewFunction(fitViewFn: FitViewFunction) {
        this.fitViewFunction = fitViewFn;
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
        const viewport = this.getViewport();
        const newZoom = viewport.zoom * 1.2;
        this.setViewport(viewport.x, viewport.y, newZoom);
    }

    zoomOut() {
        const viewport = this.getViewport();
        const newZoom = viewport.zoom / 1.2;
        this.setViewport(viewport.x, viewport.y, newZoom);
    }

    fitView() {
        this.fitViewFunction?.();
    }
}
