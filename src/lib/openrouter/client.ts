import "server-only";

import { councilConfig } from "@/config/council";
import type { OpenRouterExecutionContext } from "@/lib/openrouter/execution-context";
import {
  buildProviderResponseDiagnosticSnapshot,
  classifyProviderPayloadFailure,
  logChairmanLifecycleEvent,
  logInvalidProviderResponseDiagnostic,
} from "@/lib/openrouter/provider-response-diagnostics";
import {
  OpenRouterClientError,
  type OpenRouterChatCompletionResponse,
  type OpenRouterCompletionResult,
} from "@/lib/openrouter/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_TEMPERATURE = 0.3;
const MAX_RETRIES = 2;

export type CallOpenRouterOptions = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
  executionContext?: OpenRouterExecutionContext;
};

export function resolveOpenRouterTimeoutMs(): number {
  const raw = process.env.OPENROUTER_REQUEST_TIMEOUT_MS?.trim();

  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return parsed;
}

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new OpenRouterClientError(
      "CONFIGURATION_ERROR",
      "OpenRouter API key is not configured.",
      false,
    );
  }

  return apiKey;
}

function buildRequestHeaders(apiKey: string): Record<string, string> {
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() || "http://localhost:3000";

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": referer,
    "X-Title": councilConfig.applicationName,
  };
}

function sanitizeProviderMessage(message: string | undefined): string {
  if (!message?.trim()) {
    return "The model provider returned an error.";
  }

  return message.trim().slice(0, 500);
}

function isChairmanContext(
  executionContext: OpenRouterExecutionContext | undefined,
): executionContext is OpenRouterExecutionContext & { caller: "chairman" } {
  return executionContext?.caller === "chairman";
}

function logInvalidProviderResponse(
  input: {
    failureReason: Parameters<typeof buildProviderResponseDiagnosticSnapshot>[0]["failureReason"];
    payload: unknown;
    httpStatus: number;
    model: string;
    attempt: number;
    elapsedMs: number;
    executionContext?: OpenRouterExecutionContext;
  },
): void {
  const snapshot = buildProviderResponseDiagnosticSnapshot(input);
  logInvalidProviderResponseDiagnostic(snapshot);

  if (isChairmanContext(input.executionContext)) {
    logChairmanLifecycleEvent({
      event: "chairman_invalid_provider_response",
      executionId: input.executionContext.executionId,
      attempt: input.attempt,
      model: input.model,
      elapsedMs: input.elapsedMs,
      errorCode: "INVALID_PROVIDER_RESPONSE",
      failureReason: input.failureReason,
    });
  }
}

function parseProviderResponse(
  payload: unknown,
  diagnosticContext: {
    httpStatus: number;
    model: string;
    attempt: number;
    elapsedMs: number;
    executionContext?: OpenRouterExecutionContext;
  },
): OpenRouterChatCompletionResponse {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    const failureReason =
      payload === null ? "PAYLOAD_NULL" : "PAYLOAD_NOT_OBJECT";

    logInvalidProviderResponse({
      failureReason,
      payload,
      ...diagnosticContext,
    });

    throw new OpenRouterClientError(
      "INVALID_PROVIDER_RESPONSE",
      "The model provider returned an unreadable response.",
      true,
    );
  }

  return payload as OpenRouterChatCompletionResponse;
}

function extractAssistantContent(
  response: OpenRouterChatCompletionResponse,
  payload: unknown,
  diagnosticContext: {
    httpStatus: number;
    model: string;
    attempt: number;
    elapsedMs: number;
    executionContext?: OpenRouterExecutionContext;
  },
): string {
  const failureReason = classifyProviderPayloadFailure(payload);

  if (failureReason) {
    logInvalidProviderResponse({
      failureReason,
      payload,
      ...diagnosticContext,
    });

    throw new OpenRouterClientError(
      "INVALID_PROVIDER_RESPONSE",
      "The model provider did not return assistant content.",
      true,
    );
  }

  const content = response.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    logInvalidProviderResponse({
      failureReason: "CONTENT_EMPTY_STRING",
      payload,
      ...diagnosticContext,
    });

    throw new OpenRouterClientError(
      "INVALID_PROVIDER_RESPONSE",
      "The model provider did not return assistant content.",
      true,
    );
  }

  return content;
}

function extractUsage(response: OpenRouterChatCompletionResponse) {
  const usage = response.usage;

  return {
    promptTokens:
      typeof usage?.prompt_tokens === "number" && Number.isFinite(usage.prompt_tokens)
        ? usage.prompt_tokens
        : 0,
    completionTokens:
      typeof usage?.completion_tokens === "number" &&
      Number.isFinite(usage.completion_tokens)
        ? usage.completion_tokens
        : 0,
    totalTokens:
      typeof usage?.total_tokens === "number" && Number.isFinite(usage.total_tokens)
        ? usage.total_tokens
        : 0,
    estimatedCostUsd:
      typeof usage?.cost === "number" && Number.isFinite(usage.cost)
        ? usage.cost
        : undefined,
  };
}

