import "server-only";

import { analyzeStructuralRelationships } from "@/lib/council/consensus/analysis";
import {
  synthesizeConsensusConfidence,
  synthesizeEvidenceCoverage,
} from "@/lib/council/consensus/confidence";
import { partitionAdvisorEligibility } from "@/lib/council/consensus/eligibility";
import { logConsensusEvent } from "@/lib/council/consensus/logging";
import type {
  ConsensusEngineInput,
  ConsensusPackage,
  ConsensusPackageStatus,
} from "@/lib/council/consensus/types";

function buildOpenQuestions(input: {
  readonly belowMinimum: boolean;
  readonly eligibleCount: number;
  readonly analysis: ReturnType<typeof analyzeStructuralRelationships>;
  readonly evidenceGaps: readonly string[];
}): readonly string[] {
  const questions: string[] = [];

  if (input.eligibleCount === 0) {
    questions.push(
      "No eligible advisor opinions were available — additional advisor execution is required.",
    );
  }

  if (input.belowMinimum) {
    questions.push(
      "Eligible advisor participation is below the configured minimum.",
    );
  }

  if (input.eligibleCount === 1) {
    questions.push(
      "Only one eligible advisor opinion is available — multi-advisor comparison is incomplete.",
    );
  }

  if (input.analysis.hasRecommendationConflict) {
    questions.push(
      "Advance and halt recommendations remain unresolved and require Chairman judgment.",
    );
  }

  if (input.analysis.hasContradictoryEvidence) {
    questions.push(
      "Conflicting camps share support tokens — evidence interpretation remains open.",
    );
  }

  for (const gap of input.evidenceGaps) {
    if (/unknowns/i.test(gap)) {
      questions.push(gap);
    }
  }

  for (const conflict of input.analysis.unresolvedConflicts) {
    if (conflict.kind === "insufficient_evidence") {
      questions.push(conflict.note);
    }
  }

  return Object.freeze(
    [...new Set(questions)].sort((a, b) => a.localeCompare(b)),
  );
}

function buildConsensusRationale(input: {
  readonly status: ConsensusPackageStatus;
  readonly eligibleCount: number;
  readonly excludedCount: number;
  readonly analysis: ReturnType<typeof analyzeStructuralRelationships>;
  readonly belowMinimum: boolean;
}): readonly string[] {
  const lines: string[] = [
    `Consensus status: ${input.status}.`,
    `Eligible advisors: ${input.eligibleCount}; excluded: ${input.excludedCount}.`,
    `Relationship summary: ${input.analysis.relationshipSummary.join(", ") || "none"}.`,
  ];

  if (input.analysis.dominantRecommendation) {
    lines.push(
      `Dominant recommendation: ${input.analysis.dominantRecommendation} (share=${input.analysis.dominantShare.toFixed(4)}).`,
    );
  }

  if (input.belowMinimum) {
    lines.push(
      "Participation below configured minimum — package marked degraded/insufficient.",
    );
  }

  if (input.analysis.minorityPositions.length > 0) {
    lines.push(
      `Minority positions preserved: ${input.analysis.minorityPositions.length}.`,
    );
  }

  lines.push(
    "Package contains structural organization of advisor outputs only; no generative arbitration.",
  );

  return Object.freeze(lines);
}

function resolvePackageStatus(input: {
  readonly eligibleCount: number;
  readonly belowMinimum: boolean;
  readonly analysis: ReturnType<typeof analyzeStructuralRelationships>;
  readonly expectedAdvisorCount: number;
}): ConsensusPackageStatus {
  if (input.eligibleCount === 0 || input.belowMinimum) {
    return "insufficient";
  }

  if (input.eligibleCount === 1) {
    return "degraded";
  }

  if (
    input.analysis.hasRecommendationConflict ||
    input.analysis.relationshipSummary.includes("no_consensus")
  ) {
    return "no_consensus";
  }

  if (
    input.analysis.relationshipSummary.includes("insufficient_evidence") ||
    input.eligibleCount < input.expectedAdvisorCount
  ) {
    return "degraded";
  }

  return "complete";
}

/**
 * Build an immutable consensus package from advisor execution outcomes.
 * Never throws for analytical conditions — always publishes an explicit package.
 */
