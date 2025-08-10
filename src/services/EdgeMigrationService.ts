/**
 * EdgeMigrationService - Handles migration of existing edges to orthogonal routing
 *
 * This service provides seamless backward compatibility by automatically converting
 * legacy edge data to the new orthogonal routing format while preserving all user
 * customizations and edge properties.
 */

import { BaseEdge } from "../types/base";
import { OrthogonalRoutingEngine } from "../lib/routing/OrthogonalRoutingEngine";
import { HandleSelectionService } from "../lib/routing/HandleSelectionService";
import { HandleInfo, RoutingMetrics, NodeInfo } from "../lib/routing/types";

export interface EdgeMigrationResult {
    migratedEdge: BaseEdge;
    migrationApplied: boolean;
    migrationStrategy:
        | "none"
        | "full-legacy"
        | "partial-routing"
        | "user-customization-preserved";
    originalData: any;
    errors?: string[];
}

export interface MigrationBatch {
    results: EdgeMigrationResult[];
    totalEdges: number;
    migratedCount: number;
    skippedCount: number;
    errorCount: number;
    processingTimeMs: number;
}

export interface EdgeMigrationOptions {
    preserveUserCustomizations: boolean;
    validateResults: boolean;
    enableRollback: boolean;
    progressCallback?: (current: number, total: number, edge: BaseEdge) => void;
    continueOnError?: boolean;
    maxRetries?: number;
    timeout?: number;
}

export class EdgeMigrationService {
    private routingEngine: OrthogonalRoutingEngine;
    private handleSelectionService: HandleSelectionService;
    private rollbackStore: Map<string, any> = new Map();

    constructor(
        routingEngine?: OrthogonalRoutingEngine,
        handleSelectionService?: HandleSelectionService
    ) {
        this.routingEngine = routingEngine || new OrthogonalRoutingEngine();
        this.handleSelectionService =
            handleSelectionService || new HandleSelectionService();
    }

    /**
     * Migrate a single edge to orthogonal routing format
     */
    async migrateEdge(
        edge: BaseEdge,
        availableNodes: any[],
        options: EdgeMigrationOptions = this.getDefaultOptions()
    ): Promise<EdgeMigrationResult> {
        const originalData = this.createBackup(edge);
        const errors: string[] = [];
        const maxRetries = options.maxRetries || 3;
        let attempt = 0;

        if (options.enableRollback) {
            this.rollbackStore.set(edge.id, originalData);
        }

        while (attempt < maxRetries) {
            try {
                const migrationPromise = Promise.resolve(
                    this.performMigration(edge, availableNodes, options)
                );

                if (options.timeout) {
                    const result = await this.withTimeout(
                        migrationPromise,
                        options.timeout
                    );

                    if (options.enableRollback && result.migrationApplied) {
                        this.rollbackStore.set(
                            `${edge.id}_migrated`,
                            result.migratedEdge
                        );
                    }

                    return result;
                } else {
                    const result = await migrationPromise;

                    if (options.enableRollback && result.migrationApplied) {
                        this.rollbackStore.set(
                            `${edge.id}_migrated`,
                            result.migratedEdge
                        );
                    }

                    return result;
                }
            } catch (error) {
                attempt++;
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "Unknown migration error";
                errors.push(`Attempt ${attempt}: ${errorMessage}`);

                if (attempt >= maxRetries || !options.continueOnError) {
                    return {
                        migratedEdge: edge,
                        migrationApplied: false,
                        migrationStrategy: "none",
                        originalData,
                        errors,
                    };
                }

                await this.delay(100 * attempt);
            }
        }

        return {
            migratedEdge: edge,
            migrationApplied: false,
            migrationStrategy: "none",
            originalData,
            errors,
        };
    }

