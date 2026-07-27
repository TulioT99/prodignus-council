import "server-only";

import {
  normalizeUnitIntervalConfidence,
  selectValidatedAdvisorOpinions,
  type ValidatedAdvisorOpinion,
} from "@/lib/council/validated-advisor-opinions";
import type { AdvisorResult } from "@/types/council";
import type {
  ConsensusExclusion,
  ConsensusExclusionReason,
  ConsensusParticipant,
} from "@/lib/council/consensus/types";

export type EligibilityPartition = {
  readonly eligible: readonly ValidatedAdvisorOpinion[];
  readonly participatingAdvisors: readonly ConsensusParticipant[];
  readonly excludedAdvisors: readonly ConsensusExclusion[];
};

/**
 * Classify ineligible advisor outcomes for advisory metadata only.
 * Operational exclusions are not semantic votes (ENG-0006 §7).
 */
export function classifyAdvisorExclusionReason(
  advisor: AdvisorResult,
): ConsensusExclusionReason | null {
  if (advisor.status === "success") {
    const recommendation = advisor.recommendation?.trim();
    if (!recommendation) {
      return "invalid";
    }
    return null;
  }

  const message = advisor.errorMessage ?? "";

  if (/cancelled/i.test(message)) {
    return "cancelled";
  }

  if (/timeout|did not respond within/i.test(message)) {
    return "timed_out";
  }

  if (
    /validated|invalid model|schema|parse|malformed/i.test(message) ||
    /could not be validated/i.test(message)
  ) {
    return "malformed";
  }

  if (advisor.status === "idle" || advisor.status === "running") {
    return "incomplete";
  }

  return "failed";
}

function compareAdvisorId(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Partition advisor outcomes into eligible opinions and exclusions.
 * Eligible set is sorted by advisorId for deterministic downstream analysis.
 */
export function partitionAdvisorEligibility(
  advisors: readonly AdvisorResult[],
): EligibilityPartition {
  const validatedById = new Map(
    selectValidatedAdvisorOpinions(advisors).map((opinion) => [
      opinion.advisorId,
      opinion,
    ]),
  );

  const eligible: ValidatedAdvisorOpinion[] = [];
  const excludedAdvisors: ConsensusExclusion[] = [];

  for (const advisor of advisors) {
    const advisorId = advisor.persona.id?.trim() || "unknown";
    const displayName = advisor.persona.displayName || advisorId;
    const exclusionReason = classifyAdvisorExclusionReason(advisor);

    if (exclusionReason !== null) {
      excludedAdvisors.push(
        Object.freeze({
          advisorId,
          displayName,
          reason: exclusionReason,
          detail: advisor.errorMessage,
        }),
      );
      continue;
    }

    const validated = validatedById.get(advisorId);
    if (!validated) {
      excludedAdvisors.push(
        Object.freeze({
          advisorId,
          displayName,
          reason: "invalid",
          detail: "Successful advisor missing from validated opinion gate.",
        }),
      );
      continue;
    }

    eligible.push(validated);
  }

  eligible.sort((a, b) => compareAdvisorId(a.advisorId, b.advisorId));
  excludedAdvisors.sort((a, b) => compareAdvisorId(a.advisorId, b.advisorId));

  const participatingAdvisors = eligible.map((opinion) =>
    Object.freeze({
      advisorId: opinion.advisorId,
      displayName: opinion.displayName,
      recommendation: opinion.recommendation,
      advisorConfidence: normalizeUnitIntervalConfidence(opinion.confidence),
    }),
  );

  return Object.freeze({
    eligible: Object.freeze([...eligible]),
    participatingAdvisors: Object.freeze(participatingAdvisors),
    excludedAdvisors: Object.freeze(excludedAdvisors),
  });
}
