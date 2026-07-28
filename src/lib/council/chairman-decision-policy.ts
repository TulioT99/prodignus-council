import "server-only";

import type { ConsensusPackage } from "@/lib/council/consensus/types";
import type {
  DecisionConfidence,
  DecisionMetadata,
  DecisionPolicyResult,
  DecisionPolicyRuleEvaluation,
  DecisionPolicyStatus,
  DecisionPolicyViolation,
  DecisionUncertainty,
} from "@/types/council";

export const DECISION_POLICY_SCHEMA_VERSION = "1.0" as const;
export const DECISION_POLICY_VERSION = "1.0" as const;
export const DECISION_POLICY_EVALUATOR =
  "chairman-decision-policy-engine" as const;

const EPSILON = 1e-6;

export type DecisionPolicyClock = {
  now(): string;
};

export const systemDecisionPolicyClock: DecisionPolicyClock = {
  now: () => new Date().toISOString(),
};

/**
 * Candidate package presented to the Decision Policy Engine after reasoning.
 * The engine never mutates this candidate; it only evaluates publishability.
 */
export type DecisionPolicyCandidate = {
  readonly metadata: DecisionMetadata | null | undefined;
  readonly decisionConfidence: DecisionConfidence | null | undefined;
  readonly uncertainty: DecisionUncertainty | null | undefined;
  readonly consensus: ConsensusPackage | null | undefined;
  /** Expected published confidence alias (recommendationConfidence). */
  readonly publishedConfidenceAlias?: number;
  /**
   * When true, a mandatory upstream validation already failed.
   * Used to fail closed if a candidate is incorrectly forwarded.
   */
  readonly priorValidationFailed?: boolean;
  /**
   * Distinguishes a success-shaped publication candidate from a failure-shaped
   * attempt that must never become a published recommendation.
   */
  readonly candidateKind: "success_candidate" | "failure_candidate";
  readonly reducedConfidenceSynthesis?: boolean;
};

export type DecisionPolicyRuleDefinition = {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly evaluate: (candidate: DecisionPolicyCandidate) => {
    readonly outcome: DecisionPolicyRuleEvaluation["outcome"];
    readonly explanation: string;
    readonly violation?: Omit<
      DecisionPolicyViolation,
      "violationId" | "ruleId"
    >;
  };
};

export type EvaluateDecisionPolicyInput = {
  readonly candidate: DecisionPolicyCandidate;
  readonly clock?: DecisionPolicyClock;
  /** Optional rule registry override (tests / future extension). */
  readonly rules?: readonly DecisionPolicyRuleDefinition[];
};

export type DecisionPolicyEvaluationSuccess = {
  readonly ok: true;
  readonly policyEvaluation: DecisionPolicyResult;
};

export type DecisionPolicyEvaluationFailure = {
  readonly ok: false;
  readonly message: string;
  readonly policyEvaluation?: DecisionPolicyResult;
};

export type DecisionPolicyGateResult =
  DecisionPolicyEvaluationSuccess | DecisionPolicyEvaluationFailure;

function pass(explanation: string): {
  outcome: "Pass";
  explanation: string;
} {
  return { outcome: "Pass", explanation };
}

function fail(
  explanation: string,
  message: string,
  severity: DecisionPolicyViolation["severity"] = "critical",
): {
  outcome: "Fail";
  explanation: string;
  violation: Omit<DecisionPolicyViolation, "violationId" | "ruleId">;
} {
  return {
    outcome: "Fail",
    explanation,
    violation: {
      severity,
      message,
      governingSpecification: "ENG-0007",
    },
  };
}

function escalate(
  explanation: string,
  message: string,
): {
  outcome: "EscalationRequired";
  explanation: string;
  violation: Omit<DecisionPolicyViolation, "violationId" | "ruleId">;
} {
  return {
    outcome: "EscalationRequired",
    explanation,
    violation: {
      severity: "escalation",
      message,
      governingSpecification: "ENG-0007",
    },
  };
}

/**
 * Initial deterministic Decision Policy rules (ENG-0007 §8 / AC-CH-15).
 * Add new rules here — do not embed policy in prompts or the runner.
 */