    /**
     * Perform the actual migration logic (separated for timeout handling)
     */
    private async performMigration(
        edge: BaseEdge,
        availableNodes: any[],
        options: EdgeMigrationOptions
    ): Promise<EdgeMigrationResult> {
        const originalData = this.createBackup(edge);
        const migrationStrategy = this.assessMigrationNeeds(edge);

        if (migrationStrategy === "none") {
            return {
                migratedEdge: edge,
                migrationApplied: false,
                migrationStrategy,
                originalData,
            };
        }

        await this.delay(1);

        const migratedEdge = this.applyMigrationStrategy(
            edge,
            migrationStrategy,
            availableNodes,
            options
        );

        if (options.validateResults) {
            const validationErrors = this.validateMigratedEdge(migratedEdge);
            if (validationErrors.length > 0) {
                throw new Error(
                    `Validation failed: ${validationErrors.join(", ")}`
                );
            }
        }

        return {
            migratedEdge,
            migrationApplied: true,
            migrationStrategy,
            originalData,
        };
    }

    /**
     * Migrate multiple edges in batch
     */
    async migrateEdgesBatch(
        edges: BaseEdge[],
        availableNodes: any[],
        options: EdgeMigrationOptions = this.getDefaultOptions()
    ): Promise<MigrationBatch> {
        const startTime = Date.now();
        const results: EdgeMigrationResult[] = [];
        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];

            if (options.progressCallback) {
                options.progressCallback(i + 1, edges.length, edge);
            }

            const result = await this.migrateEdge(
                edge,
                availableNodes,
                options
            );
            results.push(result);

            if (result.migrationApplied) {
                migratedCount++;
            } else if (result.errors && result.errors.length > 0) {
                errorCount++;
            } else {
                skippedCount++;
            }

