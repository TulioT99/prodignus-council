import type { ConsensusPackage } from "@/lib/council/consensus/types";
import type { EvidencePackage } from "@/types/pkos";

export type ThinkingLens =
  | "contrarian"
  | "product-strategy"
  | "ux-accessibility"
  | "delivery-engineering"
  | "human-impact"
  | "first-principles"
  | "expansionist"
  | "outsider"
  | "executor";
export type AdvisorStatus = "idle" | "running" | "success" | "failed";

export type CouncilDecision =
  | "proceed"
  | "proceed_with_conditions"
  | "test_first"
  | "do_not_proceed"
  | "insufficient_information";

export type DecisionStatus = "draft" | "under_review" | "decided" | "archived";

export type CouncilSessionStatus = "complete" | "partial" | "failed";

/**
 * Client presentation severity for a completed orchestration response.
 * Distinct from transport-level `ok` on CouncilApiSuccess/Failure.
 */
export type CouncilSessionSeverity = "success" | "warning" | "error";

/**
 * Minimal WP-02 terminal reason taxonomy (not the full WP-05 Chairman catalog).
 * Codes describe Council session outcomes, not vendor/provider failures.
 */
export type CouncilTerminalReasonCode =
  | "SESSION_COMPLETE"
  | "PARTIAL_ADVISOR_FAILURE"
  | "CHAIRMAN_SYNTHESIS_FAILURE"
  | "INSUFFICIENT_ADVISOR_PARTICIPATION"
  | "INTERNAL_ORCHESTRATION_FAILURE";

export type CouncilTerminalOutcome = {
  sessionStatus: CouncilSessionStatus;
  sessionSeverity: CouncilSessionSeverity;
  terminalReasonCode: CouncilTerminalReasonCode;
};

export type DecisionContextAttachment = {
  id: string;
  name: string;
  mimeType: string;
};

export type DecisionContext = {
  readonly executionId: string;
  readonly decisionId: string;
  readonly title: string;
  readonly question: string;
  readonly language: string;
  readonly context: string;
  readonly constraints: string;
  readonly objectives?: string;
  readonly attachments: readonly DecisionContextAttachment[];
  readonly pkosEvidence?: EvidencePackage;
  readonly timestamp: string;
  readonly status: DecisionStatus;
  readonly owner?: string;
};

export type CouncilIntegrityDiagnostics = {
  executionId: string;
  question: string;
  language: string;
  contextDigest: string;
  advisorIds: string[];
};

export type Decision = {
  id: string;
  title: string;
  question: string;
  context: string;
  constraints: string;
  owner?: string;
  expectedOutcome?: string;
  createdAt: string;
  status: DecisionStatus;
};

export type AdvisorPersona = {
  id: string;
  displayName: string;
  thinkingLens: ThinkingLens;
  expertise: string;
  background: string;
  yearsExperience: number;
  mission: string;
  decisionStyle: string;
  coreBeliefs: string[];
  model: string;
};

export type CouncilRequest = {
  title: string;
  question: string;
  context: string;
  constraints: string;
  expectedOutcome?: string;
  alternatives?: string;
};

export type AdvisorAnalysisItem = {
  title: string;
  description: string;
};

export type HumanImpactResponseContent = {
  summary: string;
  analysis: AdvisorAnalysisItem[];
  recommendation: CouncilDecision;
  keyArguments: string[];
  risks: string[];
  unknowns: string[];
  humanImpact: string[];
  ethicalConcerns: string[];
  inclusionConcerns: string[];
  longTermEffects: string[];
  confidence: number;
};

export type DeliveryEngineeringResponseContent = {
  summary: string;
  analysis: AdvisorAnalysisItem[];
  recommendation: CouncilDecision;
  keyArguments: string[];
  risks: string[];
  unknowns: string[];
  engineeringConcerns: string[];
  operationalConcerns: string[];
  technicalAlternatives: string[];
  confidence: number;
};

export type UxAccessibilityResponseContent = {
  summary: string;
  analysis: AdvisorAnalysisItem[];
  recommendation: CouncilDecision;
  keyArguments: string[];
  risks: string[];
  unknowns: string[];
  accessibilityConcerns: string[];
  journeyBarriers: string[];
  confidence: number;
};

export type ProductStrategyResponseContent = {
  summary: string;
  analysis: AdvisorAnalysisItem[];
  recommendation: CouncilDecision;
  keyArguments: string[];
  risks: string[];
  assumptions: string[];
  unknowns: string[];
  confidence: number;
};