export const INITIAL_DECISION_POLICY_RULES: readonly DecisionPolicyRuleDefinition[] =
  Object.freeze([
    {
      ruleId: "DP-R01",
      ruleName: "Required decision artifacts present",
      evaluate: (candidate) => {
        const missing: string[] = [];
        if (!candidate.metadata) missing.push("Decision Metadata");
        if (!candidate.decisionConfidence) missing.push("Confidence");
        if (!candidate.uncertainty) missing.push("Uncertainty");

        if (missing.length > 0) {
          return fail(
            `Missing required decision artifacts: ${missing.join(", ")}.`,
            `Successful publication requires Decision Metadata, Confidence, and Uncertainty. Missing: ${missing.join(", ")}.`,
          );
        }

        return pass(
          "Decision Metadata, Confidence, and Uncertainty are present.",
        );
      },
    },
    {
      ruleId: "DP-R02",
      ruleName: "Recommendation confidence may not exceed evidence confidence",
      evaluate: (candidate) => {
        const confidence = candidate.decisionConfidence;
        if (!confidence) {
          return fail(
            "Confidence triad missing; cannot enforce recommendation ≤ evidence.",
            "Recommendation confidence cannot be evaluated without a Confidence Triad.",
          );
        }

        if (
          confidence.recommendationConfidence >
          confidence.evidenceConfidence + EPSILON
        ) {
          return fail(
            "Recommendation confidence exceeds evidence confidence.",
            `recommendationConfidence (${confidence.recommendationConfidence}) exceeds evidenceConfidence (${confidence.evidenceConfidence}).`,
          );
        }

        return pass(
          "Recommendation confidence does not exceed evidence confidence.",
        );
      },
    },
    {
      ruleId: "DP-R03",
      ruleName: "Published decision must reference a valid Consensus Package",
      evaluate: (candidate) => {
        const consensus = candidate.consensus;
        const metadata = candidate.metadata;

        if (!consensus || typeof consensus !== "object") {
          return fail(
            "Consensus Package is absent.",
            "A published decision must reference a valid Consensus Package.",
          );
        }

        if (
          typeof consensus.schemaVersion !== "string" ||
          !consensus.schemaVersion.trim() ||
          typeof consensus.executionId !== "string" ||
          !consensus.executionId.trim() ||
          !consensus.confidence ||
          typeof consensus.confidence.overall !== "number"
        ) {
          return fail(
            "Consensus Package schema is incomplete.",
            "Consensus Package lacks required identity/confidence fields for publication.",
          );
        }

        if (!metadata?.consensusPackageId?.trim()) {
          return fail(
            "Decision Metadata lacks consensusPackageId.",
            "Decision Metadata must reference the consumed Consensus Package identity.",
          );
        }

        if (metadata.parentConsensusReference !== metadata.consensusPackageId) {
          return fail(
            "parentConsensusReference does not match consensusPackageId.",
            "Decision Metadata consensus linkage is internally inconsistent.",
          );
        }

        return pass(
          "Decision references a valid Consensus Package with consistent metadata linkage.",
        );
      },
    },
    {
      ruleId: "DP-R04",
      ruleName: "Mandatory upstream validation must not have failed",
      evaluate: (candidate) => {
        if (candidate.priorValidationFailed === true) {
          return fail(
            "Mandatory validation previously failed.",
            "A decision cannot publish after mandatory upstream validation failure.",
          );
        }

        return pass("No prior mandatory validation failure was indicated.");
      },
    },
    {
      ruleId: "DP-R05",
      ruleName: "Failure outcomes cannot produce publishable recommendations",
      evaluate: (candidate) => {
        if (candidate.candidateKind === "failure_candidate") {
          return fail(
            "Failure-shaped candidate cannot be published as a recommendation.",
            "Failure outcomes cannot produce publishable recommendations.",
          );
        }

        return pass("Candidate is success-shaped for publication evaluation.");
      },
    },
    {
      ruleId: "DP-R06",
      ruleName: "Decision metadata and confidence are internally consistent",
      evaluate: (candidate) => {
        const metadata = candidate.metadata;
        const confidence = candidate.decisionConfidence;
        const uncertainty = candidate.uncertainty;
        const consensus = candidate.consensus;

        if (!metadata || !confidence || !uncertainty || !consensus) {
          return fail(
            "Cannot assess internal consistency without complete artifacts.",
            "Metadata, Confidence, Uncertainty, and Consensus Package are required for consistency checks.",
          );
        }

        if (metadata.schemaVersion !== "1.0") {
          return fail(
            "Decision Metadata schemaVersion is invalid.",
            'Decision Metadata schemaVersion must be "1.0".',
          );
        }

        if (confidence.schemaVersion !== "1.0") {
          return fail(
            "Decision Confidence schemaVersion is invalid.",
            'Decision Confidence schemaVersion must be "1.0".',
          );
        }

        if (uncertainty.schemaVersion !== "1.0") {
          return fail(
            "Decision Uncertainty schemaVersion is invalid.",
            'Decision Uncertainty schemaVersion must be "1.0".',
          );
        }

        if (
          Math.abs(
            confidence.consensusConfidence - consensus.confidence.overall,
          ) > 0.001
        ) {
          return fail(
            "consensusConfidence does not preserve Consensus Package overall confidence.",
            "Decision Confidence.consensusConfidence must match Consensus Package confidence.overall.",
          );
        }

        if (
          confidence.reasoningConfidence >
          confidence.evidenceConfidence + EPSILON
        ) {
          return fail(
            "reasoningConfidence exceeds evidenceConfidence.",
            "Impossible confidence combination: reasoningConfidence cannot exceed evidenceConfidence.",
          );
        }

        if (
          typeof candidate.publishedConfidenceAlias === "number" &&
          Math.abs(
            candidate.publishedConfidenceAlias -
              confidence.recommendationConfidence,
          ) > EPSILON
        ) {
          return fail(
            "Published confidence alias is inconsistent with recommendationConfidence.",
            "ChairmanSuccessResult.confidence must equal decisionConfidence.recommendationConfidence.",
          );
        }

        if (metadata.executionId.trim() !== consensus.executionId.trim()) {
          return fail(
            "Metadata executionId does not match Consensus Package executionId.",
            "Decision Metadata and Consensus Package execution identifiers must align.",
          );
        }

        return pass(
          "Decision Metadata and Confidence are internally consistent with the Consensus Package.",
        );
      },
    },
    {
      ruleId: "DP-R07",
      ruleName: "Degraded council coverage requires escalation",
      evaluate: (candidate) => {
        const consensus = candidate.consensus;
        const reduced = candidate.reducedConfidenceSynthesis === true;
        const incomplete = consensus != null && consensus.status !== "complete";

        if (reduced || incomplete) {
          const reasons: string[] = [];
          if (reduced) {
            reasons.push(
              "reduced-confidence synthesis due to limited advisor coverage",
            );
          }
          if (incomplete && consensus) {
            reasons.push(`consensus package status is "${consensus.status}"`);
          }

          return escalate(
            `Escalation required: ${reasons.join("; ")}.`,
            `Automatic publication is not permitted without escalation when ${reasons.join(" and ")}.`,
          );
        }

        return pass(
          "Council coverage and consensus status do not require escalation.",
        );
      },
    },
  ]);

