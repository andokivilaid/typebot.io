import { createId } from "@paralleldrive/cuid2";
import type { BlockV6 } from "@typebot.io/blocks-core/schemas/schema";
import type { BuilderCopilotAction } from "@typebot.io/copilot/materializeCopilotActions";
import { byId } from "@typebot.io/lib/utils";
import type { TypebotV6 } from "@typebot.io/typebot/schemas/typebot";
import type { BlocksActions } from "@/features/editor/providers/typebotActions/blocks";
import type { EdgesActions } from "@/features/editor/providers/typebotActions/edges";
import type { GroupsActions } from "@/features/editor/providers/typebotActions/groups";
import type { VariablesActions } from "@/features/editor/providers/typebotActions/variables";

type TypebotEditorActions = Pick<GroupsActions, "createGroup" | "updateGroup"> &
  Pick<BlocksActions, "createBlock"> &
  Pick<EdgesActions, "createEdge"> &
  Pick<VariablesActions, "createVariable"> & {
    updateTypebot: (props: {
      updates: Partial<TypebotV6>;
      save?: boolean;
    }) => Promise<TypebotV6 | undefined>;
  };

type ApplyCopilotActionsParams = {
  typebot: TypebotV6;
  actions: BuilderCopilotAction[];
  editorActions: TypebotEditorActions;
};

const isBlockV6 = (block: unknown): block is BlockV6 =>
  typeof block === "object" &&
  block !== null &&
  "id" in block &&
  "type" in block &&
  typeof block.id === "string" &&
  typeof block.type === "string";

export const applyCopilotActions = async ({
  typebot,
  actions,
  editorActions,
}: ApplyCopilotActionsParams) => {
  const groupBlockCounts = new Map(
    typebot.groups.map((group) => [group.id, group.blocks.length]),
  );
  let addedGroupsCount = 0;

  for (const action of actions) {
    switch (action.type) {
      case "addVariable": {
        editorActions.createVariable({
          id: action.id ?? createId(),
          name: action.name,
          isSessionVariable: action.isSessionVariable ?? true,
        });
        break;
      }
      case "addGroup": {
        const groupIndex = typebot.groups.length + addedGroupsCount;
        const groupId = action.id ?? createId();
        const materializedBlocks = action.blocks.filter(isBlockV6);
        const firstBlock = materializedBlocks[0];

        if (!firstBlock) break;

        editorActions.createGroup({
          id: groupId,
          x: action.graphCoordinates.x,
          y: action.graphCoordinates.y,
          block: firstBlock,
          indices: {
            groupIndex,
            blockIndex: 0,
          },
        });

        editorActions.updateGroup(groupIndex, {
          title: action.title,
        });

        groupBlockCounts.set(groupId, materializedBlocks.length);
        addedGroupsCount += 1;

        materializedBlocks.slice(1).forEach((block, blockOffset) => {
          editorActions.createBlock(block, {
            groupIndex,
            blockIndex: blockOffset + 1,
          });
        });

        break;
      }
      case "addBlock": {
        if (!isBlockV6(action.block)) break;

        const groupIndex = typebot.groups.findIndex(byId(action.groupId));
        if (groupIndex === -1) break;

        const nextBlockIndex =
          groupBlockCounts.get(action.groupId) ??
          typebot.groups[groupIndex]?.blocks.length ??
          0;

        editorActions.createBlock(action.block, {
          groupIndex,
          blockIndex: nextBlockIndex,
        });

        groupBlockCounts.set(action.groupId, nextBlockIndex + 1);
        break;
      }
      case "addEdge": {
        editorActions.createEdge({
          from: action.from,
          to: action.to,
        });
        break;
      }
      case "updateGroup": {
        const groupIndex = typebot.groups.findIndex(byId(action.groupId));
        if (groupIndex === -1) break;
        editorActions.updateGroup(groupIndex, action.updates);
        break;
      }
      case "updateSettings": {
        await editorActions.updateTypebot({
          updates: {
            settings: {
              ...typebot.settings,
              ...action.patch,
            },
          },
        });
        break;
      }
    }
  }
};

export const summarizeBuilderCopilotActions = (
  actions: BuilderCopilotAction[],
) => {
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