export type AdvisorResponseContent = {
  summary: string;
  analysis: AdvisorAnalysisItem[];
  assumptions: string[];
  risks: string[];
  recommendation: CouncilDecision;
  confidence: number;
};

export type AdvisorSource = "live" | "mock";

export type AdvisorResult = {
  persona: AdvisorPersona;
  source: AdvisorSource;
  status: AdvisorStatus;
  executionId: string;
  summary: string;
  analysis: AdvisorAnalysisItem[];
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
  durationMs: number;
  totalTokens: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
  errorMessage?: string;
};

export type AdvisorExecutionConfig = {
  advisorId: string;
  modelEnvVar: string;
};

export type CouncilErrorCode =
  | "INVALID_REQUEST"
  | "CONFIGURATION_ERROR"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE"
  | "INVALID_MODEL_OUTPUT"
  | "INTERNAL_ERROR";

export type CouncilApiRequest = {
  decision: Decision;
};

export type CouncilApiSuccess = {
  /** Transport/request-processing success: orchestration completed without crashing. */
  ok: true;
  result: CouncilResult;
  /** Mirror of `result.status` for clients that should not dig into the payload. */
  sessionStatus: CouncilSessionStatus;
  /** Presentation severity for the Council session outcome. */
  sessionSeverity: CouncilSessionSeverity;
  /** Deterministic machine-readable terminal reason (WP-02 minimal taxonomy). */
  terminalReasonCode: CouncilTerminalReasonCode;
};

export type CouncilApiFailure = {
  ok: false;
  error: {
    code: CouncilErrorCode;
    message: string;
    retryable: boolean;
  };
};

export type CouncilApiResponse = CouncilApiSuccess | CouncilApiFailure;

export type ChairmanStatus = "success" | "failed";

/**
 * Explicit ENG-0007 terminal failure outcome identity.
 * Distinguishes operational Chairman failure from a validated recommendation.
 */
export type ChairmanFailedOutcome = "ChairmanFailed";

/**
 * Published Decision Metadata Package (ENG-0007 §6.2 / WP-05B).
 * Mandatory on successful Chairman decisions. Provider-independent.
 */
export type DecisionMetadata = {
  readonly schemaVersion: "1.0";
  /** Unique identity of the published decision package. */
  readonly decisionId: string;
  /** ISO-8601 timestamp when the decision package was published. */
  readonly decisionTimestamp: string;
  /** Chairman Decision Engine specification version applied. */
  readonly chairmanSpecificationVersion: string;
  /** Governing ENG identity (ENG-0007). */
  readonly governingEngineeringSpecification: "ENG-0007";
  /** Governing ENG approved version. */
  readonly governingEngineeringSpecificationVersion: string;
  /** Published implementation baseline commit identity. */
  readonly implementationBaseline: string;
  /** Identity of the immutable Consensus Package consumed. */
  readonly consensusPackageId: string;
  /** Consensus Package schema version. */
  readonly consensusSchemaVersion: string;
  /** Council execution / correlation identifier. */
  readonly executionId: string;
  /** Original decision request identifier. */
  readonly requestId: string;
  /** Session correlation identifier when available. */
  readonly sessionId?: string;
  /** Traceability / lineage identifier for audit reconstruction. */
  readonly traceabilityId: string;
  /** Explicit parent reference to the consumed Consensus Package. */
  readonly parentConsensusReference: string;
  /** Reference to execution metadata that informed the decision. */
  readonly executionMetadataReference: string;
};

/**
 * Failure-path traceability (ENG-0007 §6.2.1).
 * Preserves execution lineage without fabricating a completed decision identity.
 */
export type ChairmanFailureTraceability = {
  readonly schemaVersion: "1.0";
  /** Unique identity of this ChairmanFailed publication. */
  readonly failureId: string;
  /** ISO-8601 timestamp when the failure outcome was published. */
  readonly failureTimestamp: string;
  /** Explicit marker: no completed decision package exists. */
  readonly decisionAbsent: true;
  readonly chairmanSpecificationVersion: string;
  readonly governingEngineeringSpecification: "ENG-0007";
  readonly governingEngineeringSpecificationVersion: string;
  readonly implementationBaseline: string;
  readonly executionId: string;
  readonly requestId?: string;
  readonly sessionId?: string;
  readonly consensusPackageId?: string;
  readonly consensusSchemaVersion?: string;
  readonly traceabilityId: string;
  readonly parentConsensusReference?: string;
  readonly executionMetadataReference?: string;
};

/**
 * WP-05A contract / execution failure taxonomy (not the full WP-05E reason catalog).
 */
