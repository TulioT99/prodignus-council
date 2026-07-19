import "server-only";

import {
  OpenRouterClientError,
  type OpenRouterChatCompletionResponse,
  type OpenRouterCompletionResult,
} from "@/lib/openrouter/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 90_000;
const TEMPERATURE = 0.3;

function getConfiguration(): { apiKey: string; model: string } {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL_CONTRARIAN?.trim();

  if (!apiKey || !model) {
    throw new OpenRouterClientError(
      "CONFIGURATION_ERROR",
      "OpenRouter is not configured. Set OPENROUTER_API_KEY and OPENROUTER_MODEL_CONTRARIAN in .env.local.",
      false,
    );
  }

  return { apiKey, model };
}

function sanitizeProviderMessage(message: string | undefined): string {
  if (!message?.trim()) {
    return "The model provider returned an error.";
  }

  return message.trim().slice(0, 500);
}

function parseProviderResponse(payload: unknown): OpenRouterChatCompletionResponse {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new OpenRouterClientError(
      "INVALID_PROVIDER_RESPONSE",
      "The model provider returned an unreadable response.",
      true,
    );
  }

  return payload as OpenRouterChatCompletionResponse;
}

function extractAssistantContent(response: OpenRouterChatCompletionResponse): string {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
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
  };
}

export async function createChatCompletion(
  systemPrompt: string,
  userPrompt: string,
): Promise<OpenRouterCompletionResult> {
  const { apiKey, model } = getConfiguration();
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: TEMPERATURE,
        stream: false,
      }),
      signal: controller.signal,
    });

    const durationMs = Date.now() - startedAt;
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new OpenRouterClientError(
        "INVALID_PROVIDER_RESPONSE",
        "The model provider returned malformed JSON.",
        true,
      );
    }

    const parsed = parseProviderResponse(payload);

    if (!response.ok) {
      throw new OpenRouterClientError(
        "PROVIDER_ERROR",
        sanitizeProviderMessage(parsed.error?.message),
        response.status >= 500 || response.status === 429,
      );
    }

    const content = extractAssistantContent(parsed);
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
      durationMs,
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
