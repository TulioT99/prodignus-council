import "server-only";

import { normalizeAdvisorConfidence } from "@/lib/council/advisor-execution-result";
import type {
  AdvisorResult,
  CouncilDecision,
} from "@/types/council";

/**
 * Validated advisor opinion prepared for deterministic consensus input (WP-04).
 * Only successful, schema-validated advisor executions are included.
 * Public CouncilResult schema is unchanged — this is an internal reliability gate.
 */
export type ValidatedAdvisorOpinion = {
  readonly advisorId: string;
  readonly displayName: string;
  readonly recommendation: CouncilDecision;
  /** Normalized recommendation confidence on the 0–1 scale. */
  readonly confidence: number;
  readonly summary: string;
  readonly risks: readonly string[];
  readonly assumptions: readonly string[];
  readonly keyArguments: readonly string[];
  readonly unknowns: readonly string[];
  readonly executionId: string;
  readonly durationMs: number;
};

/**
 * Select successful advisor results as a validated opinion set.
 * Failed / incomplete advisors are excluded (FR-AD-03 validation before consensus).
 * Confidence is re-normalized defensively for consensus consumers.
 */
export function selectValidatedAdvisorOpinions(
  advisors: readonly AdvisorResult[],
): ValidatedAdvisorOpinion[] {
  const opinions: ValidatedAdvisorOpinion[] = [];

  for (const advisor of advisors) {
    if (advisor.status !== "success") {
      continue;
    }

    opinions.push({
      advisorId: advisor.persona.id,
      displayName: advisor.persona.displayName,
      recommendation: advisor.recommendation,
      confidence: normalizeUnitIntervalConfidence(advisor.confidence),
      summary: advisor.summary,
      risks: Object.freeze([...advisor.risks]),
      assumptions: Object.freeze([...advisor.assumptions]),
      keyArguments: Object.freeze([...(advisor.keyArguments ?? [])]),
      unknowns: Object.freeze([...(advisor.unknowns ?? [])]),
      executionId: advisor.executionId,
      durationMs: advisor.durationMs,
    });
  }

  return opinions;
}

/**
 * AdvisorResult.confidence is already on 0–1. Re-clamp only.
 * If a legacy caller passes 0–100 by mistake, normalize via /100.
 */
export function normalizeUnitIntervalConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value > 1) {
    return normalizeAdvisorConfidence(value);
  }

  if (value < 0) {
    return 0;
  }

  return value;
}

export function countValidatedAdvisorOpinions(
  advisors: readonly AdvisorResult[],
): number {
  return selectValidatedAdvisorOpinions(advisors).length;
}
