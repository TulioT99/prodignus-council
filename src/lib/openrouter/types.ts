import "server-only";

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
};

export type OpenRouterChatCompletionChoice = {
  message?: {
    role?: string;
    content?: string;
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
};

export type OpenRouterClientErrorCode =
  | "CONFIGURATION_ERROR"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE";

export class OpenRouterClientError extends Error {
  readonly code: OpenRouterClientErrorCode;
  readonly retryable: boolean;

  constructor(
    code: OpenRouterClientErrorCode,
    message: string,
    retryable: boolean,
  ) {
    super(message);
    this.name = "OpenRouterClientError";
    this.code = code;
    this.retryable = retryable;
  }
}
