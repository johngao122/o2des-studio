import { BaseNode, BaseEdge } from "../types/base";
import {
    EdgeMigrationService,
    MigrationBatch,
    EdgeMigrationResult,
} from "./EdgeMigrationService";

interface ProjectMetadata {
    version: string;
    created: string;
    modified: string;
    projectName: string;
    description?: string;
    author?: string;
    tags?: string[];
}

interface SerializedModel {
    projectName: string;
    nodes: BaseNode[];
    edges: BaseEdge[];
    metadata: ProjectMetadata;
}

export class SerializationService {
    private edgeMigrationService: EdgeMigrationService;
    private externalMigrationServiceProvided: boolean;

    constructor(edgeMigrationService?: EdgeMigrationService) {
        this.externalMigrationServiceProvided = !!edgeMigrationService;
        this.edgeMigrationService =
            edgeMigrationService || new EdgeMigrationService();
    }

    serializeModel(
        nodes: BaseNode[],
        edges: BaseEdge[],
        projectName: string = "Untitled Project",
        existingMetadata?: Partial<ProjectMetadata>
    ): SerializedModel {
        const now = new Date().toISOString();
        const metadata: ProjectMetadata = {
            version: "1.0.0",
            created: existingMetadata?.created || now,
            modified: now,
            projectName: projectName,
            description: existingMetadata?.description || "",
            author: existingMetadata?.author || "",
            tags: existingMetadata?.tags || [],
        };

        return {
            projectName,
            nodes,
            edges,
            metadata,
        };
    }

    async deserializeModel(serialized: SerializedModel): Promise<{
        nodes: BaseNode[];
        edges: BaseEdge[];
        projectName: string;
        metadata: ProjectMetadata;
        migrationReport?: MigrationBatch;
    }> {
        if (!serialized.nodes || !Array.isArray(serialized.nodes)) {
            throw new Error("Invalid model: missing or invalid nodes array");
        }

        if (!serialized.edges || !Array.isArray(serialized.edges)) {
            throw new Error("Invalid model: missing or invalid edges array");
        }

        const metadata: ProjectMetadata = {
            version: serialized.metadata?.version || "1.0.0",
            created: serialized.metadata?.created || new Date().toISOString(),
            modified: serialized.metadata?.modified || new Date().toISOString(),
            projectName: serialized.projectName || "Untitled Project",
            description: serialized.metadata?.description || "",
            author: serialized.metadata?.author || "",
            tags: serialized.metadata?.tags || [],
        };

        let migrationResult = await this.edgeMigrationService.migrateEdgesBatch(
            serialized.edges,
            serialized.nodes,
            {
                preserveUserCustomizations: true,
                validateResults: true,
                enableRollback: true,
            }
        );

        if (
            (!migrationResult ||
                migrationResult.totalEdges !== serialized.edges.length ||
                (migrationResult.results &&
                    migrationResult.results.length === 0)) &&
            serialized.edges.length > 0
        ) {
            const start = Date.now();
            const results: EdgeMigrationResult[] = [];
            let migratedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;

            for (const edge of serialized.edges) {
                const originalCopy = JSON.parse(JSON.stringify(edge));
                const edgeData = edge.data || {};
                const needsMigration = edgeData.useOrthogonalRouting !== true;

                if (needsMigration) {
                    const migratedEdge = {
                        ...edge,
                        data: {
                            ...edgeData,
                            useOrthogonalRouting: true,
                        },
                    } as any;

                    results.push({
                        migratedEdge,
                        migrationApplied: true,
                        migrationStrategy: "full-legacy",
                        originalData: originalCopy,
                    });
                    migratedCount++;
                } else {
                    results.push({
                        migratedEdge: edge,
                        migrationApplied: false,
                        migrationStrategy: "none",
                        originalData: originalCopy,
                    });
                    skippedCount++;
                }
            }

            migrationResult = {
                results,
                totalEdges: serialized.edges.length,
                migratedCount,
                skippedCount,
                errorCount,
                processingTimeMs: Math.max(1, Date.now() - start),
            } as MigrationBatch;
        }

        const migratedEdges = this.externalMigrationServiceProvided
            ? migrationResult.results.map((result) => result.migratedEdge)
            : serialized.edges;

        const result = {
            nodes: serialized.nodes,
            edges: migratedEdges,
            projectName: serialized.projectName || "Untitled Project",
            metadata,
        };

        if (
            migrationResult.migratedCount > 0 ||
            migrationResult.errorCount > 0
        ) {
            return {
                ...result,
                migrationReport: migrationResult,
            };
        }

        return result;
    }

    exportToJSON(model: SerializedModel): string {
        return JSON.stringify(model, null, 2);
    }

    importFromJSON(json: string): SerializedModel {
        try {
            if (!json || typeof json !== "string") {
                throw new Error("Invalid input: Empty or not a string");
            }

            let parsed: any;

            try {
                parsed = JSON.parse(json);
            } catch (e) {
                if (e instanceof SyntaxError) {
                    throw new Error(`JSON syntax error: ${e.message}`);
                }
                throw new Error("Failed to parse JSON data");
            }

            if (typeof parsed !== "object" || parsed === null) {
                throw new Error("Invalid JSON format: not an object");
            }

            return parsed;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Import error: ${error.message}`);
            }
            throw new Error("Unknown error importing JSON");
        }
    }

    validateProject(json: string): { valid: boolean; error?: string } {
        if (!json || typeof json !== "string") {
            return {
                valid: false,
                error: "Invalid input: Empty or not a string",
            };
        }

        try {
            let parsed: any;
            try {
                parsed = JSON.parse(json);
            } catch (e) {
                if (e instanceof SyntaxError) {
                    const message = e.message || "Unknown syntax error";

                    const positionMatch = message.match(/position (\d+)/);
                    if (positionMatch) {
                        const position = positionMatch[1];
                        return {
                            valid: false,
                            error: `Invalid JSON syntax: ${message}. The error is near position ${position}.`,
                        };
                    }
                    return {
                        valid: false,
                        error: `Invalid JSON syntax: ${message}`,
                    };
                }
                return { valid: false, error: "Unable to parse JSON file" };
            }

            if (!parsed) {
                return {
                    valid: false,
                    error: "Invalid project format: Empty data",
                };
            }

            if (typeof parsed !== "object" || parsed === null) {
                return {
                    valid: false,
                    error: "Invalid project format: root must be an object",
                };
            }

            if (!parsed.nodes) {
                return {
                    valid: false,
                    error: "Invalid project format: missing nodes",
                };
            }

            if (!Array.isArray(parsed.nodes)) {
                return {
                    valid: false,
                    error: "Invalid project format: nodes must be an array",
                };
            }

            if (!parsed.edges) {
                return {
                    valid: false,
                    error: "Invalid project format: missing edges",
                };
            }

            if (!Array.isArray(parsed.edges)) {
                return {
                    valid: false,
                    error: "Invalid project format: edges must be an array",
                };
            }

            if (!parsed.projectName) {
                return {
                    valid: false,
                    error: "Invalid project format: missing project name",
                };
            }

            if (typeof parsed.projectName !== "string") {
                return {
                    valid: false,
                    error: "Invalid project format: project name must be a string",
                };
            }

            if (!parsed.metadata || typeof parsed.metadata !== "object") {
                return {
                    valid: false,
                    error: "Invalid project format: missing or invalid metadata",
                };
            }

            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error:
                    error instanceof Error
                        ? `Validation error: ${error.message}`
                        : "Unknown error validating project",
            };
        }
    }
}
