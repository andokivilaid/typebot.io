import { createId } from "@paralleldrive/cuid2";
import { EventType } from "@typebot.io/events/constants";
import type { GroupV6 } from "@typebot.io/groups/schemas";
import { latestTypebotVersion } from "@typebot.io/schemas/versions";
import type { Edge } from "@typebot.io/typebot/schemas/edge";
import type { TypebotV6 } from "@typebot.io/typebot/schemas/typebot";
import type { Variable } from "@typebot.io/variables/schemas";
import type { GeneratedEdge, GeneratedTypebot } from "./generatedTypebotSchema";
import { materializeGeneratedBlock } from "./materializeCopilotActions";

export const materializeGeneratedTypebot = (
  generatedTypebot: GeneratedTypebot,
): Omit<
  TypebotV6,
  | "id"
  | "workspaceId"
  | "createdAt"
  | "updatedAt"
  | "customDomain"
  | "whatsAppCredentialsId"
  | "riskLevel"
  | "isArchived"
  | "isClosed"
  | "publicId"
  | "spaceId"
  | "resultsTablePreferences"
  | "selectedThemeTemplateId"
  | "icon"
  | "folderId"
> => {
  const startEventId = createId();
  const variableNameToId = new Map<string, string>();
  const variables: Variable[] = (generatedTypebot.variables ?? []).map(
    (variable) => {
      const id = createId();
      variableNameToId.set(variable.name, id);
      return {
        id,
        name: variable.name,
      };
    },
  );

  const groupTitleToId = new Map<string, string>();
  const groupTitleToGroup = new Map<string, GroupV6>();

  const groups = generatedTypebot.groups.map((group, groupIndex) => {
    const groupId = createId();
    groupTitleToId.set(group.title, groupId);

    const materializedGroup: GroupV6 = {
      id: groupId,
      title: group.title,
      graphCoordinates: group.graphCoordinates ?? {
        x: groupIndex * 350,
        y: 100,
      },
      blocks: group.blocks.map((block) => materializeGeneratedBlock(block)),
    };

    groupTitleToGroup.set(group.title, materializedGroup);
    return materializedGroup;
  });

  const edges: Edge[] = generatedTypebot.edges.flatMap((edge) => {
    const materializedEdge = materializeEdge(
      edge,
      startEventId,
      groupTitleToId,
      groupTitleToGroup,
    );
    return materializedEdge ? [materializedEdge] : [];
  });

  return {
    version: latestTypebotVersion,
    name: generatedTypebot.name,
    events: [
      {
        id: startEventId,
        type: EventType.START,
        graphCoordinates: { x: 0, y: 0 },
        outgoingEdgeId: edges.find((edge) =>
          isEventSource(edge.from, startEventId),
        )?.id,
      },
    ],
    groups,
    edges,
    variables,
    theme: {},
    settings: {},
  };
};

const materializeEdge = (
  edge: GeneratedEdge,
  startEventId: string,
  groupTitleToId: Map<string, string>,
  groupTitleToGroup: Map<string, GroupV6>,
): Edge | undefined => {
  const targetGroupId = groupTitleToId.get(edge.to.groupTitle);
  const targetGroup = groupTitleToGroup.get(edge.to.groupTitle);
  if (!targetGroupId || !targetGroup) return undefined;

  const targetBlockId =
    edge.to.blockIndex !== undefined
      ? targetGroup.blocks[edge.to.blockIndex]?.id
      : undefined;

  const from =
    edge.from.kind === "start"
      ? { eventId: startEventId }
      : (() => {
          const sourceGroup = groupTitleToGroup.get(edge.from.groupTitle);
          const sourceBlock = sourceGroup?.blocks[edge.from.blockIndex];
          if (!sourceBlock) return undefined;

          const itemId =
            edge.from.itemIndex !== undefined &&
            "items" in sourceBlock &&
            Array.isArray(sourceBlock.items)
              ? sourceBlock.items[edge.from.itemIndex]?.id
              : undefined;

          return {
            blockId: sourceBlock.id,
            ...(itemId ? { itemId } : {}),
          };
        })();

  if (!from) return undefined;

  return {
    id: createId(),
    from,
    to: {
      groupId: targetGroupId,
      ...(targetBlockId ? { blockId: targetBlockId } : {}),
    },
  };
};

const isEventSource = (
  source: Edge["from"],
  eventId: string,
): source is { eventId: string } =>
  "eventId" in source && source.eventId === eventId;
