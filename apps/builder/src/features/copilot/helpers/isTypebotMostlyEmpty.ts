import { BubbleBlockType } from "@typebot.io/blocks-bubbles/constants";
import { isInputBlock } from "@typebot.io/blocks-core/helpers";
import type { TypebotV6 } from "@typebot.io/typebot/schemas/typebot";

export const isTypebotMostlyEmpty = (typebot: TypebotV6) => {
  if (typebot.groups.length === 0) return true;

  const totalBlocks = typebot.groups.reduce(
    (count, group) => count + group.blocks.length,
    0,
  );

  if (totalBlocks === 0) return true;

  if (typebot.groups.length === 1 && totalBlocks === 1) {
    const onlyBlock = typebot.groups[0]?.blocks[0];
    if (!onlyBlock) return true;

    if (onlyBlock.type === BubbleBlockType.TEXT) {
      const richText = onlyBlock.content?.richText;
      return !richText || richText.length === 0;
    }

    if (isInputBlock(onlyBlock)) {
      return true;
    }
  }

  return typebot.groups.length <= 1 && totalBlocks <= 1;
};
