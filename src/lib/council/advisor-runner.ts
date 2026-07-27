import "server-only";

import {
  buildAdvisorPromptsForPersona,
  mapAdvisorResponseToResultFields,
  parseAdvisorResponseForPersona,
} from "@/lib/council/advisor-response-router";
import {
  ADVISOR_CANCELLED_SAFE_MESSAGE,
  classifyAdvisorExecutionError,
  createFailedAdvisorResult,
  createSuccessfulAdvisorResult,
  UNCONFIGURED_MODEL_LABEL,
} from "@/lib/council/advisor-execution-result";
import { CouncilConfigurationError } from "@/lib/council/errors";
import { getRuntimeConfig } from "@/config/runtime";
import { callOpenRouter, resolveOpenRouterTimeoutMs } from "@/lib/openrouter/client";
import type {
  AdvisorExecutionConfig,
  AdvisorPersona,
  AdvisorResult,
  DecisionContext,
} from "@/types/council";

export {
  createUnexpectedAdvisorFailureResult,
  normalizeAdvisorConfidence,
} from "@/lib/council/advisor-execution-result";

function resolveModel(modelEnvVar: string): string {
  const model = process.env[modelEnvVar]?.trim();

  if (!model) {
    throw new CouncilConfigurationError(
      `Model environment variable ${modelEnvVar} is not configured.`,
    );
  }

  return model;
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
  const runtime = getRuntimeConfig();

  if (!runtime.features.enableStructuredLogging) {
    return;
  }

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

export type RunAdvisorOptions = {
  /** Parent/session cancellation signal; aborts in-flight provider work. */
  signal?: AbortSignal;
};

/**
 * Execute a single advisor through the deterministic reliability lifecycle:
 * init → provider call (timeout + retry from WP-07 runtime config) →
 * parse/validate → success/failure result → cleanup (via provider finally).
 *
 * Never throws for provider/parse failures; returns a failed AdvisorResult.
 */
export async function runAdvisor(
  decisionContext: DecisionContext,
  persona: AdvisorPersona,
  config: AdvisorExecutionConfig,
  options: RunAdvisorOptions = {},
): Promise<AdvisorResult> {
  if (persona.id !== config.advisorId) {
    throw new Error(
      `Advisor persona ID ${persona.id} does not match execution config ${config.advisorId}.`,
    );
  }

  const startedAt = Date.now();
  let model: string;

  try {
    model = resolveModel(config.modelEnvVar);
  } catch (error) {
    const classification = classifyAdvisorExecutionError(error);
    const failed = createFailedAdvisorResult(
      persona,
      decisionContext.executionId,
      classification.safeMessage,
      Date.now() - startedAt,
    );

    logAdvisorExecution({
      advisorId: persona.id,
      advisorName: persona.displayName,
      model: UNCONFIGURED_MODEL_LABEL,
      status: "failed",
      latencyMs: failed.durationMs,
      executionId: decisionContext.executionId,
      errorCategory: classification.errorCategory,
    });

    return failed;
  }

  if (options.signal?.aborted) {
    const failed = createFailedAdvisorResult(
      persona,
      decisionContext.executionId,
      ADVISOR_CANCELLED_SAFE_MESSAGE,
      Date.now() - startedAt,
      model,
    );

    logAdvisorExecution({
      advisorId: persona.id,
      advisorName: persona.displayName,
      model,
      status: "failed",
      latencyMs: failed.durationMs,
      executionId: decisionContext.executionId,
      errorCategory: "REQUEST_CANCELLED",
    });

    return failed;
  }

  const { systemPrompt, userPrompt } = buildAdvisorPromptsForPersona(
    decisionContext,
    persona,
  );

  try {
    const runtime = getRuntimeConfig();
    const timeoutMs = resolveOpenRouterTimeoutMs();
    const completion = await callOpenRouter({
      model,
      systemPrompt,
      userPrompt,
      temperature: runtime.openRouter.defaultTemperature,
      timeoutMs,
      signal: options.signal,
      executionContext: {
        caller: "advisor",
        executionId: decisionContext.executionId,
        advisorId: persona.id,
      },
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
    const classification = classifyAdvisorExecutionError(error);
    const durationMs = Date.now() - startedAt;

    console.error(
      `[Council] Advisor execution failed: advisorId=${persona.id} advisorName="${persona.displayName}" stage=${classification.stage} errorCategory=${classification.errorCategory}${classification.stage === "parse" && error instanceof Error ? ` validation="${error.message}"` : ""}`,
    );

    logAdvisorExecution({
      advisorId: persona.id,
      advisorName: persona.displayName,
      model,
      status: "failed",
      latencyMs: durationMs,
      executionId: decisionContext.executionId,
      errorCategory: classification.errorCategory,
    });

    return createFailedAdvisorResult(
      persona,
      decisionContext.executionId,
      classification.safeMessage,
      durationMs,
      model,
    );
  }
}
