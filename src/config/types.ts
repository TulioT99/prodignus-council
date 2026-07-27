import type { RetryFailureCategory } from "@/lib/retry/types";

export type AdvisorId =
  | "ADV-001"
  | "ADV-002"
  | "ADV-003"
  | "ADV-004"
  | "ADV-005";

export type RetryRuntimeConfig = {
  /** Maximum attempts including the initial try. */
  readonly maxAttempts: number;
  /** Base delay before the first retry (ms). 0 preserves immediate retry. */
  readonly baseDelayMs: number;
  /** Exponential backoff multiplier applied per attempt index. */
  readonly backoffMultiplier: number;
  /** Cap on computed retry delay (ms). */
  readonly maxDelayMs: number;
  /** Categories eligible for retry. */
  readonly retryableCategories: readonly RetryFailureCategory[];
  /** Master switch for provider retries. */
  readonly enabled: boolean;
};

export type TimeoutRuntimeConfig = {
  /** Per-request OpenRouter / advisor provider timeout (ms). */
  readonly advisorTimeoutMs: number;
  /** Per-request OpenRouter / chairman provider timeout (ms). */
  readonly chairmanTimeoutMs: number;
  /**
   * Optional wall-clock budget for an entire council session (ms).
   * 0 disables the wall-clock guard (current behavior).
   */
  readonly overallCouncilTimeoutMs: number;
};

export type AdvisorsRuntimeConfig = {
  readonly enabledAdvisorIds: readonly AdvisorId[];
  readonly executionOrder: readonly AdvisorId[];
  /** Max concurrent advisor executions; default equals advisor count. */
  readonly maxConcurrency: number;
};

export type ChairmanRuntimeConfig = {
  readonly enabled: boolean;
  readonly minimumSuccessfulAdvisors: number;
  readonly completeAdvisorThreshold: number;
  /** Reserved fallback flag — current behavior does not invent advisors. */
  readonly allowInventedAdvisorContent: boolean;
};

export type OpenRouterRuntimeConfig = {
  readonly apiUrl: string;
  readonly defaultTemperature: number;
  /** 0 omits max_tokens from the request (provider default). */
  readonly maxTokens: number;
  readonly httpReferer: string;
  readonly modelEnvVars: {
    readonly chairman: string;
    readonly advisors: Readonly<Record<AdvisorId, string>>;
  };
};

export type FeatureFlagsRuntimeConfig = {
  readonly enableStructuredLogging: boolean;
  readonly enableDetailedTraces: boolean;
  readonly enableProviderDiagnostics: boolean;
  readonly enableRetryMetrics: boolean;
};

export type RuntimeCouncilConfig = {
  readonly retry: RetryRuntimeConfig;
  readonly timeouts: TimeoutRuntimeConfig;
  readonly advisors: AdvisorsRuntimeConfig;
  readonly chairman: ChairmanRuntimeConfig;
  readonly openRouter: OpenRouterRuntimeConfig;
  readonly features: FeatureFlagsRuntimeConfig;
};

export class RuntimeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeConfigError";
  }
}
