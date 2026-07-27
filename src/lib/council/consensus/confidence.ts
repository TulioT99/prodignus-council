import "server-only";

import type { ValidatedAdvisorOpinion } from "@/lib/council/validated-advisor-opinions";
import type {
  ConsensusConfidence,
  ConsensusEvidenceCoverage,
} from "@/lib/council/consensus/types";
import type { StructuralAnalysis } from "@/lib/council/consensus/analysis";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function round4(value: number): number {
  return Math.round(clamp01(value) * 10_000) / 10_000;
}

/**
 * Structural evidence coverage — presence of rationale elements only.
 * Does not verify external truth (ENG-0006 §4.6 / ENG-0003 §9.8).
 */
export function synthesizeEvidenceCoverage(
  opinions: readonly ValidatedAdvisorOpinion[],
  analysis: StructuralAnalysis,
): ConsensusEvidenceCoverage {
  if (opinions.length === 0) {
    return Object.freeze({
      supportedOpinionRatio: 0,
      opinionsWithKeyArguments: 0,
      opinionsWithRisks: 0,
      opinionsWithAssumptions: 0,
      opinionsWithUnknowns: 0,
      coverageGaps: Object.freeze([
        "No eligible opinions available for evidence coverage.",
      ]),
      evidenceConflicts: Object.freeze([]),
      verificationClaim: "none",
    });
  }

  let withArguments = 0;
  let withRisks = 0;
  let withAssumptions = 0;
  let withUnknowns = 0;
  let supported = 0;
  const coverageGaps: string[] = [];

  for (const opinion of opinions) {
    const hasArguments = opinion.keyArguments.length > 0;
    const hasRisks = opinion.risks.length > 0;
    const hasAssumptions = opinion.assumptions.length > 0;
    const hasUnknowns = opinion.unknowns.length > 0;
    const hasSummary = opinion.summary.trim().length > 0;

    if (hasArguments) withArguments += 1;
    if (hasRisks) withRisks += 1;
    if (hasAssumptions) withAssumptions += 1;
    if (hasUnknowns) withUnknowns += 1;

    if (hasSummary || hasArguments || hasRisks || hasAssumptions) {
      supported += 1;
    } else {
      coverageGaps.push(
        `${opinion.advisorId}: opinion lacks summary and rationale elements.`,
      );
    }

    if (hasUnknowns) {
      coverageGaps.push(
        `${opinion.advisorId}: declared unknowns require additional evidence.`,
      );
    }
  }

  const evidenceConflicts = analysis.hasContradictoryEvidence
    ? analysis.unresolvedConflicts
        .filter((conflict) => conflict.kind === "contradictory_evidence")
        .map((conflict) => conflict.note)
    : [];

  return Object.freeze({
    supportedOpinionRatio: round4(supported / opinions.length),
    opinionsWithKeyArguments: withArguments,
    opinionsWithRisks: withRisks,
    opinionsWithAssumptions: withAssumptions,
    opinionsWithUnknowns: withUnknowns,
    coverageGaps: Object.freeze(
      coverageGaps.sort((a, b) => a.localeCompare(b)),
    ),
    evidenceConflicts: Object.freeze(evidenceConflicts),
    verificationClaim: "none",
  });
}

/**
 * Consensus confidence model (ENG-0006 §9 — implementation-chosen, documented).
 *
 * Method `wp04_structural_product_v1`:
 *   overall = mean(advisorConfidence)
 *             × participationFactor
 *             × agreementFactor
 *             × conflictPenalty
 *             × evidenceFactor
 *
 * Factors:
 * - participationFactor = eligibleCount / max(expectedAdvisorCount, 1) (capped at 1)
 * - agreementFactor = dominantShare (1 when single full-agreement cluster; 0 when zero eligible)
 * - conflictPenalty = 0.5 when advance/halt conflict; 0.7 when contradictory evidence only;
 *   1.0 otherwise. Both conflict and contradiction → 0.4.
 * - evidenceFactor = supportedOpinionRatio (structural presence)
 *
 * Advisor confidence values remain visible on participants; this scalar is separate.
 */
export function synthesizeConsensusConfidence(input: {
  readonly opinions: readonly ValidatedAdvisorOpinion[];
  readonly analysis: StructuralAnalysis;
  readonly evidence: ConsensusEvidenceCoverage;
  readonly expectedAdvisorCount: number;
  readonly belowMinimum: boolean;
}): ConsensusConfidence {
  const { opinions, analysis, evidence, expectedAdvisorCount, belowMinimum } =
    input;

  const notes: string[] = [];

  if (opinions.length === 0) {
    return Object.freeze({
      overall: 0,
      advisorConfidenceMean: 0,
      participationFactor: 0,
      agreementFactor: 0,
      conflictPenalty: 1,
      evidenceFactor: 0,
      method: "wp04_structural_product_v1",
      notes: Object.freeze([
        "Zero eligible advisors — consensus confidence set to 0.",
      ]),
    });
  }

  const advisorConfidenceMean = round4(
    opinions.reduce((sum, opinion) => sum + opinion.confidence, 0) /
      opinions.length,
  );

  const participationFactor = round4(
    Math.min(1, opinions.length / Math.max(expectedAdvisorCount, 1)),
  );

  const agreementFactor = round4(analysis.dominantShare);

  let conflictPenalty = 1;
  if (analysis.hasRecommendationConflict && analysis.hasContradictoryEvidence) {
    conflictPenalty = 0.4;
    notes.push(
      "Conflict and contradictory evidence applied combined penalty 0.4.",
    );
  } else if (analysis.hasRecommendationConflict) {
    conflictPenalty = 0.5;
    notes.push("Advance/halt recommendation conflict applied penalty 0.5.");
  } else if (analysis.hasContradictoryEvidence) {
    conflictPenalty = 0.7;
    notes.push("Contradictory evidence applied penalty 0.7.");
  }

  const evidenceFactor = round4(evidence.supportedOpinionRatio);

  let overall = round4(
    advisorConfidenceMean *
      participationFactor *
      agreementFactor *
      conflictPenalty *
      evidenceFactor,
  );

  if (belowMinimum) {
    overall = round4(overall * 0.5);
    notes.push(
      "Eligible participation below configured minimum — overall confidence halved.",
    );
  }

  if (opinions.length === 1) {
    overall = round4(overall * 0.5);
    notes.push("Single eligible advisor — overall confidence halved.");
  }

  notes.push(
    "Consensus confidence is not a copy of the highest advisor confidence.",
  );

  return Object.freeze({
    overall,
    advisorConfidenceMean,
    participationFactor,
    agreementFactor,
    conflictPenalty,
    evidenceFactor,
    method: "wp04_structural_product_v1",
    notes: Object.freeze(notes),
  });
}
