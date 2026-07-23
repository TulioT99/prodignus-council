export type PKOSRetrievalStatus =
  | "complete"
  | "partial"
  | "insufficient"
  | "failed";

export type RetrievalWarningCode =
  | "PKOS_UNAVAILABLE"
  | "NO_ELIGIBLE_ARTIFACTS"
  | "PARSING_WARNING"
  | "DRAFT_EVIDENCE"
  | "PROPOSED_EVIDENCE"
  | "CONFLICTING_VERSIONS"
  | "DUPLICATE_IDENTIFIER"
  | "NAVIGATION_ONLY"
  | "EXCERPT_TRUNCATED";

export type RetrievalWarning = {
  readonly code: RetrievalWarningCode;
  readonly message: string;
  readonly artifactId?: string;
  readonly path?: string;
};

export type PKOSArtifact = {
  readonly id: string;
  readonly title: string;
  readonly family: string;
  readonly status?: string;
  readonly version?: string;
  readonly path: string;
  readonly related?: readonly string[];
  readonly tags?: readonly string[];
  readonly content: string;
  readonly isNavigationOnly: boolean;
  readonly parsingWarnings: readonly string[];
};

export type RankedArtifact = {
  readonly artifact: PKOSArtifact;
  readonly relevanceScore: number;
  readonly relevanceReasons: readonly string[];
};

export type EvidenceSource = {
  readonly artifactId: string;
  readonly title: string;
  readonly family: string;
  readonly status?: string;
  readonly version?: string;
  readonly path: string;
  readonly relevanceScore: number;
  readonly relevanceReasons: readonly string[];
  readonly excerpt: string;
};

export type EvidencePackage = {
  readonly requestSummary: string;
  readonly generatedAt: string;
  readonly sources: readonly EvidenceSource[];
  readonly constraints: readonly string[];
  readonly warnings: readonly RetrievalWarning[];
  readonly retrievalStatus: PKOSRetrievalStatus;
};

export type RequestAnalysis = {
  readonly normalizedText: string;
  readonly keywords: readonly string[];
  readonly documentIds: readonly string[];
  readonly families: readonly string[];
  readonly phrases: readonly string[];
  readonly language: string;
};

export type PKOSRetrievalConfig = {
  readonly repositoryPath: string;
  readonly maxSources: number;
  readonly maxExcerptChars: number;
};
