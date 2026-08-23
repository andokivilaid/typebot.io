import { zodToSchema } from "@typebot.io/ai/zodToSchema";
import { env } from "@typebot.io/env";
import type { CoreMessage } from "ai";
import { generateObject, streamText } from "ai";
import { parseCopilotChatResponse } from "./applyCopilotActions";
import { buildChatSystemPrompt } from "./buildSystemPrompt";
import {
  copilotActionsMarker,
  copilotChatResponseSchema,
} from "./copilotActionSchema";
import { createGeminiModel } from "./createGeminiModel";

type RunCopilotChatParams = {
  typebotContext: string;
  messages: CoreMessage[];
};

export const runCopilotChat = async ({
  typebotContext,
  messages,
}: RunCopilotChatParams) => {
  const { object } = await generateObject({
    model: createGeminiModel(env.COPILOT_DEFAULT_MODEL),
    schema: zodToSchema(copilotChatResponseSchema),
    system: buildChatSystemPrompt(typebotContext),
    messages,
  });

  return copilotChatResponseSchema.parse(object);
};

export const streamCopilotChat = ({
  typebotContext,
  messages,
}: RunCopilotChatParams) =>
  streamText({
    model: createGeminiModel(env.COPILOT_DEFAULT_MODEL),
    system: buildChatSystemPrompt(typebotContext),
    messages,
  });

export const parseStreamedCopilotResponse = parseCopilotChatResponse;

export { copilotActionsMarker };