export function buildConsensusPackage(
  input: ConsensusEngineInput,
): ConsensusPackage {
  const executionId = input.executionId?.trim() || "unknown-execution";
  const minimumEligibleAdvisors = Math.max(1, input.minimumEligibleAdvisors);
  const expectedAdvisorCount = Math.max(1, input.expectedAdvisorIds.length);
  const configIdentity = `minEligible=${minimumEligibleAdvisors};expected=${expectedAdvisorCount}`;

  if (!Array.isArray(input.advisors)) {
    logConsensusEvent("consensus_start", {
      executionId,
      advisorCount: 0,
      minimumEligibleAdvisors,
      expectedAdvisorCount,
      malformedInput: true,
    });
    const emptyPackage = createEmptyMalformedPackage(
      executionId,
      minimumEligibleAdvisors,
      expectedAdvisorCount,
      configIdentity,
    );
    logConsensusEvent("consensus_completion", {
      executionId,
      status: emptyPackage.status,
      degraded: true,
      reason: "malformed_input",
    });
    return emptyPackage;
  }

  logConsensusEvent("consensus_start", {
    executionId,
    advisorCount: input.advisors.length,
    minimumEligibleAdvisors,
    expectedAdvisorCount,
  });

  const partition = partitionAdvisorEligibility(input.advisors);
  const eligibleCount = partition.eligible.length;
  const belowMinimum = eligibleCount < minimumEligibleAdvisors;

  logConsensusEvent("eligibility_results", {
    executionId,
    eligibleCount,
    excludedCount: partition.excludedAdvisors.length,
    exclusions: partition.excludedAdvisors.map((entry) => ({
      advisorId: entry.advisorId,
      reason: entry.reason,
    })),
    belowMinimum,
  });

  const analysis = analyzeStructuralRelationships(partition.eligible);

  logConsensusEvent("agreement_analysis", {
    executionId,
    agreementCount: analysis.agreementMap.length,
    relationshipSummary: analysis.relationshipSummary,
    dominantRecommendation: analysis.dominantRecommendation,
  });

  logConsensusEvent("disagreement_detection", {
    executionId,
    disagreementCount: analysis.disagreementMap.length,
    hasRecommendationConflict: analysis.hasRecommendationConflict,
    hasContradictoryEvidence: analysis.hasContradictoryEvidence,
    minorityCount: analysis.minorityPositions.length,
  });

  const evidenceCoverage = synthesizeEvidenceCoverage(
    partition.eligible,
    analysis,
  );

  const confidence = synthesizeConsensusConfidence({
    opinions: partition.eligible,
    analysis,
    evidence: evidenceCoverage,
    expectedAdvisorCount,
    belowMinimum,
  });

  logConsensusEvent("confidence_calculation", {
    executionId,
    overall: confidence.overall,
    method: confidence.method,
    participationFactor: confidence.participationFactor,
    agreementFactor: confidence.agreementFactor,
    conflictPenalty: confidence.conflictPenalty,
    evidenceFactor: confidence.evidenceFactor,
  });

  const status = resolvePackageStatus({
    eligibleCount,
    belowMinimum,
    analysis,
    expectedAdvisorCount,
  });

  const degradationFlags: string[] = [];
  if (belowMinimum) {
    degradationFlags.push("below_minimum_eligible");
  }
  if (eligibleCount === 0) {
    degradationFlags.push("zero_eligible");
  }
  if (eligibleCount === 1) {
    degradationFlags.push("single_advisor");
  }
  if (eligibleCount > 0 && eligibleCount < expectedAdvisorCount) {
    degradationFlags.push("partial_participation");
  }
  if (analysis.hasRecommendationConflict) {
    degradationFlags.push("recommendation_conflict");
  }
  if (status === "degraded" || status === "insufficient") {
    degradationFlags.push(`status_${status}`);
  }

  if (degradationFlags.length > 0) {
    logConsensusEvent("degraded_consensus", {
      executionId,
      status,
      degradationFlags,
    });
  }

  const openQuestions = buildOpenQuestions({
    belowMinimum,
    eligibleCount,
    analysis,
    evidenceGaps: evidenceCoverage.coverageGaps,
  });

  const consensusRationale = buildConsensusRationale({
    status,
    eligibleCount,
    excludedCount: partition.excludedAdvisors.length,
    analysis,
    belowMinimum,
  });

  const pkg: ConsensusPackage = Object.freeze({
    schemaVersion: "1.0",
    executionId,
    status,
    participatingAdvisors: partition.participatingAdvisors,
    excludedAdvisors: partition.excludedAdvisors,
    agreementMap: analysis.agreementMap,
    disagreementMap: analysis.disagreementMap,
    minorityPositions: analysis.minorityPositions,
    unresolvedConflicts: analysis.unresolvedConflicts,
    evidenceCoverage,
    confidence,
    openQuestions,
    consensusRationale,
    metadata: Object.freeze({
      schemaVersion: "1.0",
      executionId,
      eligibleCount,
      excludedCount: partition.excludedAdvisors.length,
      expectedAdvisorCount,
      minimumEligibleAdvisors,
      dominantRecommendation: analysis.dominantRecommendation,
      dominantShare: analysis.dominantShare,
      relationshipSummary: analysis.relationshipSummary,
      degradationFlags: Object.freeze(
        [...new Set(degradationFlags)].sort((a, b) => a.localeCompare(b)),
      ),
      configIdentity,
    }),
  });

  logConsensusEvent("consensus_completion", {
    executionId,
    status: pkg.status,
    eligibleCount,
    agreementCount: pkg.agreementMap.length,
    disagreementCount: pkg.disagreementMap.length,
    minorityCount: pkg.minorityPositions.length,
    overallConfidence: pkg.confidence.overall,
  });

  return pkg;
}

