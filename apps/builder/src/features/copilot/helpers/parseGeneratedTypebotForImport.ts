import { preprocessTypebot } from "@typebot.io/typebot/preprocessTypebot";
import { typebotV6Schema } from "@typebot.io/typebot/schemas/typebot";
import { z } from "zod";

const generatedTypebotImportSchema = typebotV6Schema.omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
  customDomain: true,
  whatsAppCredentialsId: true,
  riskLevel: true,
  isArchived: true,
  isClosed: true,
  publicId: true,
  spaceId: true,
  resultsTablePreferences: true,
  selectedThemeTemplateId: true,
  icon: true,
  folderId: true,
});

export const parseGeneratedTypebotForImport = (
  value: Record<string, unknown>,
) => generatedTypebotImportSchema.safeParse(preprocessTypebot(value));

export const parseBuilderCopilotActions = (value: unknown) => {
  const builderActionSchema = z.array(z.record(z.string(), z.unknown()));
  return builderActionSchema.safeParse(value);
};