async function executeOpenRouterRequest(
  options: CallOpenRouterOptions,
  attempt: number,
): Promise<OpenRouterCompletionResult> {
  const {
    model,
    systemPrompt,
    userPrompt,
    temperature = DEFAULT_TEMPERATURE,
    timeoutMs = resolveOpenRouterTimeoutMs(),
    executionContext,
  } = options;

  if (!model.trim()) {
    throw new OpenRouterClientError(
      "CONFIGURATION_ERROR",
      "A model ID is required for OpenRouter requests.",
      false,
    );
  }

  if (isChairmanContext(executionContext)) {
    logChairmanLifecycleEvent({
      event: "chairman_attempt_started",
      executionId: executionContext.executionId,
      attempt,
      model,
    });
  }

  const apiKey = getApiKey();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: buildRequestHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        stream: false,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    const durationMs = Date.now() - startedAt;

    if (isChairmanContext(executionContext)) {
      logChairmanLifecycleEvent({
        event: "chairman_http_response_received",
        executionId: executionContext.executionId,
        attempt,
        model,
        elapsedMs: durationMs,
      });
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      logInvalidProviderResponse({
        failureReason: "HTTP_BODY_NOT_JSON",
        payload: null,
        httpStatus: response.status,
        model,
        attempt,
        elapsedMs: durationMs,
        executionContext,
      });

      throw new OpenRouterClientError(
        "INVALID_PROVIDER_RESPONSE",
        "The model provider returned malformed JSON.",
        true,
      );
    }

    const diagnosticContext = {
      httpStatus: response.status,
      model,
      attempt,
      elapsedMs: durationMs,
      executionContext,
    };

    const parsed = parseProviderResponse(payload, diagnosticContext);

    if (!response.ok) {
      const status = response.status;
      const providerMessage = sanitizeProviderMessage(parsed.error?.message);
      const retryable =
        status >= 500 || status === 429 || status === 408;

      throw new OpenRouterClientError(
        status === 401 || status === 403
          ? "CONFIGURATION_ERROR"
          : "PROVIDER_ERROR",
        providerMessage,
        retryable,
      );
    }

    const content = extractAssistantContent(parsed, payload, diagnosticContext);
    const usage = extractUsage(parsed);
    const returnedModel =
      typeof parsed.model === "string" && parsed.model.trim()
        ? parsed.model.trim()
        : model;

    return {
      content,
      model: returnedModel,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCostUsd: usage.estimatedCostUsd,
      durationMs,
      retryCount: 0,
    };
  } catch (error) {
    if (error instanceof OpenRouterClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new OpenRouterClientError(
        "PROVIDER_TIMEOUT",
        "The model provider did not respond within the allowed time.",
        true,
      );
    }

    throw new OpenRouterClientError(
      "PROVIDER_ERROR",
      "Unable to reach the model provider.",
      true,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callOpenRouter(
  options: CallOpenRouterOptions,
): Promise<OpenRouterCompletionResult> {
  let retryCount = 0;
  let lastError: OpenRouterClientError | undefined;
  const { executionContext } = options;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const result = await executeOpenRouterRequest(options, attempt);

      if (isChairmanContext(executionContext)) {
        logChairmanLifecycleEvent({
          event: "chairman_completed",
          executionId: executionContext.executionId,
          attempt,
          model: options.model,
          elapsedMs: result.durationMs,
        });
      }

      return {
        ...result,
        retryCount,
      };
    } catch (error) {
      if (!(error instanceof OpenRouterClientError)) {
        throw error;
      }

      lastError = error;

      if (error.retryable && attempt < MAX_RETRIES) {
        retryCount += 1;
        console.warn(
          `[OpenRouter] Retrying request: attempt=${attempt + 1} code=${error.code}`,
        );

        if (isChairmanContext(executionContext)) {
          logChairmanLifecycleEvent({
            event: "chairman_retry_triggered",
            executionId: executionContext.executionId,
            attempt: attempt + 1,
            model: options.model,
            errorCode: error.code,
          });
        }

        continue;
      }

      if (isChairmanContext(executionContext)) {
        logChairmanLifecycleEvent({
          event: "chairman_failed_after_retries",
          executionId: executionContext.executionId,
          attempt,
          model: options.model,
          errorCode: error.code,
        });
      }

      throw error;
    }
  }

  throw lastError ?? new OpenRouterClientError(
    "PROVIDER_ERROR",
    "Unable to reach the model provider.",
    true,
  );
}
