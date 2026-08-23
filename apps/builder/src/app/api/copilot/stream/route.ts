import { toLegacyDataStream } from "@typebot.io/ai/toLegacyDataStream";
import { auth } from "@typebot.io/auth/lib/nextAuth";
import { buildTypebotContextText } from "@typebot.io/copilot/buildTypebotContext";
import { isCopilotConfigured } from "@typebot.io/copilot/createGeminiModel";
import { isCopilotFeatureEnabled } from "@typebot.io/copilot/isCopilotFeatureEnabled";
import { consumeCopilotRateLimit } from "@typebot.io/copilot/rateLimit";
import { streamCopilotChat } from "@typebot.io/copilot/runCopilotChat";
import prisma from "@typebot.io/prisma";
import { migrateTypebot } from "@typebot.io/typebot/migrations/migrateTypebot";
import { typebotSchema } from "@typebot.io/typebot/schemas/typebot";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isWriteTypebotForbidden } from "@/features/typebot/helpers/isWriteTypebotForbidden";

export const dynamic = "force-dynamic";

const streamInputSchema = z.object({
  typebotId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isCopilotConfigured()) {
    return NextResponse.json(
      { message: "AI Co-pilot is not configured on this instance" },
      { status: 503 },
    );
  }

  const featureEnabled = await isCopilotFeatureEnabled(session.user.id);
  if (!featureEnabled) {
    return NextResponse.json(
      { message: "AI Co-pilot is not enabled for your account" },
      { status: 403 },
    );
  }

  const rateLimitResult = await consumeCopilotRateLimit(session.user.id);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        message: "Daily AI Co-pilot request limit reached. Try again tomorrow.",
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = streamInputSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 },
    );
  }

  const typebotRecord = await prisma.typebot.findUnique({
    where: { id: parsedBody.data.typebotId },
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

  if (!typebotRecord) {
    return NextResponse.json({ message: "Typebot not found" }, { status: 404 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  if (await isWriteTypebotForbidden(typebotRecord, user)) {
    return NextResponse.json({ message: "Typebot not found" }, { status: 404 });
  }

  const { typebot: migratedTypebot } = await migrateTypebot(
    typebotSchema.parse(typebotRecord),
  );
  const typebot = migratedTypebot;

  try {
    const typebotContext = buildTypebotContextText(typebot);
    const result = streamCopilotChat({
      typebotContext,
      messages: parsedBody.data.messages,
    });

    const stream = toLegacyDataStream({
      stream: result.fullStream,
      getErrorMessage: (error) =>
        error instanceof Error ? error.message : "Stream error",
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Copilot-Remaining": String(rateLimitResult.remaining),
      },
    });
  } catch (error) {
    console.error("Copilot stream error:", error);
    return NextResponse.json(
      { message: "Failed to stream AI Co-pilot response" },
      { status: 500 },
    );
  }
}
