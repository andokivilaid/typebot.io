import { createId } from "@paralleldrive/cuid2";
import { BubbleBlockType } from "@typebot.io/blocks-bubbles/constants";
import type { BlockV6 } from "@typebot.io/blocks-core/schemas/schema";
import { InputBlockType } from "@typebot.io/blocks-inputs/constants";
import { LogicBlockType } from "@typebot.io/blocks-logic/constants";
import type { GroupV6 } from "@typebot.io/groups/schemas";
import type { CopilotAction } from "./copilotActionSchema";
import type { GeneratedBlock } from "./generatedTypebotSchema";

export const materializeGeneratedBlock = (block: GeneratedBlock): BlockV6 => {
  const blockId = createId();

  switch (block.type) {
    case "text":
      return {
        id: blockId,
        type: BubbleBlockType.TEXT,
        content: block.content,
      };
    case "choice input":
      return {
        id: blockId,
        type: InputBlockType.CHOICE,
        items: block.items.map((item) => ({
          id: createId(),
          content: item.content,
        })),
      };
    case "image":
      return {
        id: blockId,
        type: BubbleBlockType.IMAGE,
        content: block.content,
      };
    case "Wait":
      return {
        id: blockId,
        type: LogicBlockType.WAIT,
        options: block.options,
      };
    case "text input":
      return {
        id: blockId,
        type: InputBlockType.TEXT,
        options: block.options,
      };
    case "email input":
      return {
        id: blockId,
        type: InputBlockType.EMAIL,
        options: block.options,
      };
    case "phone number input":
      return {
        id: blockId,
        type: InputBlockType.PHONE,
        options: block.options,
      };
    case "number input":
      return {
        id: blockId,
        type: InputBlockType.NUMBER,
        options: block.options,
      };
    case "url input":
      return {
        id: blockId,
        type: InputBlockType.URL,
        options: block.options,
      };
  }
};

export const materializeCopilotActionsForBuilder = (actions: CopilotAction[]) =>
  actions.map((action) => {
    if (action.type === "addGroup") {
      return {
        ...action,
        blocks: action.blocks.map(materializeGeneratedBlock),
      };
    }

    if (action.type === "addBlock") {
      return {
        ...action,
        block: materializeGeneratedBlock(action.block),
      };
    }

    return action;
  });

export type BuilderCopilotAction = ReturnType<
  typeof materializeCopilotActionsForBuilder
>[number];

export const summarizeCopilotActions = (actions: CopilotAction[]) => {
  const groupCount = actions.filter(
    (action) => action.type === "addGroup",
  ).length;
  const blockCount = actions.reduce((count, action) => {
    if (action.type === "addGroup") return count + action.blocks.length;
    if (action.type === "addBlock") return count + 1;
    return count;
  }, 0);
  const edgeCount = actions.filter(
    (action) => action.type === "addEdge",
  ).length;
  const variableCount = actions.filter(
    (action) => action.type === "addVariable",
  ).length;

  const parts = [
    groupCount > 0 ? `${groupCount} group${groupCount === 1 ? "" : "s"}` : null,
    blockCount > 0 ? `${blockCount} block${blockCount === 1 ? "" : "s"}` : null,
    edgeCount > 0 ? `${edgeCount} edge${edgeCount === 1 ? "" : "s"}` : null,
    variableCount > 0
      ? `${variableCount} variable${variableCount === 1 ? "" : "s"}`
      : null,
  ].filter((part) => part !== null);

  if (parts.length === 0) return "Apply suggested changes";
  return `Apply ${parts.join(", ")}`;
};

export type { GroupV6 };