export type ChairmanFailureReasonCode =
  | "MISSING_CONSENSUS_PACKAGE"
  | "INVALID_CONSENSUS_PACKAGE_SCHEMA"
  | "MISSING_EXECUTION_METADATA"
  | "INVALID_IDENTIFIERS"
  | "INVALID_CHAIRMAN_CONTRACT"
  | "INVALID_DECISION_METADATA"
  | "INVALID_DECISION_CONFIDENCE"
  | "DECISION_POLICY_REJECTED"
  | "INVALID_DECISION_POLICY"
  | "CONFIGURATION_ERROR"
  | "INSUFFICIENT_COUNCIL"
  | "PROVIDER_ERROR"
  | "INVALID_MODEL_OUTPUT"
  | "CONTEXT_BUILD_ERROR"
  | "INTERNAL_ERROR";

export type ChairmanRecommendationType =
  | "proceed"
  | "proceed_with_conditions"
  | "defer"
  | "do_not_proceed"
  | "run_bounded_experiment";

export type ChairmanDisagreement = {
  topic: string;
  positions: string[];
  resolution: string;
};

export type ChairmanTradeoff = {
  tradeoff: string;
  preferredSide: string;
  reason: string;
};

export type ChairmanMinorityView = {
  advisorId?: string;
  position: string;
  whyItMatters: string;
};

export type ChairmanEvidenceRequirement = {
  evidence: string;
  whyNeeded: string;
  owner?: string;
};

export type ChairmanNextAction = {
  action: string;
  owner?: string;
  sequence: number;
  expectedOutcome: string;
};

export type ChairmanResponseContent = {
  executiveSummary: string;
  finalRecommendation: string;
  decisionStatement: string;
  decision: CouncilDecision;
  recommendationType: ChairmanRecommendationType;
  consensus: string[];
  disagreements: ChairmanDisagreement[];
  decisiveTradeoffs: ChairmanTradeoff[];
  assumptions: string[];
  conditions: string[];
  risks: string[];
  unknowns: string[];
  minorityView?: ChairmanMinorityView;
  minimumAdditionalEvidence: ChairmanEvidenceRequirement[];
  nextActions: ChairmanNextAction[];
  reversalCriteria: string[];
  keyArguments: string[];
  confidence: number;
};

/**
 * Confidence Triad (ENG-0007 §10 / WP-05C).
 * Three independent engineering dimensions plus preserved consensus confidence.
 */
export type DecisionConfidence = {
  readonly schemaVersion: "1.0";
  /** Documented derivation method identity. */
  readonly method: "wp05c_structural_min_v1";
  /** Preserved Consensus Package overall confidence (ENG-0006) — not overwritten. */
  readonly consensusConfidence: number;
  /** Evidence quality / coverage (independent of recommendation trust). */
  readonly evidenceConfidence: number;
  /** Internal coherence of Chairman reasoning, capped by evidence. */
  readonly reasoningConfidence: number;
  /** Published recommendation trust — derived, not independently invented. */
  readonly recommendationConfidence: number;
  readonly notes: readonly string[];
};

/**
 * Explicit uncertainty communication (ENG-0007 §11 / WP-05C).
 * Uncertainty must never be hidden on successful publication.
 */
export type DecisionUncertainty = {
  readonly schemaVersion: "1.0";
  /** True when material uncertainty indicators are present. */
  readonly material: boolean;
  readonly evidenceGaps: readonly string[];
  readonly unresolvedDisagreement: readonly string[];
  readonly conflictingAdvisors: readonly string[];
  readonly assumptionsMade: readonly string[];
  readonly informationLimitations: readonly string[];
  readonly whatIsKnown: readonly string[];
  readonly whatIsDisputed: readonly string[];
  readonly whatIsMissing: readonly string[];
  readonly howItConstrainsRecommendation: readonly string[];
  readonly nextStepsToReduceUncertainty: readonly string[];
};

/**
 * Decision Policy evaluation (ENG-0007 §8 / WP-05D).
 * Deterministic governance gate — not LLM reasoning.
 */
export type DecisionPolicyStatus =
  "Approved" | "EscalationRequired" | "Rejected";

export type DecisionPolicyRuleOutcome = "Pass" | "EscalationRequired" | "Fail";

export type DecisionPolicyRuleEvaluation = {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly outcome: DecisionPolicyRuleOutcome;
  readonly explanation: string;
};

export type DecisionPolicyViolationSeverity =
  "critical" | "major" | "escalation";

