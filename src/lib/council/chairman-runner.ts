import "server-only";

import { defaultChairmanContextBuilder } from "@/lib/council/chairman-context-builder";
import { ChairmanContextBuildError } from "@/lib/council/chairman-context.errors";
import { buildChairmanPrompts } from "@/lib/council/chairman-prompt";
import {
  CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS,
  countSuccessfulAdvisors,
  getMissingAdvisorIds,
} from "@/lib/council/chairman-policy";
import { CHAIRMAN_MODEL_ENV_VAR } from "@/lib/council/chairman-execution-config";
import {
  flattenDisagreements,
  parseChairmanResponseContent,
} from "@/lib/council/chairman-response-parser";
import {
  CouncilConfigurationError,
  InvalidModelOutputError,
  toAdvisorSafeMessage,
} from "@/lib/council/errors";
import { callOpenRouter, resolveOpenRouterTimeoutMs } from "@/lib/openrouter/client";
import { OpenRouterClientError } from "@/lib/openrouter/types";
import { councilConfig } from "@/config/council";
import type {
  AdvisorResult,
  ChairmanResult,
  DecisionContext,
} from "@/types/council";

const REQUEST_TEMPERATURE = 0.3;
const UNCONFIGURED_MODEL_LABEL = "Unconfigured model";

function resolveModel(): string {
  const model = process.env[CHAIRMAN_MODEL_ENV_VAR]?.trim();

  if (!model) {
    throw new CouncilConfigurationError(
      `Model environment variable ${CHAIRMAN_MODEL_ENV_VAR} is not configured.`,
    );
  }

  return model;
}

function createEmptyChairmanFields(): Omit<
  ChairmanResult,
  | "status"
  | "executionId"
  | "model"
  | "durationMs"
  | "totalTokens"
  | "errorMessage"
  | "insufficientCouncil"
  | "missingPerspectives"
  | "reducedConfidenceSynthesis"
> {
  return {
    decision: "insufficient_information",
    decisionStatement: "The council synthesis could not be completed.",
    executiveSummary: "The Chairman could not complete the council synthesis.",
    finalRecommendation: "The council synthesis could not be completed.",
    rationale: "The council synthesis could not be completed.",
    recommendationType: "defer",
    consensus: [],
    disagreements: [],
    structuredDisagreements: [],
    decisiveTradeoffs: [],
    assumptions: [],
    conditions: [],
    risks: [],
    unknowns: [],
    minimumAdditionalEvidence: [],
    nextActions: [],
    reversalCriteria: [],
    keyArguments: [],
    nextSteps: [],
    confidence: 0,
  };
}

function createFailedChairmanResult(
  executionId: string,
  errorMessage: string,
  options: {
    durationMs?: number;
    model?: string;
    insufficientCouncil?: boolean;
    missingPerspectives?: string[];
  } = {},
): ChairmanResult {
  return {
    ...createEmptyChairmanFields(),
    status: "failed",
    executionId,
    model: options.model ?? UNCONFIGURED_MODEL_LABEL,
    durationMs: options.durationMs ?? 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    errorMessage,
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
): ChairmanResult {
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
}): void {
  console.info(
    `[Council Chairman] ${JSON.stringify({
      status: entry.status,
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

export async function runChairman(
  decisionContext: DecisionContext,
  advisors: AdvisorResult[],
): Promise<ChairmanResult> {
  const successfulAdvisorCount = countSuccessfulAdvisors(advisors);
  const missingPerspectives = getMissingAdvisorIds(advisors, councilConfig.liveAdvisorIds);

  let model: string;

  try {
    model = resolveModel();
  } catch (error) {
    const failed = createFailedChairmanResult(
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
    );

    logChairmanExecution({
      status: "failed",
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
    });
    ({ systemPrompt, userPrompt } = buildChairmanPrompts(chairmanContext));
  } catch (error) {
    if (error instanceof ChairmanContextBuildError) {
      return createFailedChairmanResult(decisionContext.executionId, error.safeMessage);
    }

    return createFailedChairmanResult(
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
    );
  }

  if (successfulAdvisorCount < CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS) {
    const failed = createFailedChairmanResult(
      decisionContext.executionId,
      "Insufficient advisor participation for substantive Chairman synthesis.",
      {
        insufficientCouncil: true,
        missingPerspectives,
      },
    );

    logChairmanExecution({
      status: "failed",
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
      temperature: REQUEST_TEMPERATURE,
      timeoutMs: resolveOpenRouterTimeoutMs(),
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
        reducedConfidenceSynthesis:
          successfulAdvisorCount === CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS,
      },
    );
  } catch (error) {
    let errorCategory = "INTERNAL_ERROR";
    let safeMessage = toAdvisorSafeMessage(error);

    if (error instanceof OpenRouterClientError) {
      errorCategory = error.code;
      safeMessage =
        error.code === "CONFIGURATION_ERROR"
          ? "The Chairman model is not configured on the server."
          : error.message;
    } else if (error instanceof InvalidModelOutputError) {
      errorCategory = error.code;
      safeMessage = error.safeMessage;
    } else if (error instanceof CouncilConfigurationError) {
      errorCategory = error.code;
      safeMessage = toAdvisorSafeMessage(error);
    }

    console.error(
      `[Council] Chairman execution failed: executionId=${decisionContext.executionId} errorCategory=${errorCategory}${error instanceof InvalidModelOutputError ? ` validation="${error.message}"` : ""}`,
    );

    logChairmanExecution({
      status: "failed",
      model,
      latencyMs: 0,
      executionId: decisionContext.executionId,
      errorCategory,
      successfulAdvisorCount,
    });

    return createFailedChairmanResult(decisionContext.executionId, safeMessage, {
      model,
    });
  }
}
