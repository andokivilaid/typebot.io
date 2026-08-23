import { z } from "zod";

const coordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const rawTextBlockSchema = z.object({
  type: z.literal("text"),
  content: z.union([
    z.string(),
    z.object({
      richText: z.array(z.unknown()).min(1),
    }),
  ]),
});

const rawChoiceBlockSchema = z.object({
  type: z.literal("choice input"),
  items: z
    .array(z.union([z.string(), z.object({ content: z.string() })]))
    .min(1),
});

const rawInputOptionsSchema = z
  .object({
    labels: z
      .object({
        placeholder: z.string().optional(),
        button: z.string().optional(),
      })
      .optional(),
    variableId: z.string().optional(),
  })
  .optional();

const rawEmailBlockSchema = z.object({
  type: z.literal("email input"),
  options: rawInputOptionsSchema,
});

const rawTextInputBlockSchema = z.object({
  type: z.literal("text input"),
  options: rawInputOptionsSchema,
});

const rawPhoneBlockSchema = z.object({
  type: z.literal("phone number input"),
  options: rawInputOptionsSchema,
});

const rawNumberBlockSchema = z.object({
  type: z.literal("number input"),
  options: rawInputOptionsSchema,
});

const rawUrlBlockSchema = z.object({
  type: z.literal("url input"),
  options: rawInputOptionsSchema,
});

const rawImageBlockSchema = z.object({
  type: z.literal("image"),
  content: z.object({
    url: z.string(),
  }),
});

const rawWaitBlockSchema = z.object({
  type: z.literal("Wait"),
  options: z
    .object({
      secondsToWaitFor: z.string().optional(),
    })
    .optional(),
});

export const rawGeneratedBlockSchema = z.discriminatedUnion("type", [
  rawTextBlockSchema,
  rawChoiceBlockSchema,
  rawEmailBlockSchema,
  rawTextInputBlockSchema,
  rawPhoneBlockSchema,
  rawNumberBlockSchema,
  rawUrlBlockSchema,
  rawImageBlockSchema,
  rawWaitBlockSchema,
]);

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
