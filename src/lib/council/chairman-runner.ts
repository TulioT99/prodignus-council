import "server-only";

import { defaultChairmanContextBuilder } from "@/lib/council/chairman-context-builder";
import { ChairmanContextBuildError } from "@/lib/council/chairman-context.errors";
import { buildChairmanPrompts } from "@/lib/council/chairman-prompt";
import { CHAIRMAN_MODEL_ENV_VAR } from "@/lib/council/chairman-execution-config";
import { parseChairmanResponseContent } from "@/lib/council/chairman-response-parser";
import {
  CouncilConfigurationError,
  InvalidModelOutputError,
  toAdvisorSafeMessage,
} from "@/lib/council/errors";
import { callOpenRouter } from "@/lib/openrouter/client";
import { OpenRouterClientError } from "@/lib/openrouter/types";
import type { AdvisorResult, ChairmanResult, DecisionContext } from "@/types/council";

const REQUEST_TIMEOUT_MS = 90_000;
const REQUEST_TEMPERATURE = 0.3;

function resolveModel(): string {
  const model = process.env[CHAIRMAN_MODEL_ENV_VAR]?.trim();

  if (!model) {
    throw new CouncilConfigurationError(
      `Model environment variable ${CHAIRMAN_MODEL_ENV_VAR} is not configured.`,
    );
  }

  return model;
}

function createFailedChairmanResult(
  executionId: string,
  errorMessage: string,
  durationMs = 0,
): ChairmanResult {
  return {
    status: "failed",
    executionId,
    decision: "insufficient_information",
    executiveSummary: "The Chairman could not complete the council synthesis.",
    finalRecommendation: "The council synthesis could not be completed.",
    consensus: [],
    disagreements: [],
    keyArguments: [],
    risks: [],
    conditions: [],
    nextSteps: [],
    confidence: 0,
    durationMs,
    totalTokens: 0,
    errorMessage,
  };
}

function createSuccessfulChairmanResult(
  executionId: string,
  content: ReturnType<typeof parseChairmanResponseContent>,
  durationMs: number,
  totalTokens: number,
): ChairmanResult {
  return {
    status: "success",
    executionId,
    decision: content.decision,
    executiveSummary: content.executiveSummary,
    finalRecommendation: content.finalRecommendation,
    consensus: content.consensus,
    disagreements: content.disagreements,
    keyArguments: content.keyArguments,
    risks: content.risks,
    conditions: content.conditions,
    nextSteps: content.nextSteps,
    confidence: content.confidence / 100,
    durationMs,
    totalTokens,
  };
}

export async function runChairman(
  decisionContext: DecisionContext,
  advisors: AdvisorResult[],
): Promise<ChairmanResult> {
  let model: string;

  try {
    model = resolveModel();
  } catch (error) {
    return createFailedChairmanResult(
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
    );
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

  try {
    const completion = await callOpenRouter({
      model,
      systemPrompt,
      userPrompt,
      temperature: REQUEST_TEMPERATURE,
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    const content = parseChairmanResponseContent(completion.content);

    return createSuccessfulChairmanResult(
      decisionContext.executionId,
      content,
      completion.durationMs,
      completion.totalTokens,
    );
  } catch (error) {
    if (error instanceof OpenRouterClientError) {
      const safeMessage =
        error.code === "CONFIGURATION_ERROR"
          ? "The Chairman model is not configured on the server."
          : error.message;

      return createFailedChairmanResult(decisionContext.executionId, safeMessage);
    }

    if (error instanceof InvalidModelOutputError) {
      return createFailedChairmanResult(decisionContext.executionId, error.safeMessage);
    }

    if (error instanceof CouncilConfigurationError) {
      return createFailedChairmanResult(
        decisionContext.executionId,
        toAdvisorSafeMessage(error),
      );
    }

    return createFailedChairmanResult(
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
    );
  }
}
