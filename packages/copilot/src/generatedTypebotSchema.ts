import { z } from "zod";

const coordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const richTextNodeSchema = z.object({
  text: z.string(),
});

const richTextParagraphSchema = z.object({
  type: z.literal("p"),
  children: z.array(richTextNodeSchema),
});

const generatedTextBlockSchema = z.object({
  type: z.literal("text"),
  content: z.object({
    richText: z.array(richTextParagraphSchema).min(1),
  }),
});

const generatedChoiceItemSchema = z.object({
  content: z.string(),
});

const generatedChoiceBlockSchema = z.object({
  type: z.literal("choice input"),
  items: z.array(generatedChoiceItemSchema).min(1),
});

const generatedEmailBlockSchema = z.object({
  type: z.literal("email input"),
  options: z
    .object({
      labels: z
        .object({
          placeholder: z.string().optional(),
          button: z.string().optional(),
        })
        .optional(),
      variableId: z.string().optional(),
    })
    .optional(),
});

const generatedTextInputBlockSchema = z.object({
  type: z.literal("text input"),
  options: z
    .object({
      labels: z
        .object({
          placeholder: z.string().optional(),
          button: z.string().optional(),
        })
        .optional(),
      variableId: z.string().optional(),
    })
    .optional(),
});

const generatedPhoneBlockSchema = z.object({
  type: z.literal("phone number input"),
  options: z
    .object({
      labels: z
        .object({
          placeholder: z.string().optional(),
          button: z.string().optional(),
        })
        .optional(),
      variableId: z.string().optional(),
    })
    .optional(),
});

const generatedNumberBlockSchema = z.object({
  type: z.literal("number input"),
  options: z
    .object({
      labels: z
        .object({
          placeholder: z.string().optional(),
          button: z.string().optional(),
        })
        .optional(),
      variableId: z.string().optional(),
    })
    .optional(),
});

const generatedUrlBlockSchema = z.object({
  type: z.literal("url input"),
  options: z
    .object({
      labels: z
        .object({
          placeholder: z.string().optional(),
          button: z.string().optional(),
        })
        .optional(),
      variableId: z.string().optional(),
    })
    .optional(),
});

const generatedImageBlockSchema = z.object({
  type: z.literal("image"),
  content: z.object({
    url: z.string(),
  }),
});

const generatedWaitBlockSchema = z.object({
  type: z.literal("Wait"),
  options: z
    .object({
      secondsToWaitFor: z.string().optional(),
    })
    .optional(),
});

export const generatedBlockSchema = z.discriminatedUnion("type", [
  generatedTextBlockSchema,
  generatedChoiceBlockSchema,
  generatedEmailBlockSchema,
  generatedTextInputBlockSchema,
  generatedPhoneBlockSchema,
  generatedNumberBlockSchema,
  generatedUrlBlockSchema,
  generatedImageBlockSchema,
  generatedWaitBlockSchema,
]);

export type GeneratedBlock = z.infer<typeof generatedBlockSchema>;

const edgeTargetSchema = z.object({
  groupTitle: z.string(),
  blockIndex: z.number().optional(),
});

const edgeSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("start"),
  }),
  z.object({
    kind: z.literal("block"),
    groupTitle: z.string(),
    blockIndex: z.number(),
    itemIndex: z.number().optional(),
  }),
]);

export const generatedEdgeSchema = z.object({
  from: edgeSourceSchema,
  to: edgeTargetSchema,
});

export type GeneratedEdge = z.infer<typeof generatedEdgeSchema>;

export const generatedGroupSchema = z.object({
  title: z.string(),
  graphCoordinates: coordinatesSchema,
  blocks: z.array(generatedBlockSchema).min(1),
});

export type GeneratedGroup = z.infer<typeof generatedGroupSchema>;

export const generatedVariableSchema = z.object({
  name: z.string(),
});

export const generatedTypebotSchema = z.object({
  name: z.string(),
  groups: z.array(generatedGroupSchema).min(1),
  edges: z.array(generatedEdgeSchema),
  variables: z.array(generatedVariableSchema).optional(),
});

export type GeneratedTypebot = z.infer<typeof generatedTypebotSchema>;
