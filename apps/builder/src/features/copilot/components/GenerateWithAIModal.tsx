import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@typebot.io/ui/components/Button";
import { Dialog } from "@typebot.io/ui/components/Dialog";
import { Field } from "@typebot.io/ui/components/Field";
import { Textarea } from "@typebot.io/ui/components/Textarea";
import { LoaderCircleIcon } from "@typebot.io/ui/icons/LoaderCircleIcon";
import { SparklesIcon } from "@typebot.io/ui/icons/SparklesIcon";
import { useState } from "react";
import { parseGeneratedTypebotForImport } from "@/features/copilot/helpers/parseGeneratedTypebotForImport";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { orpc } from "@/lib/queryClient";
import { toast } from "@/lib/toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (typebotId: string) => void;
};

export const GenerateWithAIModal = ({
  isOpen,
  onClose,
  onGenerated,
}: Props) => {
  const { workspace } = useWorkspace();
  const [prompt, setPrompt] = useState("");
  const [goal, setGoal] = useState("");

  const { data: copilotStatus } = useQuery(
    orpc.copilot.getStatus.queryOptions({
      enabled: isOpen,
    }),
  );

  const { mutate: importTypebot, isPending: isImporting } = useMutation(
    orpc.typebot.importTypebot.mutationOptions({
      onSuccess: (data) => {
        onGenerated(data.typebot.id);
        onClose();
        setPrompt("");
        setGoal("");
      },
    }),
  );

  const { mutate: generateTypebot, isPending: isGenerating } = useMutation(
    orpc.copilot.generateTypebot.mutationOptions({
      onSuccess: (data) => {
        if (!workspace) return;

        const parsedTypebot = parseGeneratedTypebotForImport(data.typebot);
        if (!parsedTypebot.success) {
          toast({
            title: "Could not import generated typebot",
            description: parsedTypebot.error.message,
          });
          return;
        }

        importTypebot({
          workspaceId: workspace.id,
          typebot: parsedTypebot.data,
        });
      },
      onError: (error) => {
        toast({
          title: "Could not generate typebot",
          description: error.message,
        });
      },
    }),
  );

  const isDisabled =
    !copilotStatus?.enabled ||
    copilotStatus.remainingRequests <= 0 ||
    prompt.trim().length === 0 ||
    isGenerating ||
    isImporting;

  const handleSubmit = () => {
    if (!workspace || isDisabled) return;

    generateTypebot({
      workspaceId: workspace.id,
      prompt: prompt.trim(),
      goal: goal.trim() || undefined,
    });
  };

  const isLoading = isGenerating || isImporting;

  return (
    <Dialog.Root isOpen={isOpen} onClose={onClose}>
      <Dialog.Popup className="flex flex-col gap-6 max-w-xl">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-blue-10" />
            <Dialog.Title>Generate with AI</Dialog.Title>
          </div>
          <p className="text-sm text-gray-11">
            Describe the bot you want to build. The co-pilot will draft groups,
            blocks, and variables that you can refine in the editor.
          </p>
        </div>

        {!copilotStatus?.enabled ? (
          <div className="rounded-lg border bg-gray-2 p-4 text-sm text-gray-11">
            AI co-pilot is not enabled on this instance. Ask your workspace
            admin to configure it.
          </div>
        ) : copilotStatus.remainingRequests <= 0 ? (
          <div className="rounded-lg border bg-gray-2 p-4 text-sm text-gray-11">
            You have reached today&apos;s AI co-pilot quota. Try again tomorrow.
          </div>
        ) : (
          <>
            <Field.Root>
              <Field.Label>Prompt</Field.Label>
              <Textarea
                value={prompt}
                onValueChange={setPrompt}
                placeholder="Create a lead generation bot for a SaaS product..."
                rows={5}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Goal (optional)</Field.Label>
              <Textarea
                value={goal}
                onValueChange={setGoal}
                placeholder="Collect name, email, and company size..."
                rows={2}
              />
            </Field.Root>
            <p className="text-xs text-gray-10">
              {copilotStatus.remainingRequests} AI request
              {copilotStatus.remainingRequests === 1 ? "" : "s"} remaining today
            </p>
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isDisabled}>
            {isLoading ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <SparklesIcon />
            )}
            Generate
          </Button>
        </div>
      </Dialog.Popup>
    </Dialog.Root>
  );
};
