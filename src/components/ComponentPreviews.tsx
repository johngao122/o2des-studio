"use client";

export const GeneratorNodePreview = () => {
    return (
        <div className="relative" style={{ width: "200px", height: "120px" }}>
            {/* SVG Shape */}
            <svg
                width="200"
                height="120"
                viewBox="0 0 200 120"
                className="absolute inset-0"
            >
                <path
                    d="M 0 15 L 150 15 L 190 60 L 150 105 L 0 105 L 40 60 Z"
                    fill="white"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="dark:fill-zinc-800"
                />
            </svg>

            {/* Content Area */}
            <div className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black px-4">
                <span>Load 1</span>
            </div>
        </div>
    );
};

export const ActivityNodePreview = () => {
    const previewWidth = 240;
    const previewHeight = 70;

    return (
        <div
            className="relative"
            style={{ width: `${previewWidth}px`, height: "140px" }}
        >
            {/* Resources */}
            <div className="absolute top-0 left-0 flex gap-1">
                <div className="px-2 py-1 bg-green-500 text-white text-xs rounded-sm font-medium">
                    RES (5AU)
                </div>
                <div className="px-2 py-1 bg-green-500 text-white text-xs rounded-sm font-medium">
                    ADV
                </div>
            </div>

            {/* Main Content Area */}
            <div
                className="absolute border-2 border-black dark:border-white bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center"
                style={{
                    top: "35px",
                    left: "0px",
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                }}
            >
                <div className="text-sm font-medium text-center dark:text-white text-black">
                    Activity Name
                </div>
            </div>

            {/* Duration */}
            <div
                className="absolute text-xs text-gray-600 dark:text-gray-400 text-center"
                style={{
                    top: `${35 + previewHeight + 10}px`,
                    left: "0px",
                    width: `${previewWidth}px`,
                }}
            >
                Duration: <span className="font-mono">op time</span>
            </div>
        </div>
    );
};

export const TerminatorNodePreview = () => {
    return (
        <div className="relative" style={{ width: "200px", height: "120px" }}>
            {/* SVG Shape - Ellipse */}
            <svg
                width="200"
                height="120"
                viewBox="0 0 200 120"
                className="absolute inset-0"
            >
                <ellipse
                    cx="100"
                    cy="60"
                    rx="95"
                    ry="55"
                    fill="white"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="dark:fill-zinc-800"
                />
            </svg>

            {/* Content Area */}
            <div className="absolute inset-0 flex items-center justify-center text-center dark:text-white text-black px-8">
                <span>Terminator</span>
            </div>
        </div>
    );
};

export const GlobalNodePreview = () => {
    const previewWidth = 240;
    const previewHeight = 70;

    return (
        <div
            className="relative"
            style={{ width: `${previewWidth}px`, height: "140px" }}
        >
            {/* Resources */}
            <div className="absolute top-0 left-0 flex gap-1">
                <div className="px-2 py-1 bg-green-500 text-white text-xs rounded-sm font-medium">
                    RES (5AU)
                </div>
                <div className="px-2 py-1 bg-green-500 text-white text-xs rounded-sm font-medium">
                    ADV
                </div>
            </div>

            {/* Main Content Area with dashed border */}
            <div
                className="absolute border-2 border-dashed border-black dark:border-white bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center"
                style={{
                    top: "35px",
                    left: "0px",
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                }}
            >
                <div className="text-sm font-medium text-center dark:text-white text-black">
                    Global Node
                </div>
            </div>

            {/* Duration */}
            <div
                className="absolute text-xs text-gray-600 dark:text-gray-400 text-center"
                style={{
                    top: `${35 + previewHeight + 10}px`,
                    left: "0px",
                    width: `${previewWidth}px`,
                }}
            >
                Duration: <span className="font-mono">op time</span>
            </div>
        </div>
    );
};

export const EventNodePreview = () => {
    return (
        <div className="relative px-4 py-2 border-2 rounded-[40px] border-black dark:border-white bg-white dark:bg-zinc-800 min-w-[200px] aspect-[2/1]">
            <div className="font-medium text-sm text-center mb-2 pb-1 dark:text-white text-black">
                <span>Event</span>
            </div>
            <div className="space-y-2">
                <div className="space-y-1 flex flex-col items-center justify-center">
                    <span>s = s + 1</span>
                </div>
            </div>
        </div>
    );
};

export const InitializationNodePreview = () => {
    return (
        <div className="relative px-4 py-2 border-2 border-black dark:border-white bg-white dark:bg-zinc-800 min-w-[200px]">
            <div className="font-medium text-sm text-center mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                Initialization
            </div>
            <div className="mt-2 min-h-[40px] text-center dark:text-gray-300">
                <div className="my-1">
                    <span>s = 0</span>
                </div>
            </div>
        </div>
    );
};

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

export const ModuleFramePreview = () => {
    return (
        <div
            className="relative border-2 border-dashed border-gray-400 dark:border-gray-500 bg-gray-50/30 dark:bg-gray-800/30 rounded-lg"
            style={{
                width: 200,
                height: 120,
                minWidth: 200,
                minHeight: 120,
            }}
        >
            {/* Container label */}
            <div className="absolute top-2 left-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Module Frame
                </span>
            </div>

            {/* Visual indicators of contained components */}
            <div className="absolute inset-4 top-8 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded opacity-50"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded opacity-50 w-3/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded opacity-50 w-1/2"></div>
            </div>

            {/* Corner indicator */}
            <div className="absolute bottom-1 right-1 text-xs text-gray-400 dark:text-gray-500">
                ⌾
            </div>
        </div>
    );
};
