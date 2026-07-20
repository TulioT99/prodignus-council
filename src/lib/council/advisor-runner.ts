import "server-only";

import {
  buildAdvisorPromptsForPersona,
  mapAdvisorResponseToResultFields,
  parseAdvisorResponseForPersona,
} from "@/lib/council/advisor-response-router";
import {
  AdvisorExecutionError,
  CouncilConfigurationError,
  InvalidModelOutputError,
  ProviderTimeoutError,
  toAdvisorSafeMessage,
} from "@/lib/council/errors";
import { callOpenRouter } from "@/lib/openrouter/client";
import { OpenRouterClientError } from "@/lib/openrouter/types";
import type {
  AdvisorExecutionConfig,
  AdvisorPersona,
  AdvisorResult,
  DecisionContext,
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
  executionId: string,
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
    executionId,
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
  executionId: string,
  content: ReturnType<typeof mapAdvisorResponseToResultFields>,
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
    executionId,
    summary: content.summary,
    analysis: content.analysis,
    assumptions: content.assumptions,
    risks: content.risks,
    recommendation: content.recommendation,
    confidence: content.confidence / 100,
    keyArguments: content.keyArguments,
    unknowns: content.unknowns,
    accessibilityConcerns: content.accessibilityConcerns,
    journeyBarriers: content.journeyBarriers,
    engineeringConcerns: content.engineeringConcerns,
    operationalConcerns: content.operationalConcerns,
    technicalAlternatives: content.technicalAlternatives,
    humanImpact: content.humanImpact,
    ethicalConcerns: content.ethicalConcerns,
    inclusionConcerns: content.inclusionConcerns,
    longTermEffects: content.longTermEffects,
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
  decisionContext: DecisionContext,
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
    return createFailedAdvisorResult(
      persona,
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
    );
  }

  const { systemPrompt, userPrompt } = buildAdvisorPromptsForPersona(
    decisionContext,
    persona,
  );

  try {
    const completion = await callOpenRouter({
      model,
      systemPrompt,
      userPrompt,
      temperature: REQUEST_TEMPERATURE,
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    const parsed = parseAdvisorResponseForPersona(persona.id, completion.content);
    const content = mapAdvisorResponseToResultFields(persona.id, parsed);

    return createSuccessfulAdvisorResult(
      persona,
      decisionContext.executionId,
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
        decisionContext.executionId,
        mapped.safeMessage,
        0,
        model,
      );
    }

    if (error instanceof InvalidModelOutputError) {
      console.error(
        `[Council] Advisor response validation failed: advisorId=${persona.id} advisorName="${persona.displayName}" stage=parse error="${error.message}"`,
      );

      return createFailedAdvisorResult(
        persona,
        decisionContext.executionId,
        error.safeMessage,
        0,
        model,
      );
    }

    if (error instanceof CouncilConfigurationError) {
      return createFailedAdvisorResult(
        persona,
        decisionContext.executionId,
        toAdvisorSafeMessage(error),
      );
    }

    return createFailedAdvisorResult(
      persona,
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
      0,
      model,
    );
  }
}
