import { useQuery } from "@tanstack/react-query";
import type { BuilderCopilotAction } from "@typebot.io/copilot/materializeCopilotActions";
import { Button } from "@typebot.io/ui/components/Button";
import { Textarea } from "@typebot.io/ui/components/Textarea";
import { Cancel01Icon } from "@typebot.io/ui/icons/Cancel01Icon";
import { LoaderCircleIcon } from "@typebot.io/ui/icons/LoaderCircleIcon";
import { SparklesIcon } from "@typebot.io/ui/icons/SparklesIcon";
import { useDrag } from "@use-gesture/react";
import { useEffect, useRef, useState } from "react";
import { useTypebot } from "@/features/editor/providers/TypebotProvider";
import { ResizeHandle } from "@/features/preview/components/ResizeHandle";
import { useRightPanel } from "@/hooks/useRightPanel";
import { orpc } from "@/lib/queryClient";
import { toast } from "@/lib/toast";
import {
  applyCopilotActions,
  summarizeBuilderCopilotActions,
} from "../helpers/applyCopilotActions";
import {
  type CopilotChatMessage,
  streamCopilotChat,
} from "../helpers/streamCopilotChat";

type ChatMessage = CopilotChatMessage & {
  id: string;
  pendingActions?: BuilderCopilotAction[];
  actionsSummary?: string;
};

type Props = {
  onClose: () => void;
};

