import "server-only";

import { buildAdvisorPrompts } from "@/lib/council/advisor-prompt";
import {
  AdvisorExecutionError,
  CouncilConfigurationError,
  InvalidModelOutputError,
  ProviderTimeoutError,
  toAdvisorSafeMessage,
} from "@/lib/council/errors";
import { parseAdvisorResponseContent } from "@/lib/council/response-parser";
import { callOpenRouter } from "@/lib/openrouter/client";
import { OpenRouterClientError } from "@/lib/openrouter/types";
import type {
  AdvisorExecutionConfig,
  AdvisorPersona,
  AdvisorResult,
  Decision,
} from "@/types/council";

const REQUEST_TIMEOUT_MS = 90_000;
const REQUEST_TEMPERATURE = 0.3;
const UNCONFIGURED_MODEL_LABEL = "Unconfigured model";

function resolveModel(modelEnvVar: string): string {
  const model = process.env[modelEnvVar]?.trim();

  if (!model) {
    throw new CouncilConfigurationError(
      `Model environment variable ${modelEnvVar} is not configured.`,
    );
  }

  return model;
}

function createFailedAdvisorResult(
  persona: AdvisorPersona,
  errorMessage: string,
  durationMs = 0,
  modelLabel = UNCONFIGURED_MODEL_LABEL,
): AdvisorResult {
  return {
    persona: {
      ...persona,
      model: modelLabel,
    },
    source: "live",
    status: "failed",
    summary: "The advisor could not complete this review.",
    analysis: [],
    assumptions: [],
    risks: [],
    recommendation: "insufficient_information",
    confidence: 0,
    durationMs,
    totalTokens: 0,
    errorMessage,
  };
}

function createSuccessfulAdvisorResult(
  persona: AdvisorPersona,
  content: ReturnType<typeof parseAdvisorResponseContent>,
  model: string,
  durationMs: number,
  totalTokens: number,
): AdvisorResult {
  return {
    persona: {
      ...persona,
      model,
    },
    source: "live",
    status: "success",
    summary: content.summary,
    analysis: content.analysis,
    assumptions: content.assumptions,
    risks: content.risks,
    recommendation: content.recommendation,
    confidence: content.confidence / 100,
    durationMs,
    totalTokens,
  };
}

function mapProviderError(error: OpenRouterClientError): AdvisorExecutionError {
  if (error.code === "PROVIDER_TIMEOUT") {
    return new ProviderTimeoutError(error.message);
  }

  if (error.code === "CONFIGURATION_ERROR") {
    return new AdvisorExecutionError(
      "PROVIDER_ERROR",
      "The advisor model is not configured on the server.",
      false,
    );
  }

  return new AdvisorExecutionError(error.code, error.message, error.retryable);
}

export async function runAdvisor(
  decision: Decision,
  persona: AdvisorPersona,
  config: AdvisorExecutionConfig,
): Promise<AdvisorResult> {
  if (persona.id !== config.advisorId) {
    throw new Error(
      `Advisor persona ID ${persona.id} does not match execution config ${config.advisorId}.`,
    );
  }

  let model: string;

  try {
    model = resolveModel(config.modelEnvVar);
  } catch (error) {
    return createFailedAdvisorResult(persona, toAdvisorSafeMessage(error));
  }

  const { systemPrompt, userPrompt } = buildAdvisorPrompts(decision, persona);

  try {
    const completion = await callOpenRouter({
      model,
      systemPrompt,
      userPrompt,
      temperature: REQUEST_TEMPERATURE,
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    const content = parseAdvisorResponseContent(completion.content);

    return createSuccessfulAdvisorResult(
      persona,
      content,
      completion.model,
      completion.durationMs,
      completion.totalTokens,
    );
  } catch (error) {
    if (error instanceof OpenRouterClientError) {
      const mapped = mapProviderError(error);
      return createFailedAdvisorResult(
        persona,
        mapped.safeMessage,
        0,
        model,
      );
    }

    if (error instanceof InvalidModelOutputError) {
      return createFailedAdvisorResult(
        persona,
        error.safeMessage,
        0,
        model,
      );
    }

    if (error instanceof CouncilConfigurationError) {
      return createFailedAdvisorResult(persona, toAdvisorSafeMessage(error));
    }

    return createFailedAdvisorResult(
      persona,
      toAdvisorSafeMessage(error),
      0,
      model,
    );
  }
}
