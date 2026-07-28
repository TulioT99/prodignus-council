import "server-only";

import { defaultChairmanContextBuilder } from "@/lib/council/chairman-context-builder";
import { ChairmanContextBuildError } from "@/lib/council/chairman-context.errors";
import { validateChairmanExecutionContract } from "@/lib/council/chairman-contract";
import { buildChairmanPrompts } from "@/lib/council/chairman-prompt";
import {
  countSuccessfulAdvisors,
  getChairmanMinimumAdvisorsForSynthesis,
  getMissingAdvisorIds,
} from "@/lib/council/chairman-policy";
import { resolveChairmanModelEnvVar } from "@/lib/council/chairman-execution-config";
import {
  flattenDisagreements,
  parseChairmanResponseContent,
} from "@/lib/council/chairman-response-parser";
import {
  CouncilConfigurationError,
  InvalidModelOutputError,
  toAdvisorSafeMessage,
} from "@/lib/council/errors";
import {
  callOpenRouter,
  resolveChairmanOpenRouterTimeoutMs,
} from "@/lib/openrouter/client";
import { OpenRouterClientError } from "@/lib/openrouter/types";
import { getRuntimeConfig } from "@/config/runtime";
import type { ConsensusPackage } from "@/lib/council/consensus/types";
import type {
  AdvisorResult,
  ChairmanFailedResult,
  ChairmanFailureReasonCode,
  ChairmanResult,
  ChairmanSuccessResult,
  DecisionContext,
} from "@/types/council";

const UNCONFIGURED_MODEL_LABEL = "Unconfigured model";

/**
 * Chairman invocation options. Consensus Package is mandatory (ENG-0007 / WP-05A).
 */
export type RunChairmanOptions = {
  readonly consensus: ConsensusPackage;
};

function resolveModel(): string {
  const modelEnvVar = resolveChairmanModelEnvVar();
  const model = process.env[modelEnvVar]?.trim();

  if (!model) {
    throw new CouncilConfigurationError(
      `Model environment variable ${modelEnvVar} is not configured.`,
    );
  }

  return model;
}

function createFailedChairmanResult(
  executionId: string,
  errorMessage: string,
  failureReasonCode: ChairmanFailureReasonCode,
  options: {
    durationMs?: number;
    model?: string;
    insufficientCouncil?: boolean;
    missingPerspectives?: string[];
  } = {},
): ChairmanFailedResult {
  return {
    status: "failed",
    outcome: "ChairmanFailed",
    executionId,
    model: options.model ?? UNCONFIGURED_MODEL_LABEL,
    durationMs: options.durationMs ?? 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    errorMessage,
    failureReasonCode,
    insufficientCouncil: options.insufficientCouncil,
    missingPerspectives: options.missingPerspectives,
  };
}

function createSuccessfulChairmanResult(
  executionId: string,
  content: ReturnType<typeof parseChairmanResponseContent>,
  model: string,
  durationMs: number,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number,
  estimatedCostUsd: number | undefined,
  options: {
    missingPerspectives?: string[];
    reducedConfidenceSynthesis?: boolean;
  },
): ChairmanSuccessResult {
  return {
    status: "success",
    executionId,
    decision: content.decision,
    decisionStatement: content.decisionStatement,
    executiveSummary: content.executiveSummary,
    finalRecommendation: content.finalRecommendation,
    rationale: content.finalRecommendation,
    recommendationType: content.recommendationType,
    consensus: content.consensus,
    disagreements: flattenDisagreements(content.disagreements),
    structuredDisagreements: content.disagreements,
    decisiveTradeoffs: content.decisiveTradeoffs,
    assumptions: content.assumptions,
    conditions: content.conditions,
    risks: content.risks,
    unknowns: content.unknowns,
    minorityView: content.minorityView,
    minimumAdditionalEvidence: content.minimumAdditionalEvidence,
    nextActions: content.nextActions,
    reversalCriteria: content.reversalCriteria,
    keyArguments: content.keyArguments,
    nextSteps: content.nextActions.map((action) => action.action),
    confidence: content.confidence / 100,
    model,
    durationMs,
    totalTokens,
    promptTokens,
    completionTokens,
    estimatedCostUsd,
    missingPerspectives: options.missingPerspectives,
    reducedConfidenceSynthesis: options.reducedConfidenceSynthesis,
  };
}

function logChairmanExecution(entry: {
  status: "success" | "failed";
  model: string;
  latencyMs: number;
  executionId: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  retryCount?: number;
  errorCategory?: string;
  successfulAdvisorCount?: number;
  outcome?: "ChairmanFailed";
}): void {
  console.info(
    `[Council Chairman] ${JSON.stringify({
      status: entry.status,
      outcome: entry.outcome ?? null,
      model: entry.model,
      latencyMs: entry.latencyMs,
      executionId: entry.executionId,
      promptTokens: entry.promptTokens ?? 0,
      completionTokens: entry.completionTokens ?? 0,
      totalTokens: entry.totalTokens ?? 0,
      retryCount: entry.retryCount ?? 0,
      errorCategory: entry.errorCategory ?? null,
      successfulAdvisorCount: entry.successfulAdvisorCount ?? 0,
    })}`,
  );
}

/**
 * Run the Chairman Decision Engine.
 *
 * Pipeline gate (WP-05A):
 * Consensus Package → Contract Validation → Chairman synthesis
 *
 * Invalid contracts fail closed as `ChairmanFailed` before any LLM invocation.
 */