export const CopilotDrawer = ({ onClose }: Props) => {
  const {
    typebot,
    createGroup,
    createBlock,
    createEdge,
    createVariable,
    updateGroup,
    updateTypebot,
    save,
  } = useTypebot();
  const [, setRightPanel] = useRightPanel();
  const [width, setWidth] = useState(420);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isApplyingActions, setIsApplyingActions] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: copilotStatus, refetch: refetchCopilotStatus } = useQuery(
    orpc.copilot.getStatus.queryOptions({}),
  );

  const useResizeHandleDrag = useDrag(
    (state) => {
      setWidth(-state.offset[0]);
    },
    {
      from: () => [-width, 0],
    },
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const handleCloseClick = () => {
    abortControllerRef.current?.abort();
    onClose();
    setRightPanel(null);
  };

  const handleSendMessage = async () => {
    if (!typebot || !inputValue.trim() || isStreaming) return;

    if (!copilotStatus?.enabled) {
      toast({
        title: "AI co-pilot unavailable",
        description: "Copilot is not enabled on this instance.",
      });
      return;
    }

    if ((copilotStatus.remainingRequests ?? 0) <= 0) {
      toast({
        title: "Daily quota reached",
        description: "You have used all AI co-pilot requests for today.",
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue("");
    setIsStreaming(true);

    const assistantMessageId = crypto.randomUUID();
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      },
    ]);

    abortControllerRef.current = new AbortController();

    const result = await streamCopilotChat({
      typebotId: typebot.id,
      messages: nextMessages.map(({ role, content }) => ({ role, content })),
      signal: abortControllerRef.current.signal,
      onTextPart: (message) => {
        setMessages((currentMessages) =>
          currentMessages.map((messageItem) =>
            messageItem.id === assistantMessageId
              ? { ...messageItem, content: message }
              : messageItem,
          ),
        );
      },
    });

    abortControllerRef.current = null;
    setIsStreaming(false);
    refetchCopilotStatus();

    if (result.error) {
      toast({
        title: "Co-pilot error",
        description: result.error.description,
      });
      setMessages((currentMessages) =>
        currentMessages.filter(
          (messageItem) => messageItem.id !== assistantMessageId,
        ),
      );
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((messageItem) =>
        messageItem.id === assistantMessageId
          ? {
              ...messageItem,
              content: result.message,
              pendingActions: result.actions,
              actionsSummary: result.summary,
            }
          : messageItem,
      ),
    );
  };

  const handleApplyActions = async (message: ChatMessage) => {
    if (!typebot || !message.pendingActions?.length || isApplyingActions)
      return;

    setIsApplyingActions(true);
    try {
      await applyCopilotActions({
        typebot,
        actions: message.pendingActions,
        editorActions: {
          createGroup,
          createBlock,
          createEdge,
          createVariable,
          updateGroup,
          updateTypebot,
        },
      });
      await save();
      setMessages((currentMessages) =>
        currentMessages.map((messageItem) =>
          messageItem.id === message.id
            ? {
                ...messageItem,
                pendingActions: undefined,
                actionsSummary: undefined,
              }
            : messageItem,
        ),
      );
      toast({
        type: "success",
        description: "Co-pilot changes applied",
      });
    } catch (error) {
      toast({
        title: "Could not apply changes",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsApplyingActions(false);
    }
  };

  const isInputDisabled =
    !copilotStatus?.enabled ||
    (copilotStatus.remainingRequests ?? 0) <= 0 ||
    isStreaming ||
    isApplyingActions;

  return (
    <div
      className="group/drawer flex absolute border-l shadow-md p-6 right-0 top-0 h-full bg-gray-1 rounded-l-lg z-10"
      style={{ width: `${width}px` }}
    >
      <ResizeHandle
        {...useResizeHandleDrag()}
        className="absolute left-[-7.5px] top-1/2 -translate-y-1/2 opacity-0 pointer-events-none transition-opacity group-hover/drawer:opacity-100 group-hover/drawer:pointer-events-auto group-focus-within/drawer:opacity-100 group-focus-within/drawer:pointer-events-auto"
      />
      <div className="flex flex-col w-full gap-4 min-h-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-blue-10" />
              <h2 className="text-md font-medium">AI co-pilot</h2>
            </div>
            {copilotStatus?.enabled ? (
              <p className="text-xs text-gray-10">
                {copilotStatus.remainingRequests} request
                {copilotStatus.remainingRequests === 1 ? "" : "s"} left today
              </p>
            ) : (
              <p className="text-xs text-gray-10">Not enabled</p>
            )}
          </div>
          <Button onClick={handleCloseClick} variant="secondary" size="icon">
            <Cancel01Icon />
          </Button>
        </div>

        {!copilotStatus?.enabled ? (
          <div className="rounded-lg border bg-gray-2 p-4 text-sm text-gray-11">
            AI co-pilot is not enabled on this instance. Configure{" "}
            <code className="text-xs">GEMINI_API_KEY</code> and{" "}
            <code className="text-xs">COPILOT_ENABLED=true</code> to use it.
          </div>
        ) : copilotStatus.remainingRequests <= 0 ? (
          <div className="rounded-lg border bg-gray-2 p-4 text-sm text-gray-11">
            You have reached today&apos;s co-pilot quota. Try again tomorrow.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0 pr-1">
              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-gray-11">
                  Ask for help editing this bot. For example: &quot;Add an email
                  input after the welcome message.&quot;
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === "user"
                        ? "self-end max-w-[90%] rounded-lg bg-orange-3 px-3 py-2 text-sm"
                        : "self-start max-w-[95%] rounded-lg bg-gray-3 px-3 py-2 text-sm whitespace-pre-wrap"
                    }
                  >
                    {message.content ||
                      (isStreaming && message.role === "assistant" ? (
                        <LoaderCircleIcon className="size-4 animate-spin" />
                      ) : (
                        ""
                      ))}
                    {message.pendingActions &&
                    message.pendingActions.length > 0 ? (
                      <div className="mt-3 flex flex-col gap-2 border-t border-gray-5 pt-3">
                        <p className="text-xs text-gray-10">
                          {message.actionsSummary ??
                            summarizeBuilderCopilotActions(
                              message.pendingActions,
                            )}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleApplyActions(message)}
                          disabled={isApplyingActions}
                        >
                          {isApplyingActions ? (
                            <LoaderCircleIcon className="animate-spin" />
                          ) : null}
                          Apply changes
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <Textarea
                value={inputValue}
                onValueChange={setInputValue}
                placeholder="Ask the co-pilot to edit this bot..."
                rows={3}
                disabled={isInputDisabled}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={() => void handleSendMessage()}
                disabled={isInputDisabled || inputValue.trim().length === 0}
              >
                {isStreaming ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <SparklesIcon />
                )}
                Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
