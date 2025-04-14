import { BaseNode, BaseEdge } from "../types/base";

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

    deserializeModel(serialized: SerializedModel): {
        nodes: BaseNode[];
        edges: BaseEdge[];
        projectName: string;
        metadata: ProjectMetadata;
    } {
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

        return {
            nodes: serialized.nodes,
            edges: serialized.edges,
            projectName: serialized.projectName || "Untitled Project",
            metadata,
        };
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