function aggregateStatus(
  rules: readonly DecisionPolicyRuleEvaluation[],
): DecisionPolicyStatus {
  if (rules.some((rule) => rule.outcome === "Fail")) {
    return "Rejected";
  }

  if (rules.some((rule) => rule.outcome === "EscalationRequired")) {
    return "EscalationRequired";
  }

  return "Approved";
}

/**
 * Evaluate Decision Policy deterministically (ENG-0007 §8).
 * Never modifies Chairman reasoning — approve, escalate, or reject publication only.
 */
export function evaluateDecisionPolicy(
  input: EvaluateDecisionPolicyInput,
): DecisionPolicyResult {
  const clock = input.clock ?? systemDecisionPolicyClock;
  const rules = input.rules ?? INITIAL_DECISION_POLICY_RULES;
  const rulesEvaluated: DecisionPolicyRuleEvaluation[] = [];
  const violations: DecisionPolicyViolation[] = [];

  for (const rule of rules) {
    const result = rule.evaluate(input.candidate);
    rulesEvaluated.push(
      Object.freeze({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        outcome: result.outcome,
        explanation: result.explanation,
      }),
    );

    if (result.violation) {
      violations.push(
        Object.freeze({
          violationId: `${rule.ruleId}:${result.outcome.toLowerCase()}`,
          ruleId: rule.ruleId,
          severity: result.violation.severity,
          message: result.violation.message,
          governingSpecification: result.violation.governingSpecification,
        }),
      );
    }
  }

  return Object.freeze({
    schemaVersion: DECISION_POLICY_SCHEMA_VERSION,
    status: aggregateStatus(rulesEvaluated),
    rulesEvaluated: Object.freeze(rulesEvaluated),
    violations: Object.freeze(violations),
    evaluationTimestamp: clock.now(),
    policyVersion: DECISION_POLICY_VERSION,
    evaluator: DECISION_POLICY_EVALUATOR,
  });
}

