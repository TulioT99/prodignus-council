import "server-only";

import type { ConsensusPackage } from "@/lib/council/consensus/types";
import type {
  AdvisorResult,
  ChairmanResponseContent,
  DecisionConfidence,
  DecisionUncertainty,
} from "@/types/council";

export const DECISION_CONFIDENCE_SCHEMA_VERSION = "1.0" as const;
export const DECISION_CONFIDENCE_METHOD = "wp05c_structural_min_v1" as const;

const EPSILON = 1e-6;

export type DecisionConfidenceValidationSuccess = {
  readonly ok: true;
  readonly decisionConfidence: DecisionConfidence;
  readonly uncertainty: DecisionUncertainty;
};

export type DecisionConfidenceValidationFailure = {
  readonly ok: false;
  readonly message: string;
};

export type DecisionConfidenceValidationResult =
  DecisionConfidenceValidationSuccess | DecisionConfidenceValidationFailure;

export type BuildDecisionConfidenceInput = {
  readonly consensus: ConsensusPackage;
  /** Chairman parser confidence on the 0–1 unit interval. */
  readonly chairmanNumericConfidence: number;
  readonly content: Pick<
    ChairmanResponseContent,
    | "assumptions"
    | "unknowns"
    | "disagreements"
    | "consensus"
    | "minimumAdditionalEvidence"
    | "nextActions"
    | "keyArguments"
  >;
  readonly advisors: readonly AdvisorResult[];
  readonly missingPerspectives?: readonly string[];
  readonly reducedConfidenceSynthesis?: boolean;
};

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function roundConfidence(value: number): number {
  return Math.round(clampUnit(value) * 1000) / 1000;
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function degradationPenalty(consensus: ConsensusPackage): number {
  const flags = consensus.metadata.degradationFlags;
  if (flags.length === 0 && consensus.status === "complete") {
    return 1;
  }

  if (
    consensus.status === "insufficient" ||
    consensus.status === "no_consensus"
  ) {
    return 0.55;
  }

  if (consensus.status === "degraded" || flags.length > 0) {
    return 0.75;
  }

  return 1;
}

/**
 * Evidence confidence: structural quality of available evidence/consensus coverage.
 * Does not evaluate the recommendation itself.
 */
function computeEvidenceConfidence(consensus: ConsensusPackage): {
  value: number;
  notes: string[];
} {
  const notes: string[] = [
    "Evidence confidence is derived from Consensus Package structural indicators (ENG-0006), not from generative prose.",
  ];

  const coverage = consensus.evidenceCoverage.supportedOpinionRatio;
  const consensusOverall = clampUnit(consensus.confidence.overall);
  const penalty = degradationPenalty(consensus);
  const gapPenalty =
    consensus.evidenceCoverage.coverageGaps.length > 0
      ? Math.max(0.7, 1 - 0.05 * consensus.evidenceCoverage.coverageGaps.length)
      : 1;
  const conflictPenalty =
    consensus.evidenceCoverage.evidenceConflicts.length > 0 ||
    consensus.unresolvedConflicts.length > 0
      ? 0.85
      : 1;

  const value = roundConfidence(
    consensusOverall *
      (0.45 + 0.55 * clampUnit(coverage)) *
      penalty *
      gapPenalty *
      conflictPenalty,
  );

  if (penalty < 1) {
    notes.push(
      `Consensus status/degradation reduced evidence confidence (status=${consensus.status}).`,
    );
  }

  return { value, notes };
}

/**
 * Reasoning confidence: Chairman numeric confidence, capped by evidence (no silent inflation).
 */
function computeReasoningConfidence(
  chairmanNumericConfidence: number,
  evidenceConfidence: number,
): {
  value: number;
  notes: string[];
} {
  const chairman = clampUnit(chairmanNumericConfidence);
  const capped = Math.min(chairman, evidenceConfidence);
  const notes = [
    "Reasoning confidence starts from the Chairman synthesis confidence signal and is capped by evidence confidence (ENG-0007 §10.3 — no silent inflation).",
  ];

  if (chairman > evidenceConfidence + EPSILON) {
    notes.push(
      "Chairman numeric confidence exceeded evidence confidence and was capped.",
    );
  }

  return { value: roundConfidence(capped), notes };
}

/**
 * Recommendation confidence: derived trust for action, further reduced under material uncertainty.
 */
function computeRecommendationConfidence(
  evidenceConfidence: number,
  reasoningConfidence: number,
  materialUncertainty: boolean,
): {
  value: number;
  notes: string[];
} {
  const base = Math.min(evidenceConfidence, reasoningConfidence);
  const value = roundConfidence(materialUncertainty ? base * 0.9 : base);
  const notes = [
    "Recommendation confidence is derived as min(evidence, reasoning), with an additional reduction when material uncertainty is present.",
  ];

  if (materialUncertainty) {
    notes.push(
      "Material uncertainty detected — recommendation confidence reduced to avoid overstating certainty.",
    );
  }

  return { value, notes };
}

function collectConflictingAdvisorIds(consensus: ConsensusPackage): string[] {
  const ids: string[] = [];

  for (const entry of consensus.disagreementMap) {
    for (const position of entry.positions) {
      ids.push(...position.advisorIds);
    }
  }

  for (const conflict of consensus.unresolvedConflicts) {
    ids.push(...conflict.advisorIds);
  }

  return uniqueNonEmpty(ids);
}

/**
 * Build Decision Uncertainty from consensus + structured Chairman outputs (ENG-0007 §11).
 */
export function buildDecisionUncertainty(
  input: BuildDecisionConfidenceInput,
): DecisionUncertainty {
  const { consensus, content, missingPerspectives = [] } = input;

  const evidenceGaps = uniqueNonEmpty([
    ...consensus.evidenceCoverage.coverageGaps,
    ...consensus.openQuestions,
    ...content.minimumAdditionalEvidence.map((item) => item.evidence),
  ]);

  const unresolvedDisagreement = uniqueNonEmpty([
    ...consensus.unresolvedConflicts.map((item) => item.topic),
    ...consensus.disagreementMap.map((item) => item.topic),
    ...content.disagreements.map((item) => item.topic),
  ]);

  const conflictingAdvisors = collectConflictingAdvisorIds(consensus);

  const assumptionsMade = uniqueNonEmpty(content.assumptions);

  const informationLimitations = uniqueNonEmpty([
    ...content.unknowns,
    ...consensus.metadata.degradationFlags,
    ...missingPerspectives.map((id) => `Missing advisor perspective: ${id}`),
    ...(input.reducedConfidenceSynthesis
      ? ["Reduced-confidence synthesis due to limited advisor coverage."]
      : []),
  ]);

  const whatIsKnown = uniqueNonEmpty([
    ...content.consensus,
    ...content.keyArguments,
    ...consensus.consensusRationale.slice(0, 5),
  ]);

  const whatIsDisputed = uniqueNonEmpty([
    ...unresolvedDisagreement,
    ...consensus.minorityPositions.map(
      (item) => `${item.recommendation}: ${item.statement}`,
    ),
  ]);

  const whatIsMissing = uniqueNonEmpty([
    ...evidenceGaps,
    ...missingPerspectives.map((id) => `Advisor ${id} unavailable`),
  ]);

  const material =
    evidenceGaps.length > 0 ||
    unresolvedDisagreement.length > 0 ||
    conflictingAdvisors.length > 0 ||
    informationLimitations.length > 0 ||
    consensus.status !== "complete" ||
    missingPerspectives.length > 0 ||
    input.reducedConfidenceSynthesis === true;

  const howItConstrainsRecommendation = uniqueNonEmpty([
    material
      ? "Material uncertainty constrains how strongly the recommendation should be treated as settled for action."
      : "No material uncertainty indicators were detected from consensus structure and synthesis fields.",
    consensus.status !== "complete"
      ? `Consensus package status is "${consensus.status}" — do not treat the landscape as complete agreement.`
      : "",
    conflictingAdvisors.length > 0
      ? "Conflicting advisor positions remain visible and must be weighed by the human decision-maker."
      : "",
  ]);

  const nextStepsToReduceUncertainty = uniqueNonEmpty([
    ...content.minimumAdditionalEvidence.map(
      (item) =>
        `${item.evidence}${item.whyNeeded ? ` — ${item.whyNeeded}` : ""}`,
    ),
    ...(material
      ? content.nextActions.slice(0, 3).map((action) => action.action)
      : []),
  ]);

  return Object.freeze({
    schemaVersion: DECISION_CONFIDENCE_SCHEMA_VERSION,
    material,
    evidenceGaps,
    unresolvedDisagreement,
    conflictingAdvisors,
    assumptionsMade,
    informationLimitations,
    whatIsKnown,
    whatIsDisputed,
    whatIsMissing,
    howItConstrainsRecommendation,
    nextStepsToReduceUncertainty,
  });
}

/**
 * Build the Confidence Triad exactly once for a successful Chairman publication.
 * Preserves consensus confidence; derives recommendation confidence (ENG-0007 §10).
 */
export function buildDecisionConfidence(input: BuildDecisionConfidenceInput): {
  decisionConfidence: DecisionConfidence;
  uncertainty: DecisionUncertainty;
} {
  const uncertainty = buildDecisionUncertainty(input);
  const evidence = computeEvidenceConfidence(input.consensus);
  const reasoning = computeReasoningConfidence(
    input.chairmanNumericConfidence,
    evidence.value,
  );
  const recommendation = computeRecommendationConfidence(
    evidence.value,
    reasoning.value,
    uncertainty.material,
  );

  const decisionConfidence = Object.freeze({
    schemaVersion: DECISION_CONFIDENCE_SCHEMA_VERSION,
    method: DECISION_CONFIDENCE_METHOD,
    /** Preserved Consensus Engine confidence (ENG-0006) — not overwritten. */
    consensusConfidence: roundConfidence(input.consensus.confidence.overall),
    evidenceConfidence: evidence.value,
    reasoningConfidence: reasoning.value,
    recommendationConfidence: recommendation.value,
    notes: Object.freeze([
      ...evidence.notes,
      ...reasoning.notes,
      ...recommendation.notes,
      "Advisor confidence values remain on consensus participants and are not erased.",
    ]),
  });

  return { decisionConfidence, uncertainty };
}

/**
 * Validate Confidence Triad + Uncertainty before successful publication.
 */
export function validateDecisionConfidence(
  decisionConfidence: DecisionConfidence | null | undefined,
  uncertainty: DecisionUncertainty | null | undefined,
  expectedConsensusConfidence: number,
): DecisionConfidenceValidationResult {
  if (!decisionConfidence || typeof decisionConfidence !== "object") {
    return {
      ok: false,
      message:
        "Decision Confidence is required for successful Chairman publication.",
    };
  }

  if (!uncertainty || typeof uncertainty !== "object") {
    return {
      ok: false,
      message:
        "Decision Uncertainty is required for successful Chairman publication.",
    };
  }

  if (decisionConfidence.schemaVersion !== DECISION_CONFIDENCE_SCHEMA_VERSION) {
    return {
      ok: false,
      message: 'Decision Confidence schemaVersion must be "1.0".',
    };
  }

  if (decisionConfidence.method !== DECISION_CONFIDENCE_METHOD) {
    return {
      ok: false,
      message: `Decision Confidence method must be "${DECISION_CONFIDENCE_METHOD}".`,
    };
  }

  const dimensions: Array<keyof DecisionConfidence> = [
    "consensusConfidence",
    "evidenceConfidence",
    "reasoningConfidence",
    "recommendationConfidence",
  ];

  for (const key of dimensions) {
    const value = decisionConfidence[key];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    ) {
      return {
        ok: false,
        message: `Decision Confidence.${key} must be a finite number in [0, 1].`,
      };
    }
  }

  if (
    Math.abs(
      decisionConfidence.consensusConfidence -
        roundConfidence(expectedConsensusConfidence),
    ) > 0.001
  ) {
    return {
      ok: false,
      message:
        "Decision Confidence.consensusConfidence must preserve the Consensus Package overall confidence.",
    };
  }

  if (
    decisionConfidence.reasoningConfidence >
    decisionConfidence.evidenceConfidence + EPSILON
  ) {
    return {
      ok: false,
      message:
        "Impossible confidence combination: reasoningConfidence cannot exceed evidenceConfidence.",
    };
  }

  if (
    decisionConfidence.recommendationConfidence >
    Math.min(
      decisionConfidence.evidenceConfidence,
      decisionConfidence.reasoningConfidence,
    ) +
      EPSILON
  ) {
    return {
      ok: false,
      message:
        "Impossible confidence combination: recommendationConfidence cannot exceed min(evidence, reasoning).",
    };
  }

  if (uncertainty.schemaVersion !== DECISION_CONFIDENCE_SCHEMA_VERSION) {
    return {
      ok: false,
      message: 'Decision Uncertainty schemaVersion must be "1.0".',
    };
  }

  if (typeof uncertainty.material !== "boolean") {
    return {
      ok: false,
      message: "Decision Uncertainty.material must be a boolean.",
    };
  }

  const arrayFields: Array<keyof DecisionUncertainty> = [
    "evidenceGaps",
    "unresolvedDisagreement",
    "conflictingAdvisors",
    "assumptionsMade",
    "informationLimitations",
    "whatIsKnown",
    "whatIsDisputed",
    "whatIsMissing",
    "howItConstrainsRecommendation",
    "nextStepsToReduceUncertainty",
  ];

  for (const key of arrayFields) {
    if (!Array.isArray(uncertainty[key])) {
      return {
        ok: false,
        message: `Decision Uncertainty.${key} must be an array.`,
      };
    }
  }

  if (
    !Array.isArray(decisionConfidence.notes) ||
    decisionConfidence.notes.length === 0
  ) {
    return {
      ok: false,
      message: "Decision Confidence.notes must be a non-empty array.",
    };
  }

  return { ok: true, decisionConfidence, uncertainty };
}
