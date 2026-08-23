import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import type { Typebot } from "@typebot.io/typebot/schemas/typebot";
import { Button } from "@typebot.io/ui/components/Button";
import { useOpenControls } from "@typebot.io/ui/hooks/useOpenControls";
import { Download01Icon } from "@typebot.io/ui/icons/Download01Icon";
import { GridViewIcon } from "@typebot.io/ui/icons/GridViewIcon";
import { LayoutBottomIcon } from "@typebot.io/ui/icons/LayoutBottomIcon";
import { SparklesIcon } from "@typebot.io/ui/icons/SparklesIcon";
import { useRouter } from "next/router";
import { useState } from "react";
import { GenerateWithAIModal } from "@/features/copilot/components/GenerateWithAIModal";
import { useUser } from "@/features/user/hooks/useUser";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { useRightPanel } from "@/hooks/useRightPanel";
import { orpc } from "@/lib/queryClient";
import { ImportTypebotFromFileButton } from "./ImportTypebotFromFileButton";
import { TemplatesDialog } from "./TemplatesDialog";

export const CreateNewTypebotButtons = () => {
  const { t } = useTranslate();
  const { workspace } = useWorkspace();
  const { user } = useUser();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useOpenControls();
  const generateModalControls = useOpenControls();
  const [, setRightPanel] = useRightPanel();

  const [isLoading, setIsLoading] = useState(false);

  const { data: copilotStatus } = useQuery(
    orpc.copilot.getStatus.queryOptions({}),
  );

  const { mutate: createTypebot } = useMutation(
    orpc.typebot.createTypebot.mutationOptions({
      onMutate: () => {
        setIsLoading(true);
      },
      onSuccess: (data) => {
        router.push({
          pathname: `/typebots/${data.typebot.id}/edit`,
        });
      },
      onSettled: () => {
        setIsLoading(false);
      },
    }),
  );

  const { mutate: importTypebot } = useMutation(
    orpc.typebot.importTypebot.mutationOptions({
      onMutate: () => {
        setIsLoading(true);
      },
      onSuccess: (data) => {
        router.push({
          pathname: `/typebots/${data.typebot.id}/edit`,
          query: {
            rightPanel: "copilot",
          },
        });
        setRightPanel("copilot");
      },
      onSettled: () => {
        setIsLoading(false);
      },
    }),
  );

  const handleCreateSubmit = async (
    typebot?: Typebot,
    args?: { enableSafetyFlags?: boolean; fromTemplate?: string },
  ) => {
    if (!user || !workspace) return;
    const folderId = router.query.folderId?.toString() ?? null;
    if (typebot)
      importTypebot({
        workspaceId: workspace.id,
        typebot: {
          ...typebot,
          folderId,
        },
        fromTemplate: args?.fromTemplate,
        enableSafetyFlags: args?.enableSafetyFlags,
      });
    else
      createTypebot({
        workspaceId: workspace.id,
        typebot: {
          name: t("typebots.defaultName"),
          folderId,
        },
      });
  };

  const handleGeneratedTypebot = (typebotId: string) => {
    router.push({
      pathname: `/typebots/${typebotId}/edit`,
      query: {
        rightPanel: "copilot",
      },
    });
    setRightPanel("copilot");
  };

  return (
    <div className="flex flex-col items-center w-full pt-20 gap-10">
      <div className="flex flex-col w-full max-w-[650px] p-10 gap-10 rounded-lg border bg-gray-1">
        <h2>{t("templates.buttons.heading")}</h2>
        <div className="flex flex-col w-full gap-6">
          <Button
            variant="outline-secondary"
            className="w-full py-8 text-lg [&_svg]:size-5 [&_svg]:text-blue-10"
            onClick={() => handleCreateSubmit()}
            disabled={isLoading}
            size="lg"
          >
            <LayoutBottomIcon />
            {t("templates.buttons.fromScratchButton.label")}
          </Button>
          {copilotStatus?.enabled ? (
            <Button
              variant="outline-secondary"
              className="w-full py-8 text-lg [&_svg]:size-5 [&_svg]:text-blue-10"
              onClick={generateModalControls.onOpen}
              disabled={isLoading || copilotStatus.remainingRequests <= 0}
              size="lg"
            >
              <SparklesIcon />
              Generate with AI
            </Button>
          ) : null}
          <Button
            variant="outline-secondary"
            className="w-full py-8 text-lg [&_svg]:size-5 [&_svg]:text-orange-10"
            onClick={onOpen}
            disabled={isLoading}
            size="lg"
          >
            <GridViewIcon />
            {t("templates.buttons.fromTemplateButton.label")}
          </Button>
          <ImportTypebotFromFileButton
            variant="outline-secondary"
            className="w-full py-8 text-lg [&_svg]:size-5 [&_svg]:text-purple-10"
            disabled={isLoading}
            onNewTypebot={handleCreateSubmit}
            size="lg"
          >
            <Download01Icon />
            {t("templates.buttons.importFileButton.label")}
          </ImportTypebotFromFileButton>
        </div>
      </div>
      <TemplatesDialog
        isOpen={isOpen}
        onClose={onClose}
        onTypebotChoose={handleCreateSubmit}
        isLoading={isLoading}
      />
      <GenerateWithAIModal
        isOpen={generateModalControls.isOpen}
        onClose={generateModalControls.onClose}
        onGenerated={handleGeneratedTypebot}
      />
    </div>
  );
};
