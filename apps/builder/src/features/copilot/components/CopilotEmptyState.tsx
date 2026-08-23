import { useQuery } from "@tanstack/react-query";
import { Button } from "@typebot.io/ui/components/Button";
import { SparklesIcon } from "@typebot.io/ui/icons/SparklesIcon";
import { useRightPanel } from "@/hooks/useRightPanel";
import { orpc } from "@/lib/queryClient";

export const CopilotEmptyState = () => {
  const [, setRightPanel] = useRightPanel();

  const { data: copilotStatus } = useQuery(
    orpc.copilot.getStatus.queryOptions({}),
  );

  if (!copilotStatus?.enabled) return null;

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 rounded-xl border bg-gray-1/95 backdrop-blur px-6 py-5 shadow-md max-w-md text-center">
      <SparklesIcon className="size-6 text-blue-10" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Build with AI</p>
        <p className="text-sm text-gray-11">
          Chat with the co-pilot to add blocks, inputs, and logic to this bot.
        </p>
      </div>
      <Button size="sm" onClick={() => setRightPanel("copilot")}>
        <SparklesIcon />
        Open co-pilot
      </Button>
    </div>
  );
};
