import { getChatCompletionSetVarIds } from "@typebot.io/ai/getChatCompletionSetVarIds";
import { getChatCompletionStreamVarId } from "@typebot.io/ai/getChatCompletionStreamVarId";
import { parseChatCompletionOptions } from "@typebot.io/ai/parseChatCompletionOptions";
import { createAction } from "@typebot.io/forge";
import { auth } from "../auth";
import { geminiModels } from "../constants";

export const createChatCompletion = createAction({
  name: "Create chat completion",
  auth,
  options: parseChatCompletionOptions({
    models: {
      type: "static",
      models: geminiModels,
    },
  }),
  getSetVariableIds: getChatCompletionSetVarIds,
  getStreamVariableId: getChatCompletionStreamVarId,
  turnableInto: [
    {
      blockId: "openai",
    },
    {
      blockId: "open-router",
    },
    {
      blockId: "anthropic",
      transform: (options) => ({
        ...options,
        model: undefined,
        action: "Create Chat Message",
      }),
    },
    {
      blockId: "mistral",
      transform: (options) => ({ ...options, model: undefined }),
    },
    {
      blockId: "groq",
    },
    {
      blockId: "deepseek",
      transform: (options) => ({ ...options, model: undefined }),
    },
    {
      blockId: "perplexity",
      transform: (options) => ({ ...options, model: undefined }),
    },
    {
      blockId: "together-ai",
    },
  ],
});
