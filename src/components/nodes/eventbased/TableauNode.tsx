"use client";

import { memo, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { NodeProps } from "reactflow";
import { MathJax } from "better-react-mathjax";
import { CommandController } from "@/controllers/CommandController";
import { useStore } from "@/store";
import { BaseNode } from "@/types/base";
import { GripIcon } from "lucide-react";

const commandController = CommandController.getInstance();

interface EdgeInfo {
    edgeNumber: number;
    condition: string;
    delay: string;
    parameter: string;
    destination: string;
}

interface TableauRow {
    originEvent: string;
    stateChange: string;
    edges: EdgeInfo[];
}

interface TableauNodeData {
    rows: TableauRow[];
}

interface ExtendedNodeProps extends NodeProps<TableauNodeData> {
    name?: string;
}

interface TableauNodeComponent
    extends React.NamedExoticComponent<ExtendedNodeProps> {
    defaultData: TableauNodeData;
    displayName?: string;
    getGraphType?: () => string;
    getDefaultData: () => TableauNodeData;
}

interface OldTableauRow {
    originEvent?: string;
    stateChange?: string;
    edges?: number;
    condition?: string;
    delay?: string;
    parameter?: string;
    destination?: string;
}

const defaultEdge: EdgeInfo = {
    edgeNumber: 1,
    condition: "True",
    delay: "0",
    parameter: "-",
    destination: "",
};

const defaultRow: TableauRow = {
    originEvent: "",
    stateChange: "",
    edges: [{ ...defaultEdge }],
};

const TableauNode = memo(({ id, data, selected }: ExtendedNodeProps) => {
    const nodeRef = useRef<HTMLDivElement>(null);
    const initialMousePos = useRef<{ x: number; y: number } | null>(null);
    const initialDimensions = useRef<{
        width: number;
        height: number;
    } | null>(null);
    const [isResizing, setIsResizing] = useState(false);

    const migratedData = useMemo(() => {
        if (!data) return { rows: [] };

        const needsMigration = data.rows?.some(
            (row) => !Array.isArray(row.edges)
        );

        if (!needsMigration) return data;

        return {
            ...data,
            rows:
                data.rows?.map((row) => {
                    if (!Array.isArray(row.edges)) {
                        const oldRow = row as unknown as OldTableauRow;
                        return {
                            originEvent: oldRow.originEvent || "",
                            stateChange: oldRow.stateChange || "",
                            edges: [
                                {
                                    edgeNumber:
                                        typeof oldRow.edges === "number"
                                            ? oldRow.edges
                                            : 1,
                                    condition: oldRow.condition || "True",
                                    delay: oldRow.delay || "0",
                                    parameter: oldRow.parameter || "-",
                                    destination: oldRow.destination || "",
                                },
                            ],
                        };
                    }
                    return row;
                }) || [],
        };
    }, [data]);

    const safeData = migratedData || { rows: [] };
    const [editRows, setEditRows] = useState<TableauRow[]>(safeData.rows || []);

    const node = useStore.getState().nodes.find((n: BaseNode) => n.id === id);
    const nodeName = node?.name || id;

    const [dimensions, setDimensions] = useState({
        width: typeof node?.style?.width === "number" ? node.style.width : 800,
        height:
            typeof node?.style?.height === "number" ? node.style.height : 300,
    });

    useEffect(() => {
        if (!isResizing && node?.style) {
            const width =
                typeof node.style.width === "number"
                    ? node.style.width
                    : dimensions.width;
            const height =
                typeof node.style.height === "number"
                    ? node.style.height
                    : dimensions.height;
            setDimensions({ width, height });
        }
    }, [node?.style, isResizing, dimensions.width, dimensions.height]);

    useEffect(() => {
        setEditRows(safeData.rows || []);
    }, [safeData.rows]);

    useEffect(() => {
        if (
            !selected &&
            JSON.stringify(editRows) !== JSON.stringify(safeData.rows)
        ) {
            const command = commandController.createUpdateNodeCommand(id, {
                data: {
                    ...safeData,
                    rows: editRows,
                },
            });
            commandController.execute(command);
        }
    }, [selected, editRows, id, safeData]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            setIsResizing(true);
            initialMousePos.current = { x: e.clientX, y: e.clientY };
            initialDimensions.current = {
                width: dimensions.width,
                height: dimensions.height,
            };
        },
        [dimensions]
    );

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (
                !isResizing ||
                !initialMousePos.current ||
                !initialDimensions.current
            )
                return;

            const deltaX = e.clientX - initialMousePos.current.x;
            const deltaY = e.clientY - initialMousePos.current.y;

            const newWidth = Math.max(
                800,
                initialDimensions.current.width + deltaX
            );
            const newHeight = Math.max(
                200,
                initialDimensions.current.height + deltaY
            );

            setDimensions({ width: newWidth, height: newHeight });
        },
        [isResizing]
    );

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);

        const command = commandController.createUpdateNodeCommand(id, {
            style: {
                width: dimensions.width,
                height: dimensions.height,
            },
            data: {
                ...safeData,
            },
        });
        commandController.execute(command);
    }, [id, dimensions, safeData]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    const addRow = useCallback(() => {
        const newRows = [
            ...editRows,
            { ...defaultRow, edges: [{ ...defaultEdge }] },
        ];
        setEditRows(newRows);

        const command = commandController.createUpdateNodeCommand(id, {
            data: {
                ...safeData,
                rows: newRows,
            },
        });
        commandController.execute(command);
    }, [editRows, id, safeData]);

    const addEdgeToRow = useCallback(
        (rowIndex: number) => {
            const newRows = [...editRows];
            const row = newRows[rowIndex];
            const highestEdgeNumber = row.edges.reduce(
                (max, edge) => Math.max(max, edge.edgeNumber),
                0
            );
            newRows[rowIndex] = {
                ...row,
                edges: [
                    ...row.edges,
                    { ...defaultEdge, edgeNumber: highestEdgeNumber + 1 },
                ],
            };
            setEditRows(newRows);

            const command = commandController.createUpdateNodeCommand(id, {
                data: {
                    ...safeData,
                    rows: newRows,
                },
            });
            commandController.execute(command);
        },
        [editRows, id, safeData]
    );

    const updateRow = useCallback(
        (
            rowIndex: number,
            field: "originEvent" | "stateChange",
            value: string
        ) => {
            const newRows = [...editRows];
            newRows[rowIndex] = {
                ...newRows[rowIndex],
                [field]: value,
            };
            setEditRows(newRows);
        },
        [editRows]
    );

    const updateEdge = useCallback(
        (
            rowIndex: number,
            edgeIndex: number,
            field: keyof EdgeInfo,
            value: string | number
        ) => {
            const newRows = [...editRows];
            const edges = [...newRows[rowIndex].edges];
            edges[edgeIndex] = {
                ...edges[edgeIndex],
                [field]: value,
            };
            newRows[rowIndex] = {
                ...newRows[rowIndex],
                edges,
            };
            setEditRows(newRows);
        },
        [editRows]
    );

    return (
        <div
            ref={nodeRef}
            className={`relative p-4 border-2 rounded-lg ${
                selected ? "border-blue-500" : "border-black dark:border-white"
            } bg-white dark:bg-zinc-800 ${selected ? "shadow-lg" : ""}`}
            style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                minWidth: "900px",
                minHeight: "200px",
            }}
        >
            {/* Resize handle */}
            <div
                className="absolute w-4 h-4 cursor-se-resize nodrag flex items-center justify-center bg-white dark:bg-zinc-800 rounded-bl border-l border-t border-gray-300 dark:border-gray-600"
                style={{ right: -10, bottom: -10 }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMouseDown(e);
                }}
            >
                <GripIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 nodrag" />
            </div>

            {/* Node Name/Title */}
            <div className="font-medium text-sm text-center mb-4 pb-2 border-b dark:text-white text-black">
                {nodeName}
            </div>

            {/* Table */}
            <div className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-7 divide-x divide-gray-300 dark:divide-gray-600 bg-gray-100 dark:bg-gray-700">
                    <div className="p-1 text-xs font-medium text-center">
                        Origin Event
                    </div>
                    <div className="p-1 text-xs font-medium text-center">
                        State Change
                    </div>
                    <div className="p-1 text-xs font-medium text-center">
                        Edge
                    </div>
                    <div className="p-1 text-xs font-medium text-center">
                        Condition
                    </div>
                    <div className="p-1 text-xs font-medium text-center">
                        Delay
                    </div>
                    <div className="p-1 text-xs font-medium text-center">
                        Parameter
                    </div>
                    <div className="p-1 text-xs font-medium text-center">
                        Destination Event
                    </div>
                </div>

                {/* Table Content */}
                <div className="divide-y divide-gray-300 dark:divide-gray-600 text-xs">
                    {(selected ? editRows : safeData.rows || []).map(
                        (row, rowIndex) => {
                            const edges = Array.isArray(row.edges)
                                ? row.edges
                                : [];
                            const rowHeight = edges.length;

                            return (
                                <div
                                    key={`row-${rowIndex}`}
                                    className="relative"
                                >
                                    <div className="grid grid-cols-7 divide-x divide-gray-300 dark:divide-gray-600">
                                        {/* Origin Event - spans all edges */}
                                        <div
                                            className={`p-0.5 ${
                                                rowHeight > 1
                                                    ? "row-span-2"
                                                    : ""
                                            }`}
                                            style={{
                                                gridRow: `span ${rowHeight}`,
                                            }}
                                        >
                                            {selected ? (
                                                <input
                                                    type="text"
                                                    value={row.originEvent}
                                                    onChange={(e) =>
                                                        updateRow(
                                                            rowIndex,
                                                            "originEvent",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full p-0.5 border rounded dark:bg-zinc-700 dark:text-white text-center text-xs nodrag"
                                                />
                                            ) : (
                                                <div className="h-full flex items-center justify-center">
                                                    {row.originEvent}
                                                </div>
                                            )}
                                        </div>

                                        {/* State Change - spans all edges */}
                                        <div
                                            className={`p-0.5 ${
                                                rowHeight > 1
                                                    ? "row-span-2"
                                                    : ""
                                            }`}
                                            style={{
                                                gridRow: `span ${rowHeight}`,
                                            }}
                                        >
                                            {selected ? (
                                                <input
                                                    type="text"
                                                    value={row.stateChange}
                                                    onChange={(e) =>
                                                        updateRow(
                                                            rowIndex,
                                                            "stateChange",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full p-0.5 border rounded dark:bg-zinc-700 dark:text-white text-center text-xs nodrag"
                                                />
                                            ) : (
                                                <div className="h-full flex items-center justify-center">
                                                    <MathJax>
                                                        {row.stateChange &&
                                                        row.stateChange.trim() !==
                                                            ""
                                                            ? row.stateChange
                                                            : " "}
                                                    </MathJax>
                                                </div>
                                            )}
                                        </div>

                                        {/* Edges, shown for the first row only */}
                                        {edges.map((edge, edgeIndex) => (
                                            <div
                                                key={`row-${rowIndex}-edge-${edgeIndex}`}
                                                className="contents"
                                            >
                                                {/* Edge Number */}
                                                <div className="p-0.5 border-t border-gray-300 dark:border-gray-600">
                                                    {selected ? (
                                                        <input
                                                            type="number"
                                                            value={
                                                                edge.edgeNumber
                                                            }
                                                            min={1}
                                                            onChange={(e) =>
                                                                updateEdge(
                                                                    rowIndex,
                                                                    edgeIndex,
                                                                    "edgeNumber",
                                                                    parseInt(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                )
                                                            }
                                                            className="w-full p-0.5 border rounded dark:bg-zinc-700 dark:text-white text-center text-xs nodrag"
                                                        />
                                                    ) : (
                                                        <div className="text-center">
                                                            {edge.edgeNumber}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Condition */}
                                                <div className="p-0.5 border-t border-gray-300 dark:border-gray-600">
                                                    {selected ? (
                                                        <input
                                                            type="text"
                                                            value={
                                                                edge.condition
                                                            }
                                                            onChange={(e) =>
                                                                updateEdge(
                                                                    rowIndex,
                                                                    edgeIndex,
                                                                    "condition",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="w-full p-0.5 border rounded dark:bg-zinc-700 dark:text-white text-center text-xs nodrag"
                                                        />
                                                    ) : (
                                                        <div className="text-center">
                                                            <MathJax>
                                                                {edge.condition &&
                                                                edge.condition.trim() !==
                                                                    ""
                                                                    ? edge.condition
                                                                    : "True"}
                                                            </MathJax>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Delay */}
                                                <div className="p-0.5 border-t border-gray-300 dark:border-gray-600">
                                                    {selected ? (
                                                        <input
                                                            type="text"
                                                            value={edge.delay}
                                                            onChange={(e) =>
                                                                updateEdge(
                                                                    rowIndex,
                                                                    edgeIndex,
                                                                    "delay",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="w-full p-0.5 border rounded dark:bg-zinc-700 dark:text-white text-center text-xs nodrag"
                                                        />
                                                    ) : (
                                                        <div className="text-center">
                                                            <MathJax>
                                                                {edge.delay &&
                                                                edge.delay.trim() !==
                                                                    ""
                                                                    ? edge.delay
                                                                    : "0"}
                                                            </MathJax>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Parameter */}
                                                <div className="p-0.5 border-t border-gray-300 dark:border-gray-600">
                                                    {selected ? (
                                                        <input
                                                            type="text"
                                                            value={
                                                                edge.parameter
                                                            }
                                                            onChange={(e) =>
                                                                updateEdge(
                                                                    rowIndex,
                                                                    edgeIndex,
                                                                    "parameter",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="w-full p-0.5 border rounded dark:bg-zinc-700 dark:text-white text-center text-xs nodrag"
                                                        />
                                                    ) : (
                                                        <div className="text-center">
                                                            <MathJax>
                                                                {edge.parameter &&
                                                                edge.parameter.trim() !==
                                                                    ""
                                                                    ? edge.parameter
                                                                    : "-"}
                                                            </MathJax>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Destination */}
                                                <div className="p-0.5 border-t border-gray-300 dark:border-gray-600">
                                                    {selected ? (
                                                        <input
                                                            type="text"
                                                            value={
                                                                edge.destination
                                                            }
                                                            onChange={(e) =>
                                                                updateEdge(
                                                                    rowIndex,
                                                                    edgeIndex,
                                                                    "destination",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="w-full p-0.5 border rounded dark:bg-zinc-700 dark:text-white text-center text-xs nodrag"
                                                        />
                                                    ) : (
                                                        <div className="text-center">
                                                            {edge.destination}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Edge Button - shown only when selected */}
                                    {selected && (
                                        <div className="flex justify-end pr-2 py-0.5 bg-gray-50 dark:bg-gray-800">
                                            <button
                                                onClick={() =>
                                                    addEdgeToRow(rowIndex)
                                                }
                                                className="px-1.5 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                            >
                                                + Edge
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    )}
                </div>
            </div>

            {/* Add Row Button */}
            {selected && (
                <div className="mt-2 flex justify-center">
                    <button
                        onClick={addRow}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                    >
                        Add Row
                    </button>
                </div>
            )}
        </div>
    );
}) as unknown as TableauNodeComponent;

TableauNode.defaultData = {
    rows: [
        {
            originEvent: "",
            stateChange: "",
            edges: [
                {
                    edgeNumber: 1,
                    condition: "True",
                    delay: "0",
                    parameter: "-",
                    destination: "",
                },
            ],
        },
    ],
};

TableauNode.displayName = "Tableau";

TableauNode.getGraphType = () => "eventGraph";

(TableauNode as any).getDefaultData = () => ({
    rows: [
        {
            originEvent: "",
            stateChange: "",
            edges: [
                {
                    edgeNumber: 1,
                    condition: "True",
                    delay: "0",
                    parameter: "-",
                    destination: "",
                },
            ],
        },
    ],
});

(TableauNode as any).hiddenProperties = ["rows", "rowsText", "rowsData"];

export default TableauNode;

export const TableauNodePreview = () => {
    return (
        <div className="border-2 border-black dark:border-white bg-white dark:bg-zinc-800 rounded-lg p-3 min-h-[120px] min-w-[300px] flex flex-col">
            <div className="font-semibold text-base text-center mb-3 pb-1 border-b border-gray-300 dark:border-gray-600">
                Tableau
            </div>

            {/* Simple Table */}
            <div className="border-2 border-gray-400 dark:border-gray-500 rounded overflow-hidden flex-grow flex flex-col">
                {/* Table Header */}
                <div className="grid grid-cols-3 bg-gray-200 dark:bg-gray-700 divide-x divide-gray-400 dark:divide-gray-500">
                    <div className="p-2 text-sm font-medium text-center min-w-[60px]">
                        Event
                    </div>
                    <div className="p-2 text-sm font-medium text-center min-w-[60px]">
                        State
                    </div>
                    <div className="p-2 text-sm font-medium text-center min-w-[60px]">
                        Next
                    </div>
                </div>

                {/* Sample data row */}
                <div className="grid grid-cols-3 divide-x divide-gray-400 dark:divide-gray-500 border-t border-gray-400 dark:border-gray-500 flex-grow">
                    <div className="p-2 text-sm text-center">E1</div>
                    <div className="p-2 text-sm text-center">s+1</div>
                    <div className="p-2 text-sm text-center">E2</div>
                </div>

                {/* Empty row */}
                <div className="grid grid-cols-3 divide-x divide-gray-400 dark:divide-gray-500 border-t border-gray-400 dark:border-gray-500">
                    <div className="p-2 text-sm text-center text-gray-400">
                        ...
                    </div>
                    <div className="p-2 text-sm text-center text-gray-400">
                        ...
                    </div>
                    <div className="p-2 text-sm text-center text-gray-400">
                        ...
                    </div>
                </div>
            </div>
        </div>
    );
};
