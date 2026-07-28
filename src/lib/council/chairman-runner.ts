import "server-only";

import { defaultChairmanContextBuilder } from "@/lib/council/chairman-context-builder";
import { ChairmanContextBuildError } from "@/lib/council/chairman-context.errors";
import { validateChairmanExecutionContract } from "@/lib/council/chairman-contract";
import {
  buildDecisionConfidence,
  validateDecisionConfidence,
} from "@/lib/council/chairman-decision-confidence";
import {
  buildChairmanFailureTraceability,
  buildConsensusPackageId,
  buildDecisionMetadata,
  validateDecisionMetadata,
} from "@/lib/council/chairman-decision-metadata";
import { runDecisionPolicyGate } from "@/lib/council/chairman-decision-policy";
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
  buildDecisionFailureReport,
  evaluatePublicationGate,
  getRecoveryPolicy,
  runWithBoundedRecovery,
} from "@/lib/council/failure-manager";
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
  DecisionConfidence,
  DecisionContext,
  DecisionFailureReport,
  DecisionMetadata,
  DecisionPolicyResult,
  DecisionUncertainty,
} from "@/types/council";

const UNCONFIGURED_MODEL_LABEL = "Unconfigured model";

/**
 * Chairman invocation options. Consensus Package is mandatory (ENG-0007 / WP-05A).
 */
