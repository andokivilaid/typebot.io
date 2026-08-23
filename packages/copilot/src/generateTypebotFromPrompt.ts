import { zodToSchema } from "@typebot.io/ai/zodToSchema";
import { env } from "@typebot.io/env";
import { generateObject } from "ai";
import { buildGenerationSystemPrompt } from "./buildSystemPrompt";
import { createGeminiModel } from "./createGeminiModel";
import { generatedTypebotSchema } from "./generatedTypebotSchema";
import { materializeGeneratedTypebot } from "./materializeGeneratedTypebot";

type GenerateTypebotFromPromptParams = {
  prompt: string;
  tone?: string;
  goal?: string;
};

export const generateTypebotFromPrompt = async ({
  prompt,
  tone,
  goal,
}: GenerateTypebotFromPromptParams) => {
  const userPrompt = [
    prompt,
    tone ? `Tone: ${tone}` : undefined,
    goal ? `Goal: ${goal}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const { object: generatedTypebot } = await generateObject({
    model: createGeminiModel(env.COPILOT_GENERATION_MODEL),
    schema: zodToSchema(generatedTypebotSchema),
    system: buildGenerationSystemPrompt(),
    prompt: userPrompt,
  });

  return materializeGeneratedTypebot(generatedTypebot);
};
