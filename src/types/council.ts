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
 * WP-05A contract / execution failure taxonomy (not the full WP-05E reason catalog).
 */
export type ChairmanFailureReasonCode =
  | "MISSING_CONSENSUS_PACKAGE"
  | "INVALID_CONSENSUS_PACKAGE_SCHEMA"
  | "MISSING_EXECUTION_METADATA"
  | "INVALID_IDENTIFIERS"
  | "INVALID_CHAIRMAN_CONTRACT"
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
 * Validated Chairman recommendation package (success path only).
 * Recommendation-shaped fields are intentionally absent from failure outcomes.
 */
export type ChairmanSuccessResult = {
  status: "success";
  executionId: string;
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
 */
export type ChairmanFailedResult = {
  status: "failed";
  outcome: ChairmanFailedOutcome;
  executionId: string;
  model: string;
  durationMs: number;
  totalTokens: number;
  promptTokens?: number;
  completionTokens?: number;
  errorMessage: string;
  failureReasonCode: ChairmanFailureReasonCode;
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