function createEmptyMalformedPackage(
  executionId: string,
  minimumEligibleAdvisors: number,
  expectedAdvisorCount: number,
  configIdentity: string,
): ConsensusPackage {
  return Object.freeze({
    schemaVersion: "1.0",
    executionId,
    status: "insufficient",
    participatingAdvisors: Object.freeze([]),
    excludedAdvisors: Object.freeze([]),
    agreementMap: Object.freeze([]),
    disagreementMap: Object.freeze([
      Object.freeze({
        kind: "insufficient_evidence" as const,
        category: "scope" as const,
        topic:
          "Malformed consensus input — advisor collection was not an array.",
        positions: Object.freeze([]),
      }),
    ]),
    minorityPositions: Object.freeze([]),
    unresolvedConflicts: Object.freeze([
      Object.freeze({
        kind: "insufficient_evidence" as const,
        topic: "Malformed consensus input",
        advisorIds: Object.freeze([]),
        note: "Consensus received malformed session advisor inputs.",
      }),
    ]),
    evidenceCoverage: Object.freeze({
      supportedOpinionRatio: 0,
      opinionsWithKeyArguments: 0,
      opinionsWithRisks: 0,
      opinionsWithAssumptions: 0,
      opinionsWithUnknowns: 0,
      coverageGaps: Object.freeze(["Malformed consensus input."]),
      evidenceConflicts: Object.freeze([]),
      verificationClaim: "none" as const,
    }),
    confidence: Object.freeze({
      overall: 0,
      advisorConfidenceMean: 0,
      participationFactor: 0,
      agreementFactor: 0,
      conflictPenalty: 1,
      evidenceFactor: 0,
      method: "wp04_structural_product_v1" as const,
      notes: Object.freeze([
        "Malformed input — consensus confidence set to 0.",
      ]),
    }),
    openQuestions: Object.freeze([
      "Consensus input was malformed; session advisor outcomes could not be partitioned.",
    ]),
    consensusRationale: Object.freeze([
      "Consensus status: insufficient.",
      "Malformed advisor collection prevented eligibility partitioning.",
    ]),
    metadata: Object.freeze({
      schemaVersion: "1.0" as const,
      executionId,
      eligibleCount: 0,
      excludedCount: 0,
      expectedAdvisorCount,
      minimumEligibleAdvisors,
      dominantRecommendation: null,
      dominantShare: 0,
      relationshipSummary: Object.freeze(["insufficient_evidence"]),
      degradationFlags: Object.freeze([
        "malformed_input",
        "status_insufficient",
        "zero_eligible",
      ]),
      configIdentity,
    }),
  });
}
