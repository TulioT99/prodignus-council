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
import { callOpenRouter, resolveOpenRouterTimeoutMs } from "@/lib/openrouter/client";
import { OpenRouterClientError } from "@/lib/openrouter/types";
import type {
  AdvisorExecutionConfig,
  AdvisorPersona,
  AdvisorResult,
  DecisionContext,
} from "@/types/council";

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

export function createUnexpectedAdvisorFailureResult(
  persona: AdvisorPersona,
  executionId: string,
  errorMessage = "The advisor could not complete this review.",
): AdvisorResult {
  return createFailedAdvisorResult(persona, executionId, errorMessage);
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
    promptTokens: 0,
    completionTokens: 0,
    errorMessage,
  };
}

function createSuccessfulAdvisorResult(
  persona: AdvisorPersona,
  executionId: string,
  content: ReturnType<typeof mapAdvisorResponseToResultFields>,
  model: string,
  durationMs: number,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  estimatedCostUsd?: number,
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
    promptTokens,
    completionTokens,
    estimatedCostUsd,
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

function logAdvisorExecution(entry: {
  advisorId: string;
  advisorName: string;
  model: string;
  status: "success" | "failed";
  latencyMs: number;
  executionId: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  retryCount?: number;
  errorCategory?: string;
}): void {
  console.info(
    `[Council Advisor] ${JSON.stringify({
      advisorId: entry.advisorId,
      advisorName: entry.advisorName,
      model: entry.model,
      status: entry.status,
      latencyMs: entry.latencyMs,
      executionId: entry.executionId,
      promptTokens: entry.promptTokens ?? 0,
      completionTokens: entry.completionTokens ?? 0,
      totalTokens: entry.totalTokens ?? 0,
      retryCount: entry.retryCount ?? 0,
      errorCategory: entry.errorCategory ?? null,
    })}`,
  );
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
    const failed = createFailedAdvisorResult(
      persona,
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
    );

    logAdvisorExecution({
      advisorId: persona.id,
      advisorName: persona.displayName,
      model: UNCONFIGURED_MODEL_LABEL,
      status: "failed",
      latencyMs: 0,
      executionId: decisionContext.executionId,
      errorCategory: "CONFIGURATION_ERROR",
    });

    return failed;
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
      timeoutMs: resolveOpenRouterTimeoutMs(),
    });

    const parsed = parseAdvisorResponseForPersona(persona.id, completion.content);
    const content = mapAdvisorResponseToResultFields(persona.id, parsed);

    logAdvisorExecution({
      advisorId: persona.id,
      advisorName: persona.displayName,
      model: completion.model,
      status: "success",
      latencyMs: completion.durationMs,
      executionId: decisionContext.executionId,
      promptTokens: completion.promptTokens,
      completionTokens: completion.completionTokens,
      totalTokens: completion.totalTokens,
      retryCount: completion.retryCount,
    });

    return createSuccessfulAdvisorResult(
      persona,
      decisionContext.executionId,
      content,
      completion.model,
      completion.durationMs,
      completion.promptTokens,
      completion.completionTokens,
      completion.totalTokens,
      completion.estimatedCostUsd,
    );
  } catch (error) {
    let errorCategory = "INTERNAL_ERROR";
    let safeMessage = toAdvisorSafeMessage(error);

    if (error instanceof OpenRouterClientError) {
      const mapped = mapProviderError(error);
      errorCategory = mapped.code;
      safeMessage = mapped.safeMessage;
    } else if (error instanceof InvalidModelOutputError) {
      errorCategory = error.code;
      safeMessage = error.safeMessage;
    } else if (error instanceof CouncilConfigurationError) {
      errorCategory = error.code;
      safeMessage = toAdvisorSafeMessage(error);
    }

    console.error(
      `[Council] Advisor execution failed: advisorId=${persona.id} advisorName="${persona.displayName}" stage=${error instanceof InvalidModelOutputError ? "parse" : "provider"} errorCategory=${errorCategory}${error instanceof InvalidModelOutputError ? ` validation="${error.message}"` : ""}`,
    );

    logAdvisorExecution({
      advisorId: persona.id,
      advisorName: persona.displayName,
      model,
      status: "failed",
      latencyMs: 0,
      executionId: decisionContext.executionId,
      errorCategory,
    });

    return createFailedAdvisorResult(
      persona,
      decisionContext.executionId,
      safeMessage,
      0,
      model,
    );
  }
}
