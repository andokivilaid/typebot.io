import type {
  GeneratedBlock,
  GeneratedEdge,
  GeneratedGroup,
  GeneratedTypebot,
} from "./generatedTypebotSchema";
import { generatedTypebotSchema } from "./generatedTypebotSchema";
import type {
  RawGeneratedBlock,
  RawGeneratedEdge,
  RawGeneratedGroup,
  RawGeneratedTypebot,
} from "./rawGeneratedTypebotSchema";

export const normalizeGeneratedTypebot = (
  rawTypebot: RawGeneratedTypebot,
): GeneratedTypebot => {
  const normalizedGroups = rawTypebot.groups.map((group, groupIndex) =>
    normalizeGroup(group, groupIndex),
  );

  const normalizedEdges = rawTypebot.edges.map((edge) =>
    normalizeEdge(edge, normalizedGroups, rawTypebot.groups),
  );

  const normalizedTypebot = {
    name: rawTypebot.name,
    groups: normalizedGroups,
    edges: normalizedEdges,
    variables: rawTypebot.variables,
  };

  return generatedTypebotSchema.parse(normalizedTypebot);
};

const normalizeGroup = (
  group: RawGeneratedGroup,
  groupIndex: number,
): GeneratedGroup => ({
  title: group.title,
  graphCoordinates: group.graphCoordinates ?? {
    x: groupIndex * 350,
    y: 100,
  },
  blocks: group.blocks.map(normalizeBlock),
});

const normalizeBlock = (block: RawGeneratedBlock): GeneratedBlock => {
  switch (block.type) {
    case "text":
      return {
        type: "text",
        content: normalizeTextContent(block.content),
      };
    case "choice input":
      return {
        type: "choice input",
        items: block.items.map(normalizeChoiceItem),
      };
    case "image":
      return block;
    case "Wait":
      return block;
    case "text input":
      return block;
    case "email input":
      return block;
    case "phone number input":
      return block;
    case "number input":
      return block;
    case "url input":
      return block;
  }
};

const normalizeTextContent = (
  content: string | { richText: unknown[] },
) => {
  if (typeof content === "string") {
    return {
      richText: [{ type: "p" as const, children: [{ text: content }] }],
    };
  }

  return {
    richText: content.richText.map(normalizeRichTextParagraph),
  };
};

const normalizeRichTextParagraph = (paragraph: unknown) => {
  if (typeof paragraph === "string") {
    return { type: "p" as const, children: [{ text: paragraph }] };
  }

  if (!isRecord(paragraph)) {
    throw new Error("Invalid rich text paragraph");
  }

  if (paragraph.type === "p" && Array.isArray(paragraph.children)) {
    return {
      type: "p" as const,
      children: paragraph.children.map(normalizeRichTextNode),
    };
  }

  if (typeof paragraph.text === "string") {
    return { type: "p" as const, children: [{ text: paragraph.text }] };
  }

  throw new Error("Invalid rich text paragraph");
};

const normalizeRichTextNode = (node: unknown) => {
  if (typeof node === "string") {
    return { text: node };
  }

  if (!isRecord(node) || typeof node.text !== "string") {
    throw new Error("Invalid rich text node");
  }

  return { text: node.text };
};

const normalizeChoiceItem = (item: string | { content: string }) =>
  typeof item === "string" ? { content: item } : { content: item.content };

const normalizeEdge = (
  edge: RawGeneratedEdge,
  normalizedGroups: GeneratedGroup[],
  rawGroups: RawGeneratedGroup[],
): GeneratedEdge => ({
  from: normalizeEdgeSource(edge.from, normalizedGroups, rawGroups),
  to: edge.to,
});

const normalizeEdgeSource = (
  from: RawGeneratedEdge["from"],
  normalizedGroups: GeneratedGroup[],
  rawGroups: RawGeneratedGroup[],
): GeneratedEdge["from"] => {
  if (from.kind === "start" || from.kind === "event") {
    return { kind: "start" };
  }

  if (!from.groupTitle) {
    return { kind: "start" };
  }

  if (from.choice) {
    const choiceIndices = resolveChoiceIndices(
      rawGroups,
      from.groupTitle,
      from.choice,
    );
    if (choiceIndices) {
      return {
        kind: "block",
        groupTitle: from.groupTitle,
        blockIndex: choiceIndices.blockIndex,
        itemIndex: choiceIndices.itemIndex,
      };
    }
  }

  const blockIndex =
    from.blockIndex ??
    findDefaultBlockIndex(normalizedGroups, from.groupTitle) ??
    0;

  return {
    kind: "block",
    groupTitle: from.groupTitle,
    blockIndex,
    ...(from.itemIndex !== undefined ? { itemIndex: from.itemIndex } : {}),
  };
};

const resolveChoiceIndices = (
  groups: RawGeneratedGroup[],
  groupTitle: string,
  choice: string,
) => {
  const group = groups.find((candidate) => candidate.title === groupTitle);
  if (!group) return undefined;

  for (
    let blockIndex = 0;
    blockIndex < group.blocks.length;
    blockIndex += 1
  ) {
    const block = group.blocks[blockIndex];
    if (block?.type !== "choice input") continue;

    for (let itemIndex = 0; itemIndex < block.items.length; itemIndex += 1) {
      const item = block.items[itemIndex];
      const itemContent =
        typeof item === "string" ? item : item?.content ?? "";
      if (itemContent === choice) {
        return { blockIndex, itemIndex };
      }
    }
  }

  return undefined;
};

const findDefaultBlockIndex = (
  groups: GeneratedGroup[],
  groupTitle: string,
) => {
  const group = groups.find((candidate) => candidate.title === groupTitle);
  if (!group || group.blocks.length === 0) return undefined;

  const choiceBlockIndex = group.blocks.findLastIndex(
    (block) => block.type === "choice input",
  );
  if (choiceBlockIndex >= 0) return choiceBlockIndex;

  const inputBlockIndex = group.blocks.findLastIndex((block) =>
    isInputBlock(block),
  );
  if (inputBlockIndex >= 0) return inputBlockIndex;

  return group.blocks.length - 1;
};

const isInputBlock = (block: GeneratedBlock) =>
  block.type === "choice input" ||
  block.type === "text input" ||
  block.type === "email input" ||
  block.type === "phone number input" ||
  block.type === "number input" ||
  block.type === "url input";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