/**
 * Validate a policy evaluation artifact before acting on it.
 */
export function validateDecisionPolicyResult(
  policyEvaluation: DecisionPolicyResult | null | undefined,
): DecisionPolicyGateResult {
  if (!policyEvaluation || typeof policyEvaluation !== "object") {
    return {
      ok: false,
      message: "Decision Policy evaluation is required before publication.",
    };
  }

  if (policyEvaluation.schemaVersion !== DECISION_POLICY_SCHEMA_VERSION) {
    return {
      ok: false,
      message: 'Decision Policy schemaVersion must be "1.0".',
      policyEvaluation,
    };
  }

  if (policyEvaluation.policyVersion !== DECISION_POLICY_VERSION) {
    return {
      ok: false,
      message: `Decision Policy policyVersion must be "${DECISION_POLICY_VERSION}".`,
      policyEvaluation,
    };
  }

  if (policyEvaluation.evaluator !== DECISION_POLICY_EVALUATOR) {
    return {
      ok: false,
      message: `Decision Policy evaluator must be "${DECISION_POLICY_EVALUATOR}".`,
      policyEvaluation,
    };
  }

  if (
    policyEvaluation.status !== "Approved" &&
    policyEvaluation.status !== "EscalationRequired" &&
    policyEvaluation.status !== "Rejected"
  ) {
    return {
      ok: false,
      message: "Decision Policy status is invalid.",
      policyEvaluation,
    };
  }

  if (!Array.isArray(policyEvaluation.rulesEvaluated)) {
    return {
      ok: false,
      message: "Decision Policy rulesEvaluated must be an array.",
      policyEvaluation,
    };
  }

  if (policyEvaluation.rulesEvaluated.length === 0) {
    return {
      ok: false,
      message: "Decision Policy must evaluate at least one rule.",
      policyEvaluation,
    };
  }

  if (!Array.isArray(policyEvaluation.violations)) {
    return {
      ok: false,
      message: "Decision Policy violations must be an array.",
      policyEvaluation,
    };
  }

  if (
    typeof policyEvaluation.evaluationTimestamp !== "string" ||
    !policyEvaluation.evaluationTimestamp.trim()
  ) {
    return {
      ok: false,
      message:
        "Decision Policy evaluationTimestamp must be a non-empty string.",
      policyEvaluation,
    };
  }

  const derived = aggregateStatus(policyEvaluation.rulesEvaluated);
  if (derived !== policyEvaluation.status) {
    return {
      ok: false,
      message:
        "Decision Policy status is inconsistent with evaluated rule outcomes.",
      policyEvaluation,
    };
  }

  if (policyEvaluation.status === "Rejected") {
    return {
      ok: false,
      message:
        policyEvaluation.violations[0]?.message ??
        "Decision Policy rejected publication.",
      policyEvaluation,
    };
  }

  return { ok: true, policyEvaluation };
}

/**
 * Run evaluation + validation gate used by the Chairman publication pipeline.
 * Rejected → not ok (block publication).
 * Approved / EscalationRequired → ok (EscalationRequired still publishes with explicit status).
 */
export function runDecisionPolicyGate(
  input: EvaluateDecisionPolicyInput,
): DecisionPolicyGateResult {
  const policyEvaluation = evaluateDecisionPolicy(input);
  return validateDecisionPolicyResult(policyEvaluation);
}
