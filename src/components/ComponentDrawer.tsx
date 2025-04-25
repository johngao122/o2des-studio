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
import React from "react";
import { InitializationNodePreview } from "./nodes/eventbased/InitializationNode";
import { EventNodePreview } from "./nodes/eventbased/EventNode";
import { ModuleFramePreview } from "./nodes/eventbased/ModuleFrame";
import { TableauNodePreview } from "./nodes/eventbased/TableauNode";
import { MathJaxContext } from "better-react-mathjax";

const NODE_DESCRIPTIONS = {
    initialization: "Initial state setup",
    event: "Event node with state updates",
    moduleFrame: "Container for encapsulating event graphs",
    tableau: "Event transition table with conditions and parameters",
} as const;

const PREVIEW_COMPONENTS = {
    [NODE_TYPES.INITIALIZATION]: InitializationNodePreview,
    [NODE_TYPES.EVENT]: EventNodePreview,
    [NODE_TYPES.MODULE_FRAME]: ModuleFramePreview,
    [NODE_TYPES.TABLEAU]: TableauNodePreview,
} as const;

const nodeFactory = new NodeFactory();
const viewController = new ViewController();
const commandController = CommandController.getInstance();

const PREVIEW_CONTAINER = {
    width: 160,
    height: 80,
};

const TOOLTIP_CONTAINER = {
    width: 200,
    height: 120,
};

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

    const renderNodePreview = (
        nodeType: string,
        isTooltip: boolean = false
    ) => {
        const PreviewComponent =
            PREVIEW_COMPONENTS[nodeType as keyof typeof PREVIEW_COMPONENTS];
        if (!PreviewComponent) return null;

        const containerSize = isTooltip ? TOOLTIP_CONTAINER : PREVIEW_CONTAINER;

        const PreviewWrapper = ({
            children,
        }: {
            children: React.ReactNode;
        }) => {
            const wrapperRef = React.useRef<HTMLDivElement>(null);
            const [scale, setScale] = React.useState(1);

            React.useEffect(() => {
                if (wrapperRef.current) {
                    const wrapper = wrapperRef.current;
                    const content = wrapper.children[0];
                    if (content) {
                        const scaleX =
                            containerSize.width / content.scrollWidth;
                        const scaleY =
                            containerSize.height / content.scrollHeight;
                        const scale = Math.min(scaleX, scaleY, 1);
                        setScale(scale * 0.9);
                    }
                }
            }, []);

            return (
                <div
                    ref={wrapperRef}
                    className="flex items-center justify-center"
                    style={{
                        width: containerSize.width,
                        height: containerSize.height,
                    }}
                >
                    <div
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: "center center",
                        }}
                    >
                        {children}
                    </div>
                </div>
            );
        };

        return (
            <PreviewWrapper>
                <PreviewComponent />
            </PreviewWrapper>
        );
    };

    return (
        <div className="w-64 bg-white dark:bg-zinc-800 border-r border-gray-200 dark:border-zinc-700 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-3 dark:text-white">
                Components
            </h3>

            <div className="">
                <div className="font-medium text-gray-700 dark:text-gray-300">
                    Event-Based
                </div>
                <div className="flex flex-col gap-6 py-4">
                    {Object.keys(nodeTypes).map((type) => (
                        <TooltipProvider key={type}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="cursor-pointer transition-transform hover:scale-105 p-2"
                                        draggable
                                        onDragStart={(e) =>
                                            onDragStart(e, type)
                                        }
                                        onClick={(e) => onClick(e, type)}
                                    >
                                        {renderNodePreview(type)}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="right"
                                    className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg"
                                >
                                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-md p-2">
                                        {renderNodePreview(type, true)}
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {type.charAt(0).toUpperCase() +
                                            type.slice(1)}{" "}
                                        Node
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                        {
                                            NODE_DESCRIPTIONS[
                                                type as keyof typeof NODE_DESCRIPTIONS
                                            ]
                                        }
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
