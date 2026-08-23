import { ORPCError } from "@orpc/server";
import { authenticatedProcedure } from "@typebot.io/config/orpc/builder/middlewares";
import { buildTypebotContextText } from "@typebot.io/copilot/buildTypebotContext";
import { isCopilotConfigured } from "@typebot.io/copilot/createGeminiModel";
import { generateTypebotFromPrompt } from "@typebot.io/copilot/generateTypebotFromPrompt";
import { isCopilotFeatureEnabled } from "@typebot.io/copilot/isCopilotFeatureEnabled";
import {
  materializeCopilotActionsForBuilder,
  summarizeCopilotActions,
} from "@typebot.io/copilot/materializeCopilotActions";
import {
  COPILOT_DAILY_REQUEST_LIMIT,
  consumeCopilotRateLimit,
  getCopilotRateLimitStatus,
} from "@typebot.io/copilot/rateLimit";
import { runCopilotChat } from "@typebot.io/copilot/runCopilotChat";
import prisma from "@typebot.io/prisma";
import { migrateTypebot } from "@typebot.io/typebot/migrations/migrateTypebot";
import { typebotSchema } from "@typebot.io/typebot/schemas/typebot";
import { z } from "zod";
import { isWriteTypebotForbidden } from "@/features/typebot/helpers/isWriteTypebotForbidden";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const assertCopilotAccess = async (userId: string) => {
  if (!isCopilotConfigured()) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "AI Co-pilot is not configured on this instance",
    });
  }

  const featureEnabled = await isCopilotFeatureEnabled(userId);
  if (!featureEnabled) {
    throw new ORPCError("FORBIDDEN", {
      message: "AI Co-pilot is not enabled for your account",
    });
  }
};

const assertRateLimit = async (userId: string) => {
  const rateLimitResult = await consumeCopilotRateLimit(userId);
  if (!rateLimitResult.allowed) {
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: "Daily AI Co-pilot request limit reached. Try again tomorrow.",
    });
  }
  return rateLimitResult;
};

const fetchWritableTypebot = async (typebotId: string, userId: string) => {
  const typebot = await prisma.typebot.findUnique({
    where: { id: typebotId },
    select: {
      id: true,
      name: true,
      version: true,
      groups: true,
      edges: true,
      variables: true,
      events: true,
      theme: true,
      settings: true,
      workspaceId: true,
      icon: true,
      folderId: true,
      publicId: true,
      customDomain: true,
      createdAt: true,
      updatedAt: true,
      selectedThemeTemplateId: true,
      resultsTablePreferences: true,
      isArchived: true,
      isClosed: true,
      whatsAppCredentialsId: true,
      riskLevel: true,
      spaceId: true,
      workspace: {
        select: {
          id: true,
          isPastDue: true,
          isSuspended: true,
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      },
      collaborators: {
        select: {
          userId: true,
          type: true,
        },
      },
    },
  });

  if (!typebot) {
    throw new ORPCError("NOT_FOUND", { message: "Typebot not found" });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  if (await isWriteTypebotForbidden(typebot, user)) {
    throw new ORPCError("NOT_FOUND", { message: "Typebot not found" });
  }

  const { typebot: migratedTypebot } = await migrateTypebot(
    typebotSchema.parse(typebot),
  );

  return migratedTypebot;
};

export const getStatus = authenticatedProcedure
  .output(
    z.object({
      enabled: z.boolean(),
      remainingRequests: z.number(),
      limit: z.number(),
    }),
  )
  .handler(async ({ context: { user } }) => {
    const configured = isCopilotConfigured();
    const featureEnabled = configured
      ? await isCopilotFeatureEnabled(user.id)
      : false;
    const rateLimitStatus = getCopilotRateLimitStatus(user.id);

    return {
      enabled: featureEnabled,
      remainingRequests: rateLimitStatus.remaining,
      limit: rateLimitStatus.limit ?? COPILOT_DAILY_REQUEST_LIMIT,
    };
  });

export const generateTypebot = authenticatedProcedure
  .input(
    z.object({
      workspaceId: z.string().optional(),
      prompt: z.string().min(1),
      tone: z.string().optional(),
      goal: z.string().optional(),
    }),
  )
  .output(
    z.object({
      typebot: z.record(z.string(), z.unknown()),
      remainingRequests: z.number(),
    }),
  )
  .handler(async ({ input, context: { user } }) => {
    await assertCopilotAccess(user.id);
    const rateLimitResult = await assertRateLimit(user.id);

    try {
      const generatedTypebot = await generateTypebotFromPrompt(input);
      return {
        typebot: generatedTypebot,
        remainingRequests: rateLimitResult.remaining,
      };
    } catch (error) {
      console.error("Copilot generateTypebot error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to generate typebot. Please try again.",
      });
    }
  });

export const chat = authenticatedProcedure
  .input(
    z.object({
      typebotId: z.string(),
      messages: z.array(chatMessageSchema).min(1),
    }),
  )
  .output(
    z.object({
      message: z.string(),
      actions: z.array(z.record(z.string(), z.unknown())),
      summary: z.string().optional(),
      remainingRequests: z.number(),
    }),
  )
  .handler(async ({ input, context: { user } }) => {
    await assertCopilotAccess(user.id);
    const rateLimitResult = await assertRateLimit(user.id);

    const typebot = await fetchWritableTypebot(input.typebotId, user.id);
    const typebotContext = buildTypebotContextText(typebot);

    try {
      const response = await runCopilotChat({
        typebotContext,
        messages: input.messages,
      });

      const builderActions = materializeCopilotActionsForBuilder(
        response.actions,
      );

      return {
        message: response.message,
        actions: builderActions,
        summary: response.summary ?? summarizeCopilotActions(response.actions),
        remainingRequests: rateLimitResult.remaining,
      };
    } catch (error) {
      console.error("Copilot chat error:", error);
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to get a response from AI Co-pilot. Please try again.",
      });
    }
  });

export const copilotRouter = {
  getStatus,
  generateTypebot,
  chat,
};
