import {
  type CopilotAction,
  copilotActionSchema,
  copilotActionsMarker,
} from "./copilotActionSchema";
import { summarizeCopilotActions } from "./materializeCopilotActions";

export const parseCopilotChatResponse = (content: string) => {
  const markerIndex = content.indexOf(copilotActionsMarker);
  if (markerIndex === -1) {
    return {
      message: content.trim(),
      actions: [] as CopilotAction[],
      summary: undefined as string | undefined,
    };
  }

  const message = content.slice(0, markerIndex).trim();
  const actionsJson = content
    .slice(markerIndex + copilotActionsMarker.length)
    .trim();

  try {
    const parsed = JSON.parse(actionsJson);
    const actionsResult = copilotActionSchema.array().safeParse(parsed.actions);
    const actions = actionsResult.success ? actionsResult.data : [];
    const summary =
      typeof parsed.summary === "string"
        ? parsed.summary
        : summarizeCopilotActions(actions);

    return {
      message,
      actions,
      summary,
    };
  } catch {
    return {
      message,
      actions: [] as CopilotAction[],
      summary: undefined as string | undefined,
    };
  }
};
