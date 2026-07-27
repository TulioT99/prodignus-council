import "server-only";

import {
  AdvisorExecutionError,
  CouncilConfigurationError,
  InvalidModelOutputError,
  ProviderTimeoutError,
  toAdvisorSafeMessage,
} from "@/lib/council/errors";
import { OpenRouterClientError } from "@/lib/openrouter/types";
import type {
  AdvisorPersona,
  AdvisorResult,
  CouncilDecision,
} from "@/types/council";

export const UNCONFIGURED_MODEL_LABEL = "Unconfigured model";

export const ADVISOR_CANCELLED_SAFE_MESSAGE =
  "The advisor review was cancelled.";

export const ADVISOR_GENERIC_FAILURE_SAFE_MESSAGE =
  "The advisor could not complete this review.";

/**
 * Normalize parser confidence (0–100) into AdvisorResult confidence (0–1).
 * Parsers emit the 0–100 scale; AdvisorResult stores the unit interval.
 * Clamps out-of-range values defensively after schema validation.
 */
export function normalizeAdvisorConfidence(rawConfidence: number): number {
  if (!Number.isFinite(rawConfidence)) {
    return 0;
  }

  const asUnitInterval = rawConfidence / 100;

  if (asUnitInterval < 0) {
    return 0;
  }

  if (asUnitInterval > 1) {
    return 1;
  }

  return asUnitInterval;
}

export type AdvisorFailureClassification = {
  errorCategory: string;
  safeMessage: string;
  stage: "init" | "provider" | "parse" | "cancelled" | "unexpected";
};

export function classifyAdvisorExecutionError(
  error: unknown,
): AdvisorFailureClassification {
  if (error instanceof OpenRouterClientError) {
    if (error.code === "REQUEST_CANCELLED") {
      return {
        errorCategory: "REQUEST_CANCELLED",
        safeMessage: ADVISOR_CANCELLED_SAFE_MESSAGE,
        stage: "cancelled",
      };
    }

    if (error.code === "PROVIDER_TIMEOUT") {
      return {
        errorCategory: "PROVIDER_TIMEOUT",
        safeMessage: new ProviderTimeoutError(error.message).safeMessage,
        stage: "provider",
      };
    }

    if (error.code === "CONFIGURATION_ERROR") {
      return {
        errorCategory: "PROVIDER_ERROR",
        safeMessage: "The advisor model is not configured on the server.",
        stage: "provider",
      };
    }

    const mapped = new AdvisorExecutionError(
      error.code,
      error.message,
      error.retryable,
    );

    return {
      errorCategory: mapped.code,
      safeMessage: mapped.safeMessage,
      stage: "provider",
    };
  }

  if (error instanceof InvalidModelOutputError) {
    return {
      errorCategory: error.code,
      safeMessage: error.safeMessage,
      stage: "parse",
    };
  }

  if (error instanceof CouncilConfigurationError) {
    return {
      errorCategory: error.code,
      safeMessage: toAdvisorSafeMessage(error),
      stage: "init",
    };
  }

  if (error instanceof AdvisorExecutionError) {
    return {
      errorCategory: error.code,
      safeMessage: error.safeMessage,
      stage: "provider",
    };
  }

  return {
    errorCategory: "INTERNAL_ERROR",
    safeMessage: toAdvisorSafeMessage(error),
    stage: "unexpected",
  };
}

export type AdvisorResultContentFields = {
  summary: string;
  analysis: AdvisorResult["analysis"];
  assumptions: string[];
  risks: string[];
  recommendation: CouncilDecision;
  confidence: number;
  keyArguments?: string[];
  unknowns?: string[];
  accessibilityConcerns?: string[];
  journeyBarriers?: string[];
  engineeringConcerns?: string[];
  operationalConcerns?: string[];
  technicalAlternatives?: string[];
  humanImpact?: string[];
  ethicalConcerns?: string[];
  inclusionConcerns?: string[];
  longTermEffects?: string[];
};

export function createFailedAdvisorResult(
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
    summary: ADVISOR_GENERIC_FAILURE_SAFE_MESSAGE,
    analysis: [],
    assumptions: [],
    risks: [],
    recommendation: "insufficient_information",
    confidence: 0,
    durationMs: Math.max(0, durationMs),
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    errorMessage,
  };
}

export function createUnexpectedAdvisorFailureResult(
  persona: AdvisorPersona,
  executionId: string,
  errorMessage = ADVISOR_GENERIC_FAILURE_SAFE_MESSAGE,
): AdvisorResult {
  return createFailedAdvisorResult(persona, executionId, errorMessage);
}

export function createSuccessfulAdvisorResult(
  persona: AdvisorPersona,
  executionId: string,
  content: AdvisorResultContentFields,
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
    confidence: normalizeAdvisorConfidence(content.confidence),
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
