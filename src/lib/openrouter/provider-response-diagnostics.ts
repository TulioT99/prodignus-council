import "server-only";

import type { OpenRouterExecutionContext } from "@/lib/openrouter/execution-context";
import type { OpenRouterChatCompletionResponse } from "@/lib/openrouter/types";

export type ProviderResponseFailureReason =
  | "HTTP_BODY_NOT_JSON"
  | "PAYLOAD_NULL"
  | "PAYLOAD_NOT_OBJECT"
  | "CHOICES_MISSING"
  | "CHOICES_EMPTY"
  | "FIRST_CHOICE_MISSING"
  | "FIRST_CHOICE_INVALID"
  | "MESSAGE_MISSING"
  | "CONTENT_MISSING"
  | "CONTENT_NULL"
  | "CONTENT_EMPTY_STRING"
  | "CONTENT_ARRAY"
  | "CONTENT_UNEXPECTED_TYPE";

export type ProviderResponseDiagnosticSnapshot = {
  event: "openrouter_invalid_provider_response";
  failureReason: ProviderResponseFailureReason;
  executionId: string | null;
  caller: string | null;
  advisorId: string | null;
  attempt: number;
  model: string;
  httpStatus: number;
  payloadType: string;
  topLevelKeys: string[];
  choicesPresent: boolean;
  choicesCount: number | null;
  firstChoicePresent: boolean;
  messagePresent: boolean;
  contentPresent: boolean;
  contentType: string | null;
  contentLength: number | null;
  contentBlockCount: number | null;
  contentBlockTypes: string[] | null;
  textBlockCount: number | null;
  combinedTextLength: number | null;
  finishReason: string | null;
  providerErrorPresent: boolean;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  elapsedMs: number;
};

type ContentMetadata = {
  contentPresent: boolean;
  contentType: string | null;
  contentLength: number | null;
  contentBlockCount: number | null;
  contentBlockTypes: string[] | null;
  textBlockCount: number | null;
  combinedTextLength: number | null;
};

function getPayloadType(payload: unknown): string {
  if (payload === null) {
    return "null";
  }

  if (Array.isArray(payload)) {
    return "array";
  }

  return typeof payload;
}

function getTopLevelKeys(payload: unknown): string[] {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  return Object.keys(payload as Record<string, unknown>).sort();
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function analyzeArrayContent(content: unknown[]): ContentMetadata {
  const contentBlockTypes: string[] = [];
  let textBlockCount = 0;
  let combinedTextLength = 0;

  for (const block of content) {
    if (block !== null && typeof block === "object" && !Array.isArray(block)) {
      const record = block as Record<string, unknown>;
      const blockType =
        typeof record.type === "string" && record.type.trim()
          ? record.type.trim()
          : "unknown";
      contentBlockTypes.push(blockType);

      if (blockType === "text" && typeof record.text === "string") {
        textBlockCount += 1;
        combinedTextLength += record.text.length;
      }

      continue;
    }

    contentBlockTypes.push(typeof block);
  }

  return {
    contentPresent: true,
    contentType: "array",
    contentLength: null,
    contentBlockCount: content.length,
    contentBlockTypes,
    textBlockCount,
    combinedTextLength: combinedTextLength > 0 ? combinedTextLength : null,
  };
}

function analyzeContentMetadata(content: unknown): ContentMetadata {
  if (content === undefined) {
    return {
      contentPresent: false,
      contentType: null,
      contentLength: null,
      contentBlockCount: null,
      contentBlockTypes: null,
      textBlockCount: null,
      combinedTextLength: null,
    };
  }

  if (content === null) {
    return {
      contentPresent: true,
      contentType: "null",
      contentLength: null,
      contentBlockCount: null,
      contentBlockTypes: null,
      textBlockCount: null,
      combinedTextLength: null,
    };
  }

  if (typeof content === "string") {
    return {
      contentPresent: true,
      contentType: "string",
      contentLength: content.length,
      contentBlockCount: null,
      contentBlockTypes: null,
      textBlockCount: content.trim() ? 1 : 0,
      combinedTextLength: content.length,
    };
  }

  if (Array.isArray(content)) {
    return analyzeArrayContent(content);
  }

  return {
    contentPresent: true,
    contentType: typeof content,
    contentLength: null,
    contentBlockCount: null,
    contentBlockTypes: null,
    textBlockCount: null,
    combinedTextLength: null,
  };
}

function readFinishReason(payload: unknown): string | null {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const choices = (payload as Record<string, unknown>).choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const firstChoice = choices[0];

  if (firstChoice === null || typeof firstChoice !== "object" || Array.isArray(firstChoice)) {
    return null;
  }

  const finishReason = (firstChoice as Record<string, unknown>).finish_reason;

  return typeof finishReason === "string" && finishReason.trim()
    ? finishReason.trim()
    : null;
}

function readUsageTokens(payload: unknown): {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
} {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    };
  }

  const usage = (payload as Record<string, unknown>).usage;

  if (usage === null || typeof usage !== "object" || Array.isArray(usage)) {
    return {
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    };
  }

  const usageRecord = usage as Record<string, unknown>;

  return {
    promptTokens: readFiniteNumber(usageRecord.prompt_tokens),
    completionTokens: readFiniteNumber(usageRecord.completion_tokens),
    totalTokens: readFiniteNumber(usageRecord.total_tokens),
  };
}

function hasProviderError(payload: unknown): boolean {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const error = (payload as Record<string, unknown>).error;

  return error !== undefined && error !== null;
}

