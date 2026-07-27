import type { RuntimeCouncilConfig } from "@/config/types";

/**
 * Defaults preserve pre–WP-07 runtime behavior.
 * Operational knobs are overridable via environment variables.
 */
export const DEFAULT_RUNTIME_CONFIG: RuntimeCouncilConfig = {
  retry: {
    maxAttempts: 3,
    baseDelayMs: 0,
    backoffMultiplier: 2,
    maxDelayMs: 30_000,
    retryableCategories: [
      "timeout",
      "rate_limited",
      "transient",
      "invalid_response",
    ],
    enabled: true,
  },
  timeouts: {
    advisorTimeoutMs: 90_000,
    chairmanTimeoutMs: 90_000,
    overallCouncilTimeoutMs: 0,
  },
  advisors: {
    enabledAdvisorIds: [
      "ADV-001",
      "ADV-002",
      "ADV-003",
      "ADV-004",
      "ADV-005",
    ],
    executionOrder: [
      "ADV-001",
      "ADV-002",
      "ADV-003",
      "ADV-004",
      "ADV-005",
    ],
    maxConcurrency: 5,
  },
  chairman: {
    enabled: true,
    minimumSuccessfulAdvisors: 3,
    completeAdvisorThreshold: 4,
    allowInventedAdvisorContent: false,
  },
  openRouter: {
    apiUrl: "https://openrouter.ai/api/v1/chat/completions",
    defaultTemperature: 0.3,
    maxTokens: 0,
    httpReferer: "http://localhost:3000",
    modelEnvVars: {
      chairman: "OPENROUTER_MODEL_CHAIRMAN",
      advisors: {
        "ADV-001": "OPENROUTER_MODEL_CONTRARIAN",
        "ADV-002": "OPENROUTER_MODEL_PRODUCT_STRATEGY",
        "ADV-003": "OPENROUTER_MODEL_UX_ACCESSIBILITY",
        "ADV-004": "OPENROUTER_MODEL_DELIVERY_ENGINEERING",
        "ADV-005": "OPENROUTER_MODEL_HUMAN_IMPACT",
      },
    },
  },
  features: {
    enableStructuredLogging: true,
    enableDetailedTraces: false,
    enableProviderDiagnostics: true,
    enableRetryMetrics: false,
  },
};
