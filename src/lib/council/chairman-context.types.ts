import "server-only";

import type { EvidencePackage } from "@/types/pkos";
import type {
  AdvisorResult,
  DecisionContext,
  DecisionContextAttachment,
  DecisionStatus,
  AdvisorSource,
  AdvisorStatus,
  ThinkingLens,
} from "@/types/council";

export interface ChairmanContextBuildInput {
  readonly decisionContext: DecisionContext;
  readonly advisors: readonly AdvisorResult[];
}

export interface ChairmanRequestContext {
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
  readonly pkosEvidence?: EvidencePackage;
}

export interface ChairmanAdvisorExecutionMetadata {
  readonly status: AdvisorStatus;
  readonly source: AdvisorSource;
  readonly executionId: string;
  readonly durationMs: number;
  readonly totalTokens: number;
  readonly configuredModel: string;
  readonly errorMessage?: string;
}

export interface ChairmanAdvisorContext {
  readonly advisorId: string;
  readonly advisorName: string;
  readonly thinkingLens: ThinkingLens;
  readonly result: Readonly<AdvisorResult>;
  readonly execution: ChairmanAdvisorExecutionMetadata;
}

export interface ChairmanExecutionMetadata {
  readonly executionId: string;
  readonly decisionId: string;
  readonly advisorCount: number;
  readonly createdAt: string;
  readonly contextBuiltAt: string;
  readonly pipelineVersion: string;
  readonly language: string;
}

export interface CollectiveIntelligenceContext {
  readonly consensus?: unknown;
  readonly conflicts?: unknown;
  readonly evidence?: unknown;
  readonly confidence?: unknown;
  readonly openQuestions?: unknown;
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export interface ChairmanContext {
  readonly schemaVersion: "1.0";
  readonly request: ChairmanRequestContext;
  readonly advisors: readonly ChairmanAdvisorContext[];
  readonly metadata: ChairmanExecutionMetadata;
  readonly collectiveIntelligence: CollectiveIntelligenceContext;
}

export interface ChairmanContextBuilder {
  build(input: ChairmanContextBuildInput): ChairmanContext;
}

export interface Clock {
  now(): string;
}

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};
