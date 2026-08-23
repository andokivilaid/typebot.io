import { z } from "zod";

const coordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const rawGeneratedBlockSchema = z.object({
  type: z.enum([
    "text",
    "choice input",
    "email input",
    "text input",
    "phone number input",
    "number input",
    "url input",
    "image",
    "Wait",
  ]),
  content: z.unknown().optional(),
  items: z.unknown().optional(),
  options: z.unknown().optional(),
});

export type RawGeneratedBlock = z.infer<typeof rawGeneratedBlockSchema>;

const rawEdgeFromSchema = z.object({
  kind: z.enum(["start", "block", "event"]).optional(),
  groupTitle: z.string().optional(),
  blockIndex: z.number().optional(),
  itemIndex: z.number().optional(),
  choice: z.string().optional(),
});

const rawEdgeTargetSchema = z.object({
  groupTitle: z.string(),
  blockIndex: z.number().optional(),
});

export const rawGeneratedEdgeSchema = z.object({
  from: rawEdgeFromSchema,
  to: rawEdgeTargetSchema,
});

export type RawGeneratedEdge = z.infer<typeof rawGeneratedEdgeSchema>;

export const rawGeneratedGroupSchema = z.object({
  title: z.string(),
  graphCoordinates: coordinatesSchema.optional(),
  blocks: z.array(rawGeneratedBlockSchema).min(1),
});

export type RawGeneratedGroup = z.infer<typeof rawGeneratedGroupSchema>;

export const rawGeneratedVariableSchema = z.object({
  name: z.string(),
});

export const rawGeneratedTypebotSchema = z.object({
  name: z.string(),
  groups: z.array(rawGeneratedGroupSchema).min(1),
  edges: z.array(rawGeneratedEdgeSchema),
  variables: z.array(rawGeneratedVariableSchema).optional(),
});

export type RawGeneratedTypebot = z.infer<typeof rawGeneratedTypebotSchema>;