export type DecisionPolicyViolation = {
  readonly violationId: string;
  readonly ruleId: string;
  readonly severity: DecisionPolicyViolationSeverity;
  readonly message: string;
  readonly governingSpecification: "ENG-0007";
};

export type DecisionPolicyResult = {
  readonly schemaVersion: "1.0";
  readonly status: DecisionPolicyStatus;
  readonly rulesEvaluated: readonly DecisionPolicyRuleEvaluation[];
  readonly violations: readonly DecisionPolicyViolation[];
  readonly evaluationTimestamp: string;
  readonly policyVersion: string;
  readonly evaluator: "chairman-decision-policy-engine";
};

/**
 * Validated Chairman recommendation package (success path only).
 * Recommendation-shaped fields are intentionally absent from failure outcomes.
 * Decision Metadata is mandatory (ENG-0007 §6.2 / WP-05B).
 * Decision Confidence + Uncertainty are mandatory (ENG-0007 §10–11 / WP-05C).
 * Decision Policy evaluation is mandatory (ENG-0007 §8 / WP-05D).
 */
export type ChairmanSuccessResult = {
  status: "success";
  executionId: string;
  /** ENG-0007 Decision Metadata Package — required for successful publication. */
  metadata: DecisionMetadata;
  /** ENG-0007 Confidence Triad — required for successful publication. */
  decisionConfidence: DecisionConfidence;
  /** ENG-0007 Uncertainty Package — required for successful publication. */
  uncertainty: DecisionUncertainty;
  /** ENG-0007 Decision Policy evaluation — required for successful publication. */
  policyEvaluation: DecisionPolicyResult;
  decision: CouncilDecision;
  decisionStatement: string;
  executiveSummary: string;
  finalRecommendation: string;
  rationale: string;
  recommendationType: ChairmanRecommendationType;
  consensus: string[];
  disagreements: string[];
  structuredDisagreements: ChairmanDisagreement[];
  decisiveTradeoffs: ChairmanTradeoff[];
  assumptions: string[];
  conditions: string[];
  risks: string[];
  unknowns: string[];
  minorityView?: ChairmanMinorityView;
  minimumAdditionalEvidence: ChairmanEvidenceRequirement[];
  nextActions: ChairmanNextAction[];
  reversalCriteria: string[];
  keyArguments: string[];
  nextSteps: string[];
  /**
   * Alias of `decisionConfidence.recommendationConfidence` (0–1).
   * Prefer the Confidence Triad for presentation; this field remains for API compat.
   */
  confidence: number;
  model: string;
  durationMs: number;
  totalTokens: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
  missingPerspectives?: string[];
  reducedConfidenceSynthesis?: boolean;
};

/**
 * Explicit Chairman failure package (ENG-0007 §6.3 / §13).
 * Never carries fabricated recommendation content.
 * Failure traceability preserves execution lineage without implying a decision.
 */
export type ChairmanFailedResult = {
  status: "failed";
  outcome: ChairmanFailedOutcome;
  executionId: string;
  /** Failure-path traceability — decisionAbsent is always true. */
  failureTraceability: ChairmanFailureTraceability;
  model: string;
  durationMs: number;
  totalTokens: number;
  promptTokens?: number;
  completionTokens?: number;
  errorMessage: string;
  failureReasonCode: ChairmanFailureReasonCode;
  /** Present when publication was blocked by Decision Policy (diagnostics only). */
  policyEvaluation?: DecisionPolicyResult;
  insufficientCouncil?: boolean;
  missingPerspectives?: string[];
};

export type ChairmanResult = ChairmanSuccessResult | ChairmanFailedResult;

export function isChairmanFailed(
  chairman: ChairmanResult | undefined,
): chairman is ChairmanFailedResult {
  return chairman?.status === "failed";
}

export function isChairmanSuccess(
  chairman: ChairmanResult | undefined,
): chairman is ChairmanSuccessResult {
  return chairman?.status === "success";
}

export type CouncilResult = {
  decision: Decision;
  decisionContext: DecisionContext;
  integrity: CouncilIntegrityDiagnostics;
  status: CouncilSessionStatus;
  advisors: AdvisorResult[];
  /** Deterministic consensus package (ENG-0006 / WP-04). */
  consensus?: ConsensusPackage;
  chairman?: ChairmanResult;
  advisorStageDurationMs: number;
  chairmanDurationMs: number;
  /** Consensus stage wall time (ms); 0 when consensus was skipped. */
  consensusDurationMs?: number;
  totalDurationMs: number;
  pkosRetrieval?: EvidencePackage;
};

export type CouncilFormErrors = {
  title?: string;
  question?: string;
};
