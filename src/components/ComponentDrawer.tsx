import { DragEvent, MouseEvent } from "react";
import { NODE_TYPES, nodeTypes } from "./nodes";
import { useStore } from "@/store";
import { NodeFactory } from "@/factories/NodeFactory";
import { ViewController } from "@/controllers/ViewController";
import { CommandController } from "@/controllers/CommandController";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const NODE_DESCRIPTIONS = {
    initialization: "Initial state setup",
    event: "Event node with state updates",
} as const;

// Move controllers outside component
const nodeFactory = new NodeFactory();
const viewController = new ViewController();
const commandController = CommandController.getInstance();

const ComponentDrawer = () => {
    const onDragStart = (
        event: DragEvent<HTMLDivElement>,
        nodeType: string
    ) => {
        event.dataTransfer.setData("application/reactflow", nodeType);
        event.dataTransfer.effectAllowed = "move";
    };

    const addNode = (nodeType: string) => {
        const viewport = viewController.getViewport();

        // Calculate center of current viewport
        const position = {
            x: (-viewport.x + window.innerWidth / 2) / viewport.zoom - 100,
            y: (-viewport.y + window.innerHeight / 2) / viewport.zoom - 50,
        };

        const newNode = nodeFactory.createNode(nodeType, position);
        const command = commandController.createAddNodeCommand(newNode);
        commandController.execute(command);
    };

    const onClick = (event: MouseEvent<HTMLDivElement>, nodeType: string) => {
        event.preventDefault();
        addNode(nodeType);
    };

    const renderNodePreview = (NodeComponent: any, scale: number = 1) => {
        const getPreviewData = (type: string) => {
            switch (type) {
                case NODE_TYPES.EVENT:
                    return {
                        stateUpdate: "S = S + 1",
                        eventParameters: "i",
                    };
                case NODE_TYPES.INITIALIZATION:
                default:
                    return { initializations: [] };
            }
        };

        const previewProps = {
            id: "preview",
            data: getPreviewData(
                NodeComponent.displayName?.toLowerCase() || ""
            ),
            selected: false,
            isConnectable: false,
            className: `transform scale-${scale * 100}`,
        };

        return <NodeComponent {...previewProps} />;
    };

    return (
        <div className="w-64 bg-white dark:bg-zinc-800 border-r border-gray-200 dark:border-zinc-700 p-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
                Components
            </h3>

            <div className="space-y-4">
                <div className="font-medium text-gray-700 dark:text-gray-300">
                    Event-Based
                </div>
                <div className="space-y-6">
                    {Object.entries(nodeTypes).map(([type, NodeComponent]) => (
                        <TooltipProvider key={type}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="cursor-pointer"
                                        draggable
                                        onDragStart={(e) =>
                                            onDragStart(e, type)
                                        }
                                        onClick={(e) => onClick(e, type)}
                                    >
                                        <div className="scale-75 origin-top">
                                            <div className="react-flow__node">
                                                {renderNodePreview(
                                                    NodeComponent,
                                                    0.75
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                                            {NODE_DESCRIPTIONS[
                                                type as keyof typeof NODE_DESCRIPTIONS
                                            ] || type}
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="right"
                                    className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg"
                                >
                                    <div className="w-[200px] h-[120px] flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-md p-2">
                                        <div className="react-flow__node">
                                            {renderNodePreview(
                                                NodeComponent,
                                                1
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {type.charAt(0).toUpperCase() +
                                            type.slice(1)}{" "}
                                        Node
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ComponentDrawer;
