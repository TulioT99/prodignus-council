import "server-only";

import type { CouncilDecision } from "@/types/council";

/**
 * Consensus Engine contracts (ENG-0006).
 * Structural analysis only — no LLM invocation, no generative arbitration.
 */

export type ConsensusPackageStatus =
  "complete" | "degraded" | "insufficient" | "no_consensus";

export type ConsensusExclusionReason =
  "failed" | "timed_out" | "cancelled" | "malformed" | "invalid" | "incomplete";

export type RecommendationPolarity = "advance" | "halt" | "defer";

export type ConsensusAgreementKind =
  "full_agreement" | "partial_agreement" | "complementary";

export type ConsensusDisagreementKind =
  | "conflicting_recommendations"
  | "contradictory_evidence"
  | "insufficient_evidence";

export type ConsensusParticipant = {
  readonly advisorId: string;
  readonly displayName: string;
  readonly recommendation: CouncilDecision;
  /** Advisor confidence on the 0–1 unit interval (preserved, not overwritten). */
  readonly advisorConfidence: number;
};

export type ConsensusExclusion = {
  readonly advisorId: string;
  readonly displayName: string;
  readonly reason: ConsensusExclusionReason;
  readonly detail?: string;
};

export type ConsensusAgreementEntry = {
  readonly kind: ConsensusAgreementKind;
  readonly dimension: "recommendation";
  readonly position: CouncilDecision | string;
  readonly advisorIds: readonly string[];
  readonly qualifications: readonly string[];
};

export type ConsensusCompetingPosition = {
  readonly advisorIds: readonly string[];
  readonly recommendation: CouncilDecision;
  readonly summary: string;
  readonly keyArguments: readonly string[];
  readonly risks: readonly string[];
  readonly assumptions: readonly string[];
};

export type ConsensusDisagreementEntry = {
  readonly kind: ConsensusDisagreementKind;
  readonly category:
    "recommendation" | "evidence" | "assumption" | "risk" | "scope";
  readonly topic: string;
  readonly positions: readonly ConsensusCompetingPosition[];
};

export type ConsensusMinorityPosition = {
  readonly advisorIds: readonly string[];
  readonly recommendation: CouncilDecision;
  readonly statement: string;
  readonly keyArguments: readonly string[];
  readonly risks: readonly string[];
  readonly assumptions: readonly string[];
  readonly whyItDiffers: string;
};

export type ConsensusUnresolvedConflict = {
  readonly kind: ConsensusDisagreementKind;
  readonly topic: string;
  readonly advisorIds: readonly string[];
  readonly note: string;
};

export type ConsensusEvidenceCoverage = {
  /** Fraction of eligible opinions that carry non-empty rationale elements. */
  readonly supportedOpinionRatio: number;
  readonly opinionsWithKeyArguments: number;
  readonly opinionsWithRisks: number;
  readonly opinionsWithAssumptions: number;
  readonly opinionsWithUnknowns: number;
  readonly coverageGaps: readonly string[];
  readonly evidenceConflicts: readonly string[];
  /** Explicit: coverage is structural presence, not external verification. */
  readonly verificationClaim: "none";
};

export type ConsensusConfidence = {
  /** Consensus-level confidence on the 0–1 unit interval. */
  readonly overall: number;
  readonly advisorConfidenceMean: number;
  readonly participationFactor: number;
  readonly agreementFactor: number;
  readonly conflictPenalty: number;
  readonly evidenceFactor: number;
  readonly method: "wp04_structural_product_v1";
  readonly notes: readonly string[];
};

export type ConsensusMetadata = {
  readonly schemaVersion: "1.0";
  readonly executionId: string;
  readonly eligibleCount: number;
  readonly excludedCount: number;
  readonly expectedAdvisorCount: number;
  readonly minimumEligibleAdvisors: number;
  readonly dominantRecommendation: CouncilDecision | null;
  readonly dominantShare: number;
  readonly relationshipSummary: readonly string[];
  readonly degradationFlags: readonly string[];
  readonly configIdentity: string;
};

/**
 * Immutable consensus package published for Chairman consumption (ENG-0006 §6).
 * Semantic identity excludes wall-clock timestamps (ENG-0006 §11.2).
 */
export type ConsensusPackage = {
  readonly schemaVersion: "1.0";
  readonly executionId: string;
  readonly status: ConsensusPackageStatus;
  readonly participatingAdvisors: readonly ConsensusParticipant[];
  readonly excludedAdvisors: readonly ConsensusExclusion[];
  readonly agreementMap: readonly ConsensusAgreementEntry[];
  readonly disagreementMap: readonly ConsensusDisagreementEntry[];
  readonly minorityPositions: readonly ConsensusMinorityPosition[];
  readonly unresolvedConflicts: readonly ConsensusUnresolvedConflict[];
  readonly evidenceCoverage: ConsensusEvidenceCoverage;
  readonly confidence: ConsensusConfidence;
  readonly openQuestions: readonly string[];
  /** Structural explanation of how the package was formed (not executive recommendation). */
  readonly consensusRationale: readonly string[];
  readonly metadata: ConsensusMetadata;
};

export type ConsensusEngineInput = {
  readonly executionId: string;
  readonly advisors: readonly import("@/types/council").AdvisorResult[];
  readonly expectedAdvisorIds: readonly string[];
  readonly minimumEligibleAdvisors: number;
};
