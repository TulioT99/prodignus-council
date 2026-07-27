import "server-only";

import type { RetryFailureCategory } from "@/lib/retry/types";

export type OpenRouterChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenRouterChatCompletionRequest = {
  model: string;
  messages: OpenRouterChatMessage[];
  temperature: number;
  stream: false;
};

export type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
};

export type OpenRouterChatCompletionChoice = {
  finish_reason?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
};

export type OpenRouterChatCompletionResponse = {
  model?: string;
  choices?: OpenRouterChatCompletionChoice[];
  usage?: OpenRouterUsage;
  error?: {
    message?: string;
    code?: string | number;
  };
};

export type OpenRouterCompletionResult = {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  estimatedCostUsd?: number;
  retryCount: number;
};

export type OpenRouterClientErrorCode =
  | "CONFIGURATION_ERROR"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE"
  /** Parent/session cancellation — not a provider failure; never retry. */
  | "REQUEST_CANCELLED";

export class OpenRouterClientError extends Error {
  readonly code: OpenRouterClientErrorCode;
  readonly retryable: boolean;
  /** Provider-neutral retry category preserved for delay/eligibility (AR-003). */
  readonly failureCategory: RetryFailureCategory;

  constructor(
    code: OpenRouterClientErrorCode,
    message: string,
    retryable: boolean,
    failureCategory: RetryFailureCategory,
  ) {
    super(message);
    this.name = "OpenRouterClientError";
    this.code = code;
    this.retryable = retryable;
    this.failureCategory = failureCategory;
  }
}