function classifyContentFailure(content: unknown): ProviderResponseFailureReason | null {
  if (content === undefined) {
    return "CONTENT_MISSING";
  }

  if (content === null) {
    return "CONTENT_NULL";
  }

  if (typeof content === "string") {
    return content.trim() ? null : "CONTENT_EMPTY_STRING";
  }

  if (Array.isArray(content)) {
    return "CONTENT_ARRAY";
  }

  return "CONTENT_UNEXPECTED_TYPE";
}

export function classifyProviderPayloadFailure(
  payload: unknown,
): ProviderResponseFailureReason | null {
  if (payload === null) {
    return "PAYLOAD_NULL";
  }

  if (typeof payload !== "object" || Array.isArray(payload)) {
    return "PAYLOAD_NOT_OBJECT";
  }

  const record = payload as Record<string, unknown>;

  if (!("choices" in record)) {
    return "CHOICES_MISSING";
  }

  if (!Array.isArray(record.choices)) {
    return "CHOICES_MISSING";
  }

  if (record.choices.length === 0) {
    return "CHOICES_EMPTY";
  }

  const firstChoice = record.choices[0];

  if (firstChoice === undefined || firstChoice === null) {
    return "FIRST_CHOICE_MISSING";
  }

  if (typeof firstChoice !== "object" || Array.isArray(firstChoice)) {
    return "FIRST_CHOICE_INVALID";
  }

  const choiceRecord = firstChoice as Record<string, unknown>;

  if (!("message" in choiceRecord) || choiceRecord.message === undefined) {
    return "MESSAGE_MISSING";
  }

  const message = choiceRecord.message;

  if (message === null || typeof message !== "object" || Array.isArray(message)) {
    return "MESSAGE_MISSING";
  }

  const messageRecord = message as Record<string, unknown>;

  return classifyContentFailure(messageRecord.content);
}

export function buildProviderResponseDiagnosticSnapshot(input: {
  failureReason: ProviderResponseFailureReason;
  payload: unknown;
  httpStatus: number;
  model: string;
  attempt: number;
  elapsedMs: number;
  executionContext?: OpenRouterExecutionContext;
}): ProviderResponseDiagnosticSnapshot {
  const payload = input.payload;
  const topLevelKeys = getTopLevelKeys(payload);
  const usage = readUsageTokens(payload);
  const finishReason = readFinishReason(payload);

  let choicesPresent = false;
  let choicesCount: number | null = null;
  let firstChoicePresent = false;
  let messagePresent = false;
  let contentMetadata: ContentMetadata = {
    contentPresent: false,
    contentType: null,
    contentLength: null,
    contentBlockCount: null,
    contentBlockTypes: null,
    textBlockCount: null,
    combinedTextLength: null,
  };

  if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;

    if ("choices" in record && Array.isArray(record.choices)) {
      choicesPresent = true;
      choicesCount = record.choices.length;

      const firstChoice = record.choices[0];

      if (firstChoice !== undefined && firstChoice !== null) {
        firstChoicePresent = true;

        if (typeof firstChoice === "object" && !Array.isArray(firstChoice)) {
          const choiceRecord = firstChoice as Record<string, unknown>;

          if (
            "message" in choiceRecord &&
            choiceRecord.message !== null &&
            typeof choiceRecord.message === "object" &&
            !Array.isArray(choiceRecord.message)
          ) {
            messagePresent = true;
            const messageRecord = choiceRecord.message as Record<string, unknown>;
            contentMetadata = analyzeContentMetadata(messageRecord.content);
          }
        }
      }
    }
  }

  return {
    event: "openrouter_invalid_provider_response",
    failureReason: input.failureReason,
    executionId: input.executionContext?.executionId ?? null,
    caller: input.executionContext?.caller ?? null,
    advisorId: input.executionContext?.advisorId ?? null,
    attempt: input.attempt,
    model: input.model,
    httpStatus: input.httpStatus,
    payloadType: getPayloadType(payload),
    topLevelKeys,
    choicesPresent,
    choicesCount,
    firstChoicePresent,
    messagePresent,
    contentPresent: contentMetadata.contentPresent,
    contentType: contentMetadata.contentType,
    contentLength: contentMetadata.contentLength,
    contentBlockCount: contentMetadata.contentBlockCount,
    contentBlockTypes: contentMetadata.contentBlockTypes,
    textBlockCount: contentMetadata.textBlockCount,
    combinedTextLength: contentMetadata.combinedTextLength,
    finishReason,
    providerErrorPresent: hasProviderError(payload),
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    elapsedMs: input.elapsedMs,
  };
}

export function logInvalidProviderResponseDiagnostic(
  snapshot: ProviderResponseDiagnosticSnapshot,
): void {
  console.info("[OpenRouter Diagnostic]", JSON.stringify(snapshot));
}

export function logChairmanLifecycleEvent(entry: {
  event:
    | "chairman_attempt_started"
    | "chairman_http_response_received"
    | "chairman_invalid_provider_response"
    | "chairman_retry_triggered"
    | "chairman_completed"
    | "chairman_failed_after_retries";
  executionId: string;
  attempt: number;
  model: string;
  elapsedMs?: number;
  errorCode?: string;
  failureReason?: ProviderResponseFailureReason;
}): void {
  console.info(
    "[Council Chairman]",
    JSON.stringify({
      event: entry.event,
      executionId: entry.executionId,
      attempt: entry.attempt,
      model: entry.model,
      elapsedMs: entry.elapsedMs ?? null,
      errorCode: entry.errorCode ?? null,
      failureReason: entry.failureReason ?? null,
    }),
  );
}

export function isValidAssistantStringContent(
  response: OpenRouterChatCompletionResponse,
): boolean {
  const content = response.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim().length > 0;
}
