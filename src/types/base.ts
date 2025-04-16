import { Node, Edge } from "reactflow";
import { z } from "zod";

export const PositionSchema = z.object({
    x: z.number(),
    y: z.number(),
});

export const BaseNodeSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional().default(""),
    position: PositionSchema,
    data: z.record(z.any()).optional(),
    style: z.record(z.any()).optional(),
});

export const EdgeConditionsSchema = z.enum([
    "condition",
    "delay",
    "parameterized",
]);

export const BaseEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    conditions: z.array(EdgeConditionsSchema),
    label: z.string().optional(),
    data: z.record(z.any()).optional(),
    style: z.record(z.any()).optional(),
});

export type Position = z.infer<typeof PositionSchema>;
export type BaseNode = Node<any> & z.infer<typeof BaseNodeSchema>;
export type BaseEdge = Edge<any> & z.infer<typeof BaseEdgeSchema>;

export enum EdgeConditions {
    CONDITION = "condition",
    DELAY = "delay",
    PARAMETERIZED = "parameterized",
}
