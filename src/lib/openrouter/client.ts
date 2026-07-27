import "server-only";

import { councilConfig } from "@/config/council";
import { getRuntimeConfig } from "@/config/runtime";
import {
  combineAbortSignals,
  createDeadlineController,
  isAbortError,
  isCancellationReason,
  isTimeoutReason,
} from "@/lib/council/execution-abort";
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
import {
  getRetryDelayMs,
  isRetryEligible,
  shouldRetryAttempt,
} from "@/lib/retry/policy";
import type { RetryFailureCategory } from "@/lib/retry/types";

export type CallOpenRouterOptions = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  timeoutMs?: number;
  /** Optional parent cancellation signal (council/session abort). */
  signal?: AbortSignal;
  executionContext?: OpenRouterExecutionContext;
};

export function resolveOpenRouterTimeoutMs(): number {
  return getRuntimeConfig().timeouts.advisorTimeoutMs;
}

export function resolveChairmanOpenRouterTimeoutMs(): number {
  return getRuntimeConfig().timeouts.chairmanTimeoutMs;
}

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw createClientError(
      "CONFIGURATION_ERROR",
      "OpenRouter API key is not configured.",
      "configuration",
    );
  }

  return apiKey;
}

function buildRequestHeaders(apiKey: string): Record<string, string> {
  const referer = getRuntimeConfig().openRouter.httpReferer;

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": referer,
    "X-Title": councilConfig.applicationName,
  };
}

/**
 * Client-visible provider error text must never include raw provider body,
 * auth material, or diagnostic payloads (AC-S-02). Diagnostics remain in
 * server-side logging only.
 */
function sanitizeProviderMessage(message: string | undefined): string {
  void message;
  return "The model provider returned an error.";
}

function classifyHttpFailure(status: number): RetryFailureCategory {
  if (status === 401 || status === 403) {
    return "configuration";
  }

  if (status === 429) {
    return "rate_limited";
  }

  if (status === 408) {
    return "timeout";
  }

  if (status >= 500) {
    return "transient";
  }

  return "permanent";
}

function createClientError(
  code: ConstructorParameters<typeof OpenRouterClientError>[0],
  message: string,
  category: RetryFailureCategory,
): OpenRouterClientError {
  return new OpenRouterClientError(
    code,
    message,
    isRetryEligible(category),
    category,
  );
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    if (signal?.aborted) {
      throw createCancelledClientError();
    }

    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createCancelledClientError());
      return;
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = (): void => {
      clearTimeout(timeoutId);
      reject(createCancelledClientError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function createCancelledClientError(): OpenRouterClientError {
  return createClientError(
    "REQUEST_CANCELLED",
    "The model request was cancelled.",
    "permanent",
  );
}

function resolveAbortFailure(
  combinedSignal: AbortSignal,
  externalSignal: AbortSignal | undefined,
): OpenRouterClientError {
  const reason = combinedSignal.reason;

  if (
    isCancellationReason(reason) ||
    (externalSignal?.aborted &&
      (isCancellationReason(externalSignal.reason) ||
        !isTimeoutReason(externalSignal.reason)))
  ) {
    return createCancelledClientError();
  }

  if (isTimeoutReason(reason) || externalSignal?.aborted !== true) {
    return createClientError(
      "PROVIDER_TIMEOUT",
      "The model provider did not respond within the allowed time.",
      "timeout",
    );
  }

  return createCancelledClientError();
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
  if (getRuntimeConfig().features.enableProviderDiagnostics) {
    const snapshot = buildProviderResponseDiagnosticSnapshot(input);
    logInvalidProviderResponseDiagnostic(snapshot);
  }

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

    throw createClientError(
      "INVALID_PROVIDER_RESPONSE",
      "The model provider returned an unreadable response.",
      "invalid_response",
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

    throw createClientError(
      "INVALID_PROVIDER_RESPONSE",
      "The model provider did not return assistant content.",
      "invalid_response",
    );
  }

  const content = response.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    logInvalidProviderResponse({
      failureReason: "CONTENT_EMPTY_STRING",
      payload,
      ...diagnosticContext,
    });

    throw createClientError(
      "INVALID_PROVIDER_RESPONSE",
      "The model provider did not return assistant content.",
      "invalid_response",
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
    temperature = getRuntimeConfig().openRouter.defaultTemperature,
    timeoutMs = resolveOpenRouterTimeoutMs(),
    signal: externalSignal,
    executionContext,
  } = options;

  if (!model.trim()) {
    throw createClientError(
      "CONFIGURATION_ERROR",
      "A model ID is required for OpenRouter requests.",
      "configuration",
    );
  }

  if (externalSignal?.aborted) {
    throw createCancelledClientError();
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
  const deadline = createDeadlineController(timeoutMs);
  const combined = combineAbortSignals(deadline.signal, externalSignal);

  try {
    const openRouter = getRuntimeConfig().openRouter;
    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      stream: false,
      response_format: { type: "json_object" },
    };

    if (openRouter.maxTokens > 0) {
      requestBody.max_tokens = openRouter.maxTokens;
    }

    const response = await fetch(openRouter.apiUrl, {
      method: "POST",
      headers: buildRequestHeaders(apiKey),
      body: JSON.stringify(requestBody),
      signal: combined.signal,
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

      throw createClientError(
        "INVALID_PROVIDER_RESPONSE",
        "The model provider returned malformed JSON.",
        "invalid_response",
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
      // Consume provider message only to prove sanitization discards it.
      const providerMessage = sanitizeProviderMessage(parsed.error?.message);
      const category = classifyHttpFailure(status);

      throw createClientError(
        status === 401 || status === 403
          ? "CONFIGURATION_ERROR"
          : "PROVIDER_ERROR",
        providerMessage,
        category,
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

    if (isAbortError(error) || combined.signal.aborted) {
      throw resolveAbortFailure(combined.signal, externalSignal);
    }

    throw createClientError(
      "PROVIDER_ERROR",
      "Unable to reach the model provider.",
      "transient",
    );
  } finally {
    deadline.cleanup();
    combined.cleanup();
  }
}

function classifyOpenRouterError(
  error: OpenRouterClientError,
): RetryFailureCategory {
  return error.failureCategory;
}

export async function callOpenRouter(
  options: CallOpenRouterOptions,
): Promise<OpenRouterCompletionResult> {
  let retryCount = 0;
  let lastError: OpenRouterClientError | undefined;
  const { executionContext, signal: externalSignal } = options;
  const maxAttempts = getRuntimeConfig().retry.maxAttempts;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (externalSignal?.aborted) {
      throw createCancelledClientError();
    }

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
      const category = classifyOpenRouterError(error);

      if (error.code === "REQUEST_CANCELLED") {
        throw error;
      }

      if (
        shouldRetryAttempt({
          category,
          attemptIndex: attempt,
          maxAttempts,
        })
      ) {
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

        await delay(getRetryDelayMs(attempt, category), externalSignal);
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

  throw (
    lastError ??
    createClientError(
      "PROVIDER_ERROR",
      "Unable to reach the model provider.",
      "transient",
    )
  );
}
