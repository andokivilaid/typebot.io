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
        items: normalizeChoiceItems(block.items),
      };
    case "image":
      return {
        type: "image",
        content: normalizeImageContent(block.content),
      };
    case "Wait":
      return {
        type: "Wait",
        options: normalizeWaitOptions(block.options),
      };
    case "text input":
    case "email input":
    case "phone number input":
    case "number input":
    case "url input":
      return {
        type: block.type,
        options: normalizeInputOptions(block.options),
      };
  }
};

const normalizeTextContent = (content: unknown) => {
  if (typeof content === "string") {
    return {
      richText: [{ type: "p" as const, children: [{ text: content }] }],
    };
  }

  if (Array.isArray(content)) {
    if (content.every((item) => typeof item === "string")) {
      return {
        richText: content.map((paragraph) => ({
          type: "p" as const,
          children: [{ text: paragraph }],
        })),
      };
    }

    return {
      richText: content.map(normalizeRichTextParagraph),
    };
  }

  if (isRecord(content)) {
    if (Array.isArray(content.richText)) {
      return {
        richText: content.richText.map(normalizeRichTextParagraph),
      };
    }

    if (typeof content.text === "string") {
      return {
        richText: [{ type: "p" as const, children: [{ text: content.text }] }],
      };
    }
  }

  if (content === undefined || content === null) {
    return {
      richText: [{ type: "p" as const, children: [{ text: "" }] }],
    };
  }

  return {
    richText: [
      { type: "p" as const, children: [{ text: String(content) }] },
    ],
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

const normalizeChoiceItems = (items: unknown) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [{ content: "Option 1" }];
  }

  return items.map(normalizeChoiceItem);
};

const normalizeChoiceItem = (item: unknown) => {
  if (typeof item === "string") {
    return { content: item };
  }

  if (isRecord(item)) {
    if (typeof item.content === "string") {
      return { content: item.content };
    }

    if (typeof item.text === "string") {
      return { content: item.text };
    }

    if (typeof item.label === "string") {
      return { content: item.label };
    }
  }

  return { content: String(item) };
};

const normalizeInputOptions = (options: unknown) => {
  const coercedOptions = coerceToObject(options);
  if (!coercedOptions) return undefined;

  const labelsRecord = coerceToObject(coercedOptions.labels);
  const labels =
    labelsRecord === undefined
      ? undefined
      : {
          ...(typeof labelsRecord.placeholder === "string"
            ? { placeholder: labelsRecord.placeholder }
            : {}),
          ...(typeof labelsRecord.button === "string"
            ? { button: labelsRecord.button }
            : {}),
        };

  const normalizedOptions = {
    ...(labels !== undefined && Object.keys(labels).length > 0
      ? { labels }
      : {}),
    ...(typeof coercedOptions.variableId === "string"
      ? { variableId: coercedOptions.variableId }
      : {}),
  };

  return Object.keys(normalizedOptions).length > 0
    ? normalizedOptions
    : undefined;
};

const normalizeWaitOptions = (options: unknown) => {
  const coercedOptions = coerceToObject(options);
  if (!coercedOptions) return undefined;

  const secondsToWaitFor = coercedOptions.secondsToWaitFor;
  if (secondsToWaitFor === undefined || secondsToWaitFor === null) {
    return undefined;
  }

  return {
    secondsToWaitFor: String(secondsToWaitFor),
  };
};

const normalizeImageContent = (content: unknown) => {
  const coercedContent = coerceToObject(content);
  if (coercedContent && typeof coercedContent.url === "string") {
    return { url: coercedContent.url };
  }

  if (typeof content === "string") {
    return { url: content };
  }

  if (Array.isArray(content)) {
    const firstString = content.find((item) => typeof item === "string");
    if (typeof firstString === "string") {
      return { url: firstString };
    }

    const firstObject = content.find(isRecord);
    if (firstObject && typeof firstObject.url === "string") {
      return { url: firstObject.url };
    }
  }

  return { url: "" };
};

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

    const items = normalizeChoiceItems(block.items);
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      if (items[itemIndex]?.content === choice) {
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

const coerceToObject = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    return value.find(isRecord);
  }
  if (isRecord(value)) return value;
  return undefined;
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