export type RunChairmanOptions = {
  readonly consensus: ConsensusPackage;
  /** Optional parent cancellation signal (council/session abort). */
  readonly signal?: AbortSignal;
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
    decisionContext?: DecisionContext | null;
    consensus?: ConsensusPackage | null;
    policyEvaluation?: DecisionPolicyResult;
    recoveryAttempted?: boolean;
    recoverySucceeded?: boolean;
    retryCount?: number;
    recoveryActions?: readonly string[];
  } = {},
): ChairmanFailedResult {
  const failureTraceability = buildChairmanFailureTraceability({
    executionId,
    decisionContext: options.decisionContext,
    consensus: options.consensus,
  });

  const failureReport: DecisionFailureReport = buildDecisionFailureReport({
    executionId,
    failureReasonCode,
    message: errorMessage,
    recoveryAttempted: options.recoveryAttempted,
    recoverySucceeded: options.recoverySucceeded,
    retryCount: options.retryCount,
    recoveryActions: options.recoveryActions,
    durationMs: options.durationMs,
    relatedMetadata: {
      failureId: failureTraceability.failureId,
      consensusPackageId: failureTraceability.consensusPackageId,
      requestId: failureTraceability.requestId,
      sessionId: failureTraceability.sessionId,
    },
  });

  return {
    status: "failed",
    outcome: "ChairmanFailed",
    executionId,
    failureTraceability,
    failureReport,
    model: options.model ?? UNCONFIGURED_MODEL_LABEL,
    durationMs: options.durationMs ?? 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    errorMessage,
    failureReasonCode,
    policyEvaluation: options.policyEvaluation,
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
  metadata: DecisionMetadata,
  decisionConfidence: DecisionConfidence,
  uncertainty: DecisionUncertainty,
  policyEvaluation: DecisionPolicyResult,
  options: {
    missingPerspectives?: string[];
    reducedConfidenceSynthesis?: boolean;
  },
): ChairmanSuccessResult {
  return {
    status: "success",
    executionId,
    metadata,
    decisionConfidence,
    uncertainty,
    policyEvaluation,
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
    confidence: decisionConfidence.recommendationConfidence,
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
 * Pipeline gate (WP-05A / WP-05B / WP-05C / WP-05D / WP-05E):
 * Consensus Package → Contract Validation → Chairman synthesis →
 * Metadata validation → Confidence Triad validation → Decision Policy evaluation →
 * Failure Evaluation → Publication
 *
 * Invalid contracts, metadata, confidence, rejected policy, or terminal failures
 * fail closed as `ChairmanFailed` with a structured DecisionFailureReport
 * before successful publication.
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
      {
        decisionContext,
        consensus: options?.consensus,
      },
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

  const consensus = contractValidation.contract.consensus;

  let model: string;

  try {
    model = resolveModel();
  } catch (error) {
    const failed = createFailedChairmanResult(
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
      "CONFIGURATION_ERROR",
      {
        decisionContext,
        consensus,
      },
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
      consensus,
    });
    ({ systemPrompt, userPrompt } = buildChairmanPrompts(chairmanContext));
  } catch (error) {
    if (error instanceof ChairmanContextBuildError) {
      return createFailedChairmanResult(
        decisionContext.executionId,
        error.safeMessage,
        "CONTEXT_BUILD_ERROR",
        {
          decisionContext,
          consensus,
        },
      );
    }

    return createFailedChairmanResult(
      decisionContext.executionId,
      toAdvisorSafeMessage(error),
      "CONTEXT_BUILD_ERROR",
      {
        decisionContext,
        consensus,
      },
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
        decisionContext,
        consensus,
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

  const schemaRecoveryPolicy = getRecoveryPolicy("FM-004");

  try {
    const synthesisRecovery = await runWithBoundedRecovery(
      "FM-004",
      async () => {
        const completion = await callOpenRouter({
          model,
          systemPrompt,
          userPrompt,
          temperature: runtime.openRouter.defaultTemperature,
          timeoutMs: resolveChairmanOpenRouterTimeoutMs(),
          signal: options.signal,
          executionContext: {
            caller: "chairman",
            executionId: decisionContext.executionId,
          },
        });

        const content = parseChairmanResponseContent(completion.content);
        return { completion, content };
      },
      {
        maxAttempts: schemaRecoveryPolicy.maxAttempts,
        isRetryableError: (error) => error instanceof InvalidModelOutputError,
        onRetry: () => {
          console.info(
            `[Council] Chairman schema recovery retry: executionId=${decisionContext.executionId}`,
          );
        },
      },
    );

    if (!synthesisRecovery.ok) {
      throw synthesisRecovery.error;
    }

    const { completion, content } = synthesisRecovery.value;
    const providerRetryCount = completion.retryCount;
    const schemaRecoveryActions = synthesisRecovery.recoveryActions;

    const metadata = buildDecisionMetadata({
      decisionContext,
      consensus,
    });
    const metadataValidation = validateDecisionMetadata(metadata, {
      executionId: decisionContext.executionId,
      requestId: decisionContext.decisionId,
      consensusPackageId: buildConsensusPackageId(consensus),
    });

    if (!metadataValidation.ok) {
      const failed = createFailedChairmanResult(
        decisionContext.executionId,
        metadataValidation.message,
        "INVALID_DECISION_METADATA",
        {
          model: completion.model,
          decisionContext,
          consensus,
          durationMs: completion.durationMs,
          retryCount: providerRetryCount,
          recoveryAttempted:
            providerRetryCount > 0 || synthesisRecovery.recoveryAttempted,
          recoveryActions: schemaRecoveryActions,
        },
      );

      logChairmanExecution({
        status: "failed",
        outcome: "ChairmanFailed",
        model: completion.model,
        latencyMs: completion.durationMs,
        executionId: decisionContext.executionId,
        errorCategory: "INVALID_DECISION_METADATA",
        successfulAdvisorCount,
        retryCount: providerRetryCount,
      });

      return failed;
    }

    const reducedConfidenceSynthesis =
      successfulAdvisorCount === synthesisMinimum;
    const { decisionConfidence, uncertainty } = buildDecisionConfidence({
      consensus,
      chairmanNumericConfidence: content.confidence / 100,
      content,
      advisors,
      missingPerspectives,
      reducedConfidenceSynthesis,
    });
    const confidenceValidation = validateDecisionConfidence(
      decisionConfidence,
      uncertainty,
      consensus.confidence.overall,
    );

    if (!confidenceValidation.ok) {
      const failed = createFailedChairmanResult(
        decisionContext.executionId,
        confidenceValidation.message,
        "INVALID_DECISION_CONFIDENCE",
        {
          model: completion.model,
          decisionContext,
          consensus,
          durationMs: completion.durationMs,
          retryCount: providerRetryCount,
          recoveryAttempted:
            providerRetryCount > 0 || synthesisRecovery.recoveryAttempted,
          recoveryActions: schemaRecoveryActions,
        },
      );

      logChairmanExecution({
        status: "failed",
        outcome: "ChairmanFailed",
        model: completion.model,
        latencyMs: completion.durationMs,
        executionId: decisionContext.executionId,
        errorCategory: "INVALID_DECISION_CONFIDENCE",
        successfulAdvisorCount,
        retryCount: providerRetryCount,
      });

      return failed;
    }

    const policyGate = runDecisionPolicyGate({
      candidate: {
        metadata: metadataValidation.metadata,
        decisionConfidence: confidenceValidation.decisionConfidence,
        uncertainty: confidenceValidation.uncertainty,
        consensus,
        publishedConfidenceAlias:
          confidenceValidation.decisionConfidence.recommendationConfidence,
        priorValidationFailed: false,
        candidateKind: "success_candidate",
        reducedConfidenceSynthesis,
      },
    });

    if (!policyGate.ok) {
      const failureReasonCode =
        policyGate.policyEvaluation?.status === "Rejected"
          ? "DECISION_POLICY_REJECTED"
          : "INVALID_DECISION_POLICY";
      const failed = createFailedChairmanResult(
        decisionContext.executionId,
        policyGate.message,
        failureReasonCode,
        {
          model: completion.model,
          decisionContext,
          consensus,
          policyEvaluation: policyGate.policyEvaluation,
          durationMs: completion.durationMs,
          retryCount: providerRetryCount,
          recoveryAttempted:
            providerRetryCount > 0 || synthesisRecovery.recoveryAttempted,
          recoveryActions: schemaRecoveryActions,
        },
      );

      logChairmanExecution({
        status: "failed",
        outcome: "ChairmanFailed",
        model: completion.model,
        latencyMs: completion.durationMs,
        executionId: decisionContext.executionId,
        errorCategory: failureReasonCode,
        successfulAdvisorCount,
        retryCount: providerRetryCount,
      });

      return failed;
    }

    const publicationGate = evaluatePublicationGate({
      kind: "success_candidate",
      executionId: decisionContext.executionId,
      hasMetadata: Boolean(metadataValidation.metadata),
      hasConfidence: Boolean(confidenceValidation.decisionConfidence),
      hasUncertainty: Boolean(confidenceValidation.uncertainty),
      hasPolicyEvaluation: Boolean(policyGate.policyEvaluation),
      policyStatus: policyGate.policyEvaluation.status,
    });

    if (!publicationGate.publicationAllowed) {
      const failureReasonCode: ChairmanFailureReasonCode =
        publicationGate.failureCategory === "FM-005"
          ? "INVALID_DECISION_METADATA"
          : publicationGate.failureCategory === "FM-006"
            ? "INVALID_DECISION_CONFIDENCE"
            : publicationGate.failureCategory === "FM-007"
              ? "INVALID_DECISION_POLICY"
              : "INTERNAL_ERROR";

      const failed = createFailedChairmanResult(
        decisionContext.executionId,
        publicationGate.reason,
        failureReasonCode,
        {
          model: completion.model,
          decisionContext,
          consensus,
          policyEvaluation: policyGate.policyEvaluation,
          durationMs: completion.durationMs,
          retryCount: providerRetryCount,
          recoveryAttempted:
            providerRetryCount > 0 || synthesisRecovery.recoveryAttempted,
          recoveryActions: [
            ...schemaRecoveryActions,
            "failure_evaluation_blocked_publication",
          ],
        },
      );

      logChairmanExecution({
        status: "failed",
        outcome: "ChairmanFailed",
        model: completion.model,
        latencyMs: completion.durationMs,
        executionId: decisionContext.executionId,
        errorCategory: failureReasonCode,
        successfulAdvisorCount,
        retryCount: providerRetryCount,
      });

      return failed;
    }

    const successResult = createSuccessfulChairmanResult(
      decisionContext.executionId,
      content,
      completion.model,
      completion.durationMs,
      completion.promptTokens,
      completion.completionTokens,
      completion.totalTokens,
      completion.estimatedCostUsd,
      metadataValidation.metadata,
      confidenceValidation.decisionConfidence,
      confidenceValidation.uncertainty,
      policyGate.policyEvaluation,
      {
        missingPerspectives:
          missingPerspectives.length > 0 ? missingPerspectives : undefined,
        reducedConfidenceSynthesis,
      },
    );

    const serializationGate = evaluatePublicationGate({
      kind: "publication_artifact",
      executionId: decisionContext.executionId,
      serialize: () => JSON.stringify(successResult),
    });

    if (!serializationGate.publicationAllowed) {
      const failed = createFailedChairmanResult(
        decisionContext.executionId,
        serializationGate.reason,
        "INTERNAL_ERROR",
        {
          model: completion.model,
          decisionContext,
          consensus,
          durationMs: completion.durationMs,
          retryCount: providerRetryCount,
          recoveryAttempted:
            providerRetryCount > 0 || synthesisRecovery.recoveryAttempted,
          recoveryActions: [
            ...schemaRecoveryActions,
            "publication_serialization_failed",
          ],
        },
      );

      logChairmanExecution({
        status: "failed",
        outcome: "ChairmanFailed",
        model: completion.model,
        latencyMs: completion.durationMs,
        executionId: decisionContext.executionId,
        errorCategory: "INTERNAL_ERROR",
        successfulAdvisorCount,
        retryCount: providerRetryCount,
      });

      return failed;
    }

    logChairmanExecution({
      status: "success",
      model: completion.model,
      latencyMs: completion.durationMs,
      executionId: decisionContext.executionId,
      promptTokens: completion.promptTokens,
      completionTokens: completion.completionTokens,
      totalTokens: completion.totalTokens,
      retryCount: providerRetryCount + (synthesisRecovery.attempts - 1),
      successfulAdvisorCount,
    });

    return successResult;
  } catch (error) {
    let errorCategory: ChairmanFailureReasonCode = "INTERNAL_ERROR";
    let safeMessage = toAdvisorSafeMessage(error);
    let recoveryAttempted = false;
    let recoveryActions: readonly string[] = [];

    if (error instanceof OpenRouterClientError) {
      errorCategory =
        error.code === "CONFIGURATION_ERROR"
          ? "CONFIGURATION_ERROR"
          : "PROVIDER_ERROR";
      safeMessage =
        error.code === "CONFIGURATION_ERROR"
          ? "The Chairman model is not configured on the server."
          : error.message;
      recoveryAttempted = errorCategory === "PROVIDER_ERROR";
      recoveryActions =
        errorCategory === "PROVIDER_ERROR"
          ? Object.freeze(["provider_retry_budget_exhausted"])
          : Object.freeze([]);
    } else if (error instanceof InvalidModelOutputError) {
      errorCategory = "INVALID_MODEL_OUTPUT";
      safeMessage = error.safeMessage;
      recoveryAttempted = true;
      recoveryActions = Object.freeze([
        `retry:FM-004:exhausted_after_${schemaRecoveryPolicy.maxAttempts}`,
      ]);
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
        decisionContext,
        consensus,
        recoveryAttempted,
        recoverySucceeded: false,
        retryCount:
          error instanceof InvalidModelOutputError
            ? Math.max(0, schemaRecoveryPolicy.maxAttempts - 1)
            : 0,
        recoveryActions,
      },
    );
  }
}
