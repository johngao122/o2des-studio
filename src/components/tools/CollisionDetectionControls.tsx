"use client";

import React, { useState } from "react";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";

const commandController = CommandController.getInstance();

export const CollisionDetectionControls: React.FC = () => {
    const [distance, setDistance] = useState(50);
    const [maxIterations, setMaxIterations] = useState(10);
    const { edges, nodes } = useStore((state) => ({
        edges: state.edges,
        nodes: state.nodes,
    }));

    const handleManualAdjustment = () => {
        commandController.adjustAllControlPointCollisions(
            distance,
            maxIterations
        );
    };

    const getCollisionStats = () => {
        const edgesWithExistingControlPoints = edges.filter(
            (edge) =>
                edge.data?.controlPoints && edge.data.controlPoints.length > 0
        );
        return {
            totalEdges: edges.length,
            edgesWithExistingControlPoints:
                edgesWithExistingControlPoints.length,
            totalNodes: nodes.length,
        };
    };

    const stats = getCollisionStats();

    return (
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Edge Control Point Collision Detection
            </h3>

            <div className="space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <p>
                        <strong>Total Edges:</strong> {stats.totalEdges}
                    </p>
                    <p>
                        <strong>Edges with Custom Control Points:</strong>{" "}
                        {stats.edgesWithExistingControlPoints}
                    </p>
                    <p>
                        <strong>Total Nodes:</strong> {stats.totalNodes}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                        All edges are checked (including default control points)
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Collision Distance:
                    </label>
                    <input
                        type="number"
                        value={distance}
                        onChange={(e) => setDistance(Number(e.target.value))}
                        min="10"
                        max="200"
                        step="10"
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        px
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Max Iterations:
                    </label>
                    <input
                        type="number"
                        value={maxIterations}
                        onChange={(e) =>
                            setMaxIterations(Number(e.target.value))
                        }
                        min="1"
                        max="20"
                        step="1"
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        iterations
                    </span>
                </div>

                <button
                    onClick={handleManualAdjustment}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                    Manually Adjust All Control Points
                </button>

                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        <strong>Iterative Resolution:</strong> The system now
                        uses iterative collision detection to handle cascading
                        collisions. When moving a control point away from one
                        node causes it to collide with another, it will continue
                        adjusting until all collisions are resolved (up to max
                        iterations).
                    </p>
                </div>
            </div>
        </div>
    );
};
