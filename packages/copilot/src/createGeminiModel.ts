import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "@typebot.io/env";

export const createGeminiModel = (modelId: string) => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  return createGoogleGenerativeAI({ apiKey })(modelId);
};

export const isCopilotConfigured = () =>
  env.COPILOT_ENABLED && Boolean(env.GEMINI_API_KEY);
