import { parseCopilotChatResponse } from "@typebot.io/copilot/applyCopilotActions";
import type { BuilderCopilotAction } from "@typebot.io/copilot/materializeCopilotActions";
import { materializeCopilotActionsForBuilder } from "@typebot.io/copilot/materializeCopilotActions";
import { parseFailingResponse } from "@typebot.io/lib/parseFailingResponse";
import { parseUnknownClientError } from "@typebot.io/lib/parseUnknownClientError";

export type CopilotChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type StreamCopilotChatParams = {
  typebotId: string;
  messages: CopilotChatMessage[];
  onTextPart: (text: string) => void;
  signal?: AbortSignal;
};

type StreamCopilotChatResult = {
  message: string;
  actions?: BuilderCopilotAction[];
  summary?: string;
  error?: {
    description: string;
  };
};

type LegacyStreamHandler = {
  onTextPart?: (text: string) => void;
  onErrorPart?: (error: string) => void;
};

const processLegacyDataStream = async ({
  stream,
  handlers,
}: {
  stream: ReadableStream<Uint8Array>;
  handlers: LegacyStreamHandler;
}) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (line.length > 0) processLegacyDataStreamLine(line, handlers);

      newlineIndex = buffer.indexOf("\n");
    }
  }

  const trailingLine = buffer.trim();
  if (trailingLine.length > 0)
    processLegacyDataStreamLine(trailingLine, handlers);
};

const processLegacyDataStreamLine = (
  line: string,
  handlers: LegacyStreamHandler,
) => {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return;

  const prefix = line.slice(0, colonIndex);
  const rawValue = line.slice(colonIndex + 1);

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    return;
  }

  switch (prefix) {
    case "0": {
      if (typeof parsedValue === "string") handlers.onTextPart?.(parsedValue);
      break;
    }
    case "3": {
      handlers.onErrorPart?.(
        typeof parsedValue === "string"
          ? parsedValue
          : JSON.stringify(parsedValue),
      );
      break;
    }
  }
};

export const streamCopilotChat = async ({
  typebotId,
  messages,
  onTextPart,
  signal,
}: StreamCopilotChatParams): Promise<StreamCopilotChatResult> => {
  try {
    const response = await fetch("/api/copilot/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        typebotId,
        messages,
      }),
      signal,
    });

    if (!response.ok) {
      return {
        message: "",
        error: await parseFailingResponse(response, {
          context: "While streaming copilot chat",
        }),
      };
    }

    if (!response.body) {
      return {
        message: "",
        error: {
          description: "The copilot stream response body is empty",
        },
      };
    }

    let message = "";

    await processLegacyDataStream({
      stream: response.body,
      handlers: {
        onTextPart: (text) => {
          message += text;
          onTextPart(message);
        },
        onErrorPart: (error) => {
          throw new Error(error);
        },
      },
    });

    const parsedResponse = parseCopilotChatResponse(message);

    return {
      message: parsedResponse.message,
      actions: materializeCopilotActionsForBuilder(parsedResponse.actions),
      summary: parsedResponse.summary,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        message: "",
        error: {
          description: "Request aborted",
        },
      };
    }

    const parsedError = await parseUnknownClientError({
      err: error,
      context: "While streaming copilot chat",
    });

    return {
      message: "",
      error: parsedError,
    };
  }
};
