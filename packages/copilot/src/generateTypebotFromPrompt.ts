import { zodToSchema } from "@typebot.io/ai/zodToSchema";
import { env } from "@typebot.io/env";
import { generateObject } from "ai";
import { buildGenerationSystemPrompt } from "./buildSystemPrompt";
import { createGeminiModel } from "./createGeminiModel";
import { materializeGeneratedTypebot } from "./materializeGeneratedTypebot";
import { normalizeGeneratedTypebot } from "./normalizeGeneratedTypebot";
import { rawGeneratedTypebotSchema } from "./rawGeneratedTypebotSchema";

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

  const { object: rawTypebot } = await generateObject({
    model: createGeminiModel(env.COPILOT_GENERATION_MODEL),
    schema: zodToSchema(rawGeneratedTypebotSchema),
    system: buildGenerationSystemPrompt(),
    prompt: userPrompt,
  });

  const generatedTypebot = normalizeGeneratedTypebot(rawTypebot);

  return materializeGeneratedTypebot(generatedTypebot);
};
