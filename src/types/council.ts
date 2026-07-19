export type ThinkingLens =
  | "contrarian"
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

export type AdvisorResult = {
  persona: AdvisorPersona;
  status: AdvisorStatus;
  summary: string;
  analysis: string;
  assumptions: string[];
  risks: string[];
  recommendation: CouncilDecision;
  confidence: number;
  durationMs: number;
  totalTokens: number;
};

export type ChairmanResult = {
  decision: CouncilDecision;
  executiveSummary: string;
  areasOfAgreement: string[];
  areasOfDisagreement: string[];
  criticalAssumptions: string[];
  principalRisks: string[];
  upside: string[];
  recommendedActions: string[];
  finalRecommendation: string;
  confidence: number;
};

export type CouncilResult = {
  decision: Decision;
  status: CouncilSessionStatus;
  advisors: AdvisorResult[];
  chairman?: ChairmanResult;
  totalDurationMs: number;
};

export type CouncilFormErrors = {
  title?: string;
  question?: string;
};
