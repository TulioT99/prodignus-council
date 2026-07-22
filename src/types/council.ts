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

export type DecisionStatus =
  | "draft"
  | "under_review"
  | "decided"
  | "archived";

export type CouncilSessionStatus = "complete" | "partial" | "failed";

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
  ok: true;
  result: CouncilResult;
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

export type ChairmanResult = {
  status: ChairmanStatus;
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
  insufficientCouncil?: boolean;
  missingPerspectives?: string[];
  reducedConfidenceSynthesis?: boolean;
  errorMessage?: string;
};

export type CouncilResult = {
  decision: Decision;
  decisionContext: DecisionContext;
  integrity: CouncilIntegrityDiagnostics;
  status: CouncilSessionStatus;
  advisors: AdvisorResult[];
  chairman?: ChairmanResult;
  advisorStageDurationMs: number;
  chairmanDurationMs: number;
  totalDurationMs: number;
};

export type CouncilFormErrors = {
  title?: string;
  question?: string;
};
