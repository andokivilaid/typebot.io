import { z } from "zod";
import { generatedBlockSchema } from "./generatedTypebotSchema";

const coordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const edgeEndpointSchema = z.union([
  z.object({
    eventId: z.string(),
  }),
  z.object({
    blockId: z.string(),
    groupId: z.string().optional(),
    itemId: z.string().optional(),
    pathId: z.string().optional(),
  }),
]);

export const copilotActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("addGroup"),
    id: z.string().optional(),
    title: z.string(),
    blocks: z.array(generatedBlockSchema).min(1),
    graphCoordinates: coordinatesSchema,
  }),
  z.object({
    type: z.literal("addBlock"),
    groupId: z.string(),
    block: generatedBlockSchema,
  }),
  z.object({
    type: z.literal("addEdge"),
    from: edgeEndpointSchema,
    to: z.object({
      groupId: z.string(),
      blockId: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("addVariable"),
    id: z.string().optional(),
    name: z.string(),
    isSessionVariable: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("updateGroup"),
    groupId: z.string(),
    updates: z.object({
      title: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("updateSettings"),
    patch: z.object({
      general: z
        .object({
          isBrandingEnabled: z.boolean().optional(),
        })
        .optional(),
    }),
  }),
]);

export type CopilotAction = z.infer<typeof copilotActionSchema>;

export const copilotChatResponseSchema = z.object({
  message: z.string(),
  actions: z.array(copilotActionSchema),
  summary: z.string().optional(),
});

export type CopilotChatResponse = z.infer<typeof copilotChatResponseSchema>;

export const copilotActionsMarker = "---COPILOT_ACTIONS---";

// Re-export generated schemas used by typebot generation
export {
  type GeneratedBlock,
  type GeneratedEdge,
  type GeneratedGroup,
  type GeneratedTypebot,
  generatedBlockSchema,
  generatedEdgeSchema,
  generatedGroupSchema,
  generatedTypebotSchema,
} from "./generatedTypebotSchema";
