"use client";

import { useEffect, useState } from "react";
import "reactflow/dist/style.css";
import Editor from "@monaco-editor/react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExportJsonAutosaveService } from "@/services/ExportJsonAutosaveService";
import { useStore } from "@/store";
import { ReadOnlyDiagramCanvas } from "@/components/ReadOnlyDiagramCanvas";

interface ExportData {
    model: {
        entityRelationships: any[];
        resources: any[];
        activities: any[];
        connections: any[];
    };
}

export default function ExportPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [exportData, setExportData] = useState<ExportData | null>(null);
    const [diagramData, setDiagramData] = useState<{
        nodes: any[];
        edges: any[];
    } | null>(null);
    const [isLoadingDiagram, setIsLoadingDiagram] = useState(false);

    const {
        loadSerializedState,
        nodes: storeNodes,
        edges: storeEdges,
        metadata,
        updateMetadata,
    } = useStore();

    const autosaveService = ExportJsonAutosaveService.getInstance();

    const [formattedDate, setFormattedDate] = useState<string>("");

    useEffect(() => {
        if (isLoadingDiagram) {
            const timer = setTimeout(() => {
                setDiagramData({
                    nodes: storeNodes,
                    edges: storeEdges,
                });
                setIsLoadingDiagram(false);
                toast.success("Export data loaded successfully");
                setIsLoading(false);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [storeNodes, storeEdges, isLoadingDiagram]);

    useEffect(() => {
        if (metadata?.modified) {
            try {
                const date = new Date(metadata.modified);
                setFormattedDate(
                    date.toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                );
            } catch (e) {
                setFormattedDate("Unknown");
            }
        }
    }, [metadata?.modified]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const exportParam = sessionStorage.getItem("o2des_export_json");

                const serializedDiagramParam = sessionStorage.getItem(
                    "o2des_diagram_serialized"
                );

                if (!exportParam) {
                    console.error(
                        "Export page: No export data found in session storage"
                    );
                    toast.error("No export data available", {
                        description:
                            "Please export from the main application first",
                    });
                    setIsLoading(false);
                    return;
                }

                if (!serializedDiagramParam) {
                    console.error(
                        "Export page: No serialized diagram data found in session storage"
                    );
                    toast.error("No diagram data available", {
                        description:
                            "Please export from the main application first",
                    });
                    setIsLoading(false);
                    return;
                }

                const parsedExport = JSON.parse(exportParam);

                const autosavedJson = autosaveService.loadSavedJson();
                if (autosavedJson) {
                    setExportData(autosavedJson);
                    toast.success("Loaded autosaved changes", {
                        description:
                            "Your previous JSON edits have been restored",
                    });
                } else {
                    setExportData(parsedExport);
                }

                setIsLoadingDiagram(true);
                loadSerializedState(serializedDiagramParam);
            } catch (error) {
                console.error(
                    "Export page: Failed to load export data:",
                    error
                );
                toast.error("Failed to load export data");
                router.push("/");
                setIsLoading(false);
            }
        };

        loadData();
    }, [router, loadSerializedState]);

    useEffect(() => {
        return () => {};
    }, []);

    const handleDownloadExport = () => {
        if (!exportData) return;

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "simulation-export.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Export file downloaded");

        autosaveService.updateOriginalExportData(exportData);
    };

    const handleBackToEditor = () => {
        sessionStorage.removeItem("o2des_export_json");
        sessionStorage.removeItem("o2des_diagram_serialized");
        autosaveService.clearSavedJson();
        router.push("/");
    };

    if (isLoading) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold mb-2">
                        Processing Export
                    </h2>
                    <p className="text-muted-foreground">
                        Converting diagram to simulation format...
                    </p>
                </div>
            </div>
        );
    }

    if (!exportData) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">No Export Data</h1>
                    <p className="text-muted-foreground mb-4">
                        No export data found.
                    </p>
                    <Button onClick={handleBackToEditor}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Editor
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToEditor}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Editor
                    </Button>
                    <h1 className="text-xl font-semibold">
                        Export to Simulator
                    </h1>
                </div>
                <Button onClick={handleDownloadExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Export
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Diagram Panel */}
                    <ResizablePanel defaultSize={60} minSize={30}>
                        <div className="h-full">
                            <ReadOnlyDiagramCanvas
                                nodes={diagramData?.nodes || []}
                                edges={diagramData?.edges || []}
                            />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* JSON Editor Panel */}
                    <ResizablePanel defaultSize={40} minSize={20}>
                        <div className="h-full flex flex-col">
                            <div className="p-2 bg-muted/30 border-b flex-shrink-0">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-sm font-medium">
                                        Export JSON
                                    </h2>
                                    {formattedDate && (
                                        <div className="text-xs text-muted-foreground flex items-center">
                                            <span className="mr-1">
                                                Last modified:
                                            </span>
                                            <span className="font-medium">
                                                {formattedDate}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex-shrink-0">
                                <div className="flex items-start space-x-2">
                                    <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                            !
                                        </span>
                                    </div>
                                    <div className="text-sm text-blue-800">
                                        <span className="font-medium">
                                            Reminder:
                                        </span>{" "}
                                        Please review and adjust the exported
                                        JSON if needed before downloading. Check
                                        that all entities, activities, and
                                        connections are correctly represented.
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-4">
                                <Editor
                                    height="100%"
                                    defaultLanguage="json"
                                    value={JSON.stringify(exportData, null, 2)}
                                    theme="vs-dark"
                                    options={{
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        fontSize: 14,
                                        wordWrap: "on",
                                        formatOnPaste: true,
                                        formatOnType: true,
                                        autoIndent: "full",
                                        tabSize: 2,
                                        insertSpaces: true,
                                        renderWhitespace: "boundary",
                                        bracketPairColorization: {
                                            enabled: true,
                                        },
                                        folding: true,
                                        lineNumbers: "on",
                                        glyphMargin: false,
                                        contextmenu: true,
                                        selectOnLineNumbers: true,
                                        roundedSelection: false,
                                        readOnly: false,
                                        automaticLayout: true,
                                    }}
                                    onChange={(value) => {
                                        if (!value) return;

                                        try {
                                            const updatedData = JSON.parse(
                                                value
                                            ) as ExportData;
                                            setExportData(updatedData);
                                            autosaveService.autosaveJson(
                                                updatedData
                                            );

                                            updateMetadata({
                                                modified:
                                                    new Date().toISOString(),
                                            });
                                        } catch (error) {}
                                    }}
                                />
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