            if (edges.length > 1 && i < edges.length - 1) {
                await this.delay(1);
            }
        }

        const processingTimeMs = Date.now() - startTime;

        return {
            results,
            totalEdges: edges.length,
            migratedCount,
            skippedCount,
            errorCount,
            processingTimeMs,
        };
    }

    /**
     * Assess what type of migration an edge needs
     */
    private assessMigrationNeeds(
        edge: BaseEdge
    ):
        | "none"
        | "full-legacy"
        | "partial-routing"
        | "user-customization-preserved" {
        const edgeData = edge.data || {};

        if (
            edgeData.useOrthogonalRouting === true &&
            edgeData.routingMetrics &&
            edgeData.selectedHandles
        ) {
            return "none";
        }

        if (
            edgeData.useOrthogonalRouting === true ||
            edgeData.routingType ||
            edgeData.routingMetrics
        ) {
            return "partial-routing";
        }

        const hasCustomStyling =
            edge.style && Object.keys(edge.style).length > 0;
        const hasCustomControlPoints =
            edgeData.controlPoints && edgeData.controlPoints.length > 0;
        const hasCustomEdgeType =
            edgeData.edgeType &&
            !["straight", "default", "basic"].includes(edgeData.edgeType);
        const hasCustomLabel = edge.label && edge.label !== "";
        const hasCustomAnimation = edge.animated === true;

        if (
            hasCustomStyling ||
            hasCustomControlPoints ||
            hasCustomEdgeType ||
            hasCustomLabel ||
            hasCustomAnimation
        ) {
            return "user-customization-preserved";
        }

        return "full-legacy";
    }

    /**
     * Apply the appropriate migration strategy
     */
    private applyMigrationStrategy(
        edge: BaseEdge,
        strategy:
            | "full-legacy"
            | "partial-routing"
            | "user-customization-preserved",
        availableNodes: any[],
        options: EdgeMigrationOptions
    ): BaseEdge {
        switch (strategy) {
            case "full-legacy":
                return this.migrateLegacyEdge(edge, availableNodes);

            case "partial-routing":
                return this.migratePartialRoutingEdge(edge, availableNodes);

            case "user-customization-preserved":
                return this.migrateWithCustomizationPreservation(
                    edge,
                    availableNodes,
                    options
                );

            default:
                throw new Error(`Unknown migration strategy: ${strategy}`);
        }
    }

    /**
     * Migrate a legacy edge with no routing data
     */
    private migrateLegacyEdge(edge: BaseEdge, availableNodes: any[]): BaseEdge {
        const sourceNode = availableNodes.find((n) => n.id === edge.source);
        const targetNode = availableNodes.find((n) => n.id === edge.target);

        if (!sourceNode || !targetNode) {
            throw new Error(`Cannot find nodes for edge ${edge.id}`);
        }

        const sourceNodeInfo = this.convertToNodeInfo(sourceNode);
        const targetNodeInfo = this.convertToNodeInfo(targetNode);
        const handleCombination =
            this.handleSelectionService.findOptimalHandles(
                sourceNodeInfo,
                targetNodeInfo
            );

        if (!handleCombination) {
            throw new Error(
                `No valid handle combination found for edge ${edge.id}`
            );
        }

        const orthogonalPath = this.routingEngine.calculateOrthogonalPath(
            handleCombination.sourceHandle,
            handleCombination.targetHandle
        );

        const routingMetrics = this.routingEngine.calculateRoutingMetrics(
            orthogonalPath,
            handleCombination.sourceHandle,
            handleCombination.targetHandle
        );

        const controlPoints =
            this.routingEngine.generateControlPoints(orthogonalPath);

        return {
            ...edge,
            sourceHandle: handleCombination.sourceHandle.id,
            targetHandle: handleCombination.targetHandle.id,
            data: {
                ...edge.data,
                useOrthogonalRouting: true,
                routingType: orthogonalPath.routingType,
                routingMetrics,
                selectedHandles: {
                    source: handleCombination.sourceHandle,
                    target: handleCombination.targetHandle,
                },
                controlPoints,
            },
        };
    }

    /**
     * Migrate an edge with partial routing data
     */
    private migratePartialRoutingEdge(
        edge: BaseEdge,
        availableNodes: any[]
    ): BaseEdge {
        const sourceNode = availableNodes.find((n) => n.id === edge.source);
        const targetNode = availableNodes.find((n) => n.id === edge.target);

        if (!sourceNode || !targetNode) {
            throw new Error(`Cannot find nodes for edge ${edge.id}`);
        }

        const edgeData = edge.data || {};
        let sourceHandle: HandleInfo;
        let targetHandle: HandleInfo;

        if (
            edgeData.selectedHandles?.source &&
            edgeData.selectedHandles?.target
        ) {
            sourceHandle = edgeData.selectedHandles.source;
            targetHandle = edgeData.selectedHandles.target;
        } else {
            const sourceNodeInfo = this.convertToNodeInfo(sourceNode);
            const targetNodeInfo = this.convertToNodeInfo(targetNode);
            const handleCombination =
                this.handleSelectionService.findOptimalHandles(
                    sourceNodeInfo,
                    targetNodeInfo
                );
            sourceHandle = handleCombination.sourceHandle;
            targetHandle = handleCombination.targetHandle;
        }

        const orthogonalPath = this.routingEngine.calculateOrthogonalPath(
            sourceHandle,
            targetHandle,
            { preferredRouting: edgeData.routingType }
        );

        const routingMetrics = this.routingEngine.calculateRoutingMetrics(
            orthogonalPath,
            sourceHandle,
            targetHandle
        );

        const controlPoints =
            edgeData.controlPoints ||
            this.routingEngine.generateControlPoints(orthogonalPath);

        return {
            ...edge,
            sourceHandle: sourceHandle.id,
            targetHandle: targetHandle.id,
            data: {
                ...edgeData,
                useOrthogonalRouting: true,
                routingType: orthogonalPath.routingType,
                routingMetrics,
                selectedHandles: {
                    source: sourceHandle,
                    target: targetHandle,
                },
                controlPoints,
            },
        };
    }

    /**
     * Migrate edge while preserving user customizations
     */
    private migrateWithCustomizationPreservation(
        edge: BaseEdge,
        availableNodes: any[],
        options: EdgeMigrationOptions
    ): BaseEdge {
        const sourceNode = availableNodes.find((n) => n.id === edge.source);
        const targetNode = availableNodes.find((n) => n.id === edge.target);

        if (!sourceNode || !targetNode) {
            throw new Error(`Cannot find nodes for edge ${edge.id}`);
        }

        const edgeData = edge.data || {};

        const preservedCustomizations = {
            edgeType: edgeData.edgeType,
            controlPoints: edgeData.controlPoints,
            style: edge.style,
            animated: edge.animated,
            label: edge.label,
        };

        const sourceNodeInfo = this.convertToNodeInfo(sourceNode);
        const targetNodeInfo = this.convertToNodeInfo(targetNode);
        const handleCombination =
            this.handleSelectionService.findOptimalHandles(
                sourceNodeInfo,
                targetNodeInfo
            );

        const orthogonalPath = this.routingEngine.calculateOrthogonalPath(
            handleCombination.sourceHandle,
            handleCombination.targetHandle
        );

        const routingMetrics = this.routingEngine.calculateRoutingMetrics(
            orthogonalPath,
            handleCombination.sourceHandle,
            handleCombination.targetHandle
        );

        const controlPoints =
            options.preserveUserCustomizations &&
            preservedCustomizations.controlPoints
                ? this.adaptCustomControlPoints(
                      preservedCustomizations.controlPoints,
                      orthogonalPath
                  )
                : this.routingEngine.generateControlPoints(orthogonalPath);

        return {
            ...edge,
            sourceHandle: handleCombination.sourceHandle.id,
            targetHandle: handleCombination.targetHandle.id,
            style: preservedCustomizations.style,
            animated: preservedCustomizations.animated,
            label: preservedCustomizations.label,
            data: {
                ...edgeData,
                useOrthogonalRouting: true,
                routingType: orthogonalPath.routingType,
                routingMetrics,
                selectedHandles: {
                    source: handleCombination.sourceHandle,
                    target: handleCombination.targetHandle,
                },
                controlPoints,
                edgeType: preservedCustomizations.edgeType,
            },
        };
    }

    /**
     * Adapt custom control points to orthogonal routing
     */
    private adaptCustomControlPoints(
        customPoints: any[],
        orthogonalPath: any
    ): any[] {
        return customPoints;
    }

    /**
     * Validate a migrated edge
     */
    private validateMigratedEdge(edge: BaseEdge): string[] {
        const errors: string[] = [];
        const edgeData = edge.data || {};

        if (!edgeData.useOrthogonalRouting) {
            errors.push("Missing useOrthogonalRouting flag");
        }

        if (!edgeData.routingMetrics) {
            errors.push("Missing routing metrics");
        }

        if (!edgeData.selectedHandles) {
            errors.push("Missing selected handles");
        }

        if (!edge.sourceHandle || !edge.targetHandle) {
            errors.push("Missing handle assignments");
        }

        return errors;
    }

    /**
     * Create a backup of the original edge data
     */
    private createBackup(edge: BaseEdge): any {
        return JSON.parse(JSON.stringify(edge));
    }

    /**
     * Get default migration options
     */
    private getDefaultOptions(): EdgeMigrationOptions {
        return {
            preserveUserCustomizations: true,
            validateResults: true,
            enableRollback: true,
            continueOnError: true,
            maxRetries: 3,
            timeout: 5000,
        };
    }

    /**
     * Rollback a migrated edge to its original state
     */
    rollbackEdge(originalData: any): BaseEdge {
        return originalData;
    }

    /**
     * Generate migration report for diagnostics
     */
    generateMigrationReport(batch: MigrationBatch): string {
        const lines = [
            "Edge Migration Report",
            "====================",
            `Total Edges: ${batch.totalEdges}`,
            `Migrated: ${batch.migratedCount}`,
            `Skipped: ${batch.skippedCount}`,
            `Errors: ${batch.errorCount}`,
            `Processing Time: ${batch.processingTimeMs}ms`,
            "",
        ];

        if (batch.errorCount > 0) {
            lines.push("Errors:");
            batch.results
                .filter((r) => r.errors)
                .forEach((r) => {
                    lines.push(
                        `- Edge ${r.migratedEdge.id}: ${r.errors!.join(", ")}`
                    );
                });
        }

        return lines.join("\n");
    }

    /**
     * Utility method to add timeout to a promise
     */
    private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(
                    () =>
                        reject(
                            new Error(`Migration timeout after ${timeoutMs}ms`)
                        ),
                    timeoutMs
                )
            ),
        ]);
    }

    /**
     * Utility method to add delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Rollback all migrations for a batch
     */
    rollbackBatch(edgeIds: string[]): BaseEdge[] {
        const rolledBackEdges: BaseEdge[] = [];

        for (const edgeId of edgeIds) {
            const originalData = this.rollbackStore.get(edgeId);
            if (originalData) {
                rolledBackEdges.push(originalData);
                this.rollbackStore.delete(edgeId);
                this.rollbackStore.delete(`${edgeId}_migrated`);
            }
        }

        return rolledBackEdges;
    }

    /**
     * Clear rollback store
     */
    clearRollbackStore(): void {
        this.rollbackStore.clear();
    }

    /**
     * Get rollback store statistics
     */
    getRollbackStats(): { count: number; edgeIds: string[] } {
        const edgeIds = Array.from(this.rollbackStore.keys())
            .filter((key) => !key.includes("_migrated"))
            .map((key) => key);

        return {
            count: edgeIds.length,
            edgeIds,
        };
    }

    /**
     * Convert a simple node object to NodeInfo for routing calculations
     */
    private convertToNodeInfo(node: any): NodeInfo {
        const bounds = {
            x: node.position?.x || 0,
            y: node.position?.y || 0,
            width: node.data?.width || 100,
            height: node.data?.height || 50,
        };

        const handles: HandleInfo[] = [
            {
                id: `${node.id}-top`,
                nodeId: node.id,
                position: { x: bounds.x + bounds.width / 2, y: bounds.y },
                side: "top",
                type: "source",
            },
            {
                id: `${node.id}-top-target`,
                nodeId: node.id,
                position: { x: bounds.x + bounds.width / 2, y: bounds.y },
                side: "top",
                type: "target",
            },
            {
                id: `${node.id}-right`,
                nodeId: node.id,
                position: {
                    x: bounds.x + bounds.width,
                    y: bounds.y + bounds.height / 2,
                },
                side: "right",
                type: "source",
            },
            {
                id: `${node.id}-right-target`,
                nodeId: node.id,
                position: {
                    x: bounds.x + bounds.width,
                    y: bounds.y + bounds.height / 2,
                },
                side: "right",
                type: "target",
            },
            {
                id: `${node.id}-bottom`,
                nodeId: node.id,
                position: {
                    x: bounds.x + bounds.width / 2,
                    y: bounds.y + bounds.height,
                },
                side: "bottom",
                type: "source",
            },
            {
                id: `${node.id}-bottom-target`,
                nodeId: node.id,
                position: {
                    x: bounds.x + bounds.width / 2,
                    y: bounds.y + bounds.height,
                },
                side: "bottom",
                type: "target",
            },
            {
                id: `${node.id}-left`,
                nodeId: node.id,
                position: { x: bounds.x, y: bounds.y + bounds.height / 2 },
                side: "left",
                type: "source",
            },
            {
                id: `${node.id}-left-target`,
                nodeId: node.id,
                position: { x: bounds.x, y: bounds.y + bounds.height / 2 },
                side: "left",
                type: "target",
            },
        ];

        return {
            id: node.id,
            bounds,
            handles,
        };
    }
}
