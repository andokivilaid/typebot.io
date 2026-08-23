import type { GroupV6 } from "@typebot.io/groups/schemas";
import type { Edge } from "@typebot.io/typebot/schemas/edge";
import type { TypebotV6 } from "@typebot.io/typebot/schemas/typebot";

export const buildTypebotContext = (typebot: TypebotV6) => {
  const groupsSummary = typebot.groups.map(summarizeGroup);
  const edgesSummary = typebot.edges.map(summarizeEdge);
  const variablesSummary = typebot.variables.map((variable) => ({
    id: variable.id,
    name: variable.name,
  }));

  return {
    name: typebot.name,
    groups: groupsSummary,
    edges: edgesSummary,
    variables: variablesSummary,
    events: typebot.events.map((event) => ({
      id: event.id,
      type: event.type,
      outgoingEdgeId: event.outgoingEdgeId,
    })),
  };
};

export const buildTypebotContextText = (typebot: TypebotV6) =>
  JSON.stringify(buildTypebotContext(typebot), null, 2);

const summarizeGroup = (group: GroupV6) => ({
  id: group.id,
  title: group.title,
  graphCoordinates: group.graphCoordinates,
  blocks: group.blocks.map((block, blockIndex) => ({
    id: block.id,
    index: blockIndex,
    type: block.type,
    ...(hasItems(block) ? { itemCount: block.items.length } : {}),
  })),
});

const summarizeEdge = (edge: Edge) => ({
  id: edge.id,
  from: edge.from,
  to: edge.to,
});

const hasItems = (
  block: GroupV6["blocks"][number],
): block is GroupV6["blocks"][number] & { items: unknown[] } =>
  "items" in block && Array.isArray(block.items);