export async function runChairman(
  decisionContext: DecisionContext,
  advisors: AdvisorResult[],
  options: RunChairmanOptions,
): Promise<ChairmanResult> {
  const runtime = getRuntimeConfig();
  const synthesisMinimum = getChairmanMinimumAdvisorsForSynthesis();
  const successfulAdvisorCount = countSuccessfulAdvisors(advisors);
  const missingPerspectives = getMissingAdvisorIds(
    advisors,
    runtime.advisors.enabledAdvisorIds,
  );

  const contractValidation = validateChairmanExecutionContract({
    decisionContext,
    advisors,
    consensus: options?.consensus,
  });

  if (!contractValidation.ok) {
    const failed = createFailedChairmanResult(
      decisionContext?.executionId?.trim() || "unknown",
      contractValidation.message,
      contractValidation.code,
    );

    logChairmanExecution({
      status: "failed",
      outcome: "ChairmanFailed",
      model: UNCONFIGURED_MODEL_LABEL,
      latencyMs: 0,
      executionId: failed.executionId,
      errorCategory: contractValidation.code,
      successfulAdvisorCount,
    });

    return failed;
  }

  let model: string;

  try {
    model = resolveModel();
  } catch (error) {
    const failed = createFailedChairmanResult(
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
      "CONFIGURATION_ERROR",
    );

    logChairmanExecution({
      status: "failed",
      outcome: "ChairmanFailed",
      model: UNCONFIGURED_MODEL_LABEL,
      latencyMs: 0,
      executionId: decisionContext.executionId,
      errorCategory: "CONFIGURATION_ERROR",
      successfulAdvisorCount,
    });

    return failed;
  }

  let systemPrompt: string;
  let userPrompt: string;

  try {
    const chairmanContext = defaultChairmanContextBuilder.build({
      decisionContext,
      advisors,
      consensus: contractValidation.contract.consensus,
    });
    ({ systemPrompt, userPrompt } = buildChairmanPrompts(chairmanContext));
  } catch (error) {
    if (error instanceof ChairmanContextBuildError) {
      return createFailedChairmanResult(
        decisionContext.executionId,
        error.safeMessage,
        "CONTEXT_BUILD_ERROR",
      );
    }

    return createFailedChairmanResult(
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
      "CONTEXT_BUILD_ERROR",
    );
  }

  if (successfulAdvisorCount < synthesisMinimum) {
    const failed = createFailedChairmanResult(
      decisionContext.executionId,
      "Insufficient advisor participation for substantive Chairman synthesis.",
      "INSUFFICIENT_COUNCIL",
      {
        insufficientCouncil: true,
        missingPerspectives,
      },
    );

    logChairmanExecution({
      status: "failed",
      outcome: "ChairmanFailed",
      model,
      latencyMs: 0,
      executionId: decisionContext.executionId,
      errorCategory: "INSUFFICIENT_COUNCIL",
      successfulAdvisorCount,
    });

    return failed;
  }

  try {
    const completion = await callOpenRouter({
      model,
      systemPrompt,
      userPrompt,
      temperature: runtime.openRouter.defaultTemperature,
      timeoutMs: resolveChairmanOpenRouterTimeoutMs(),
      executionContext: {
        caller: "chairman",
        executionId: decisionContext.executionId,
      },
    });

    const content = parseChairmanResponseContent(completion.content);

    logChairmanExecution({
      status: "success",
      model: completion.model,
      latencyMs: completion.durationMs,
      executionId: decisionContext.executionId,
      promptTokens: completion.promptTokens,
      completionTokens: completion.completionTokens,
      totalTokens: completion.totalTokens,
      retryCount: completion.retryCount,
      successfulAdvisorCount,
    });

    return createSuccessfulChairmanResult(
      decisionContext.executionId,
      content,
      completion.model,
      completion.durationMs,
      completion.promptTokens,
      completion.completionTokens,
      completion.totalTokens,
      completion.estimatedCostUsd,
      {
        missingPerspectives:
          missingPerspectives.length > 0 ? missingPerspectives : undefined,
        reducedConfidenceSynthesis: successfulAdvisorCount === synthesisMinimum,
      },
    );
  } catch (error) {
    let errorCategory: ChairmanFailureReasonCode = "INTERNAL_ERROR";
    let safeMessage = toAdvisorSafeMessage(error);

    if (error instanceof OpenRouterClientError) {
      errorCategory =
        error.code === "CONFIGURATION_ERROR"
          ? "CONFIGURATION_ERROR"
          : "PROVIDER_ERROR";
      safeMessage =
        error.code === "CONFIGURATION_ERROR"
          ? "The Chairman model is not configured on the server."
          : error.message;
    } else if (error instanceof InvalidModelOutputError) {
      errorCategory = "INVALID_MODEL_OUTPUT";
      safeMessage = error.safeMessage;
    } else if (error instanceof CouncilConfigurationError) {
      errorCategory = "CONFIGURATION_ERROR";
      safeMessage = toAdvisorSafeMessage(error);
    }

    console.error(
      `[Council] Chairman execution failed: executionId=${decisionContext.executionId} errorCategory=${errorCategory}${error instanceof InvalidModelOutputError ? ` validation="${error.message}"` : ""}`,
    );

    logChairmanExecution({
      status: "failed",
      outcome: "ChairmanFailed",
      model,
      latencyMs: 0,
      executionId: decisionContext.executionId,
      errorCategory,
      successfulAdvisorCount,
    });

    return createFailedChairmanResult(
      decisionContext.executionId,
      safeMessage,
      errorCategory,
      {
        model,
      },
    );
  }
}
