import { DEFAULT_RUNTIME_CONFIG } from "@/config/defaults";
import {
  readAdvisorIdList,
  readEnvBoolean,
  readEnvNumber,
  readEnvString,
  readRetryableCategories,
} from "@/config/env";
import type {
  AdvisorId,
  RuntimeCouncilConfig,
} from "@/config/types";
import { RuntimeConfigError } from "@/config/types";

const KNOWN_ADVISOR_IDS: ReadonlySet<AdvisorId> = new Set([
  "ADV-001",
  "ADV-002",
  "ADV-003",
  "ADV-004",
  "ADV-005",
]);

function freezeConfig(config: RuntimeCouncilConfig): RuntimeCouncilConfig {
  return Object.freeze({
    retry: Object.freeze({
      ...config.retry,
      retryableCategories: Object.freeze([...config.retry.retryableCategories]),
    }),
    timeouts: Object.freeze({ ...config.timeouts }),
    advisors: Object.freeze({
      enabledAdvisorIds: Object.freeze([...config.advisors.enabledAdvisorIds]),
      executionOrder: Object.freeze([...config.advisors.executionOrder]),
      maxConcurrency: config.advisors.maxConcurrency,
    }),
    chairman: Object.freeze({ ...config.chairman }),
    openRouter: Object.freeze({
      ...config.openRouter,
      modelEnvVars: Object.freeze({
        chairman: config.openRouter.modelEnvVars.chairman,
        advisors: Object.freeze({ ...config.openRouter.modelEnvVars.advisors }),
      }),
    }),
    features: Object.freeze({ ...config.features }),
  });
}

function parseAdvisorIds(
  values: readonly string[],
  fieldName: string,
): AdvisorId[] {
  const ids: AdvisorId[] = [];

  for (const value of values) {
    if (!KNOWN_ADVISOR_IDS.has(value as AdvisorId)) {
      throw new RuntimeConfigError(
        `Unknown advisor id "${value}" in ${fieldName}.`,
      );
    }
    ids.push(value as AdvisorId);
  }

  return ids;
}

function validateConfig(config: RuntimeCouncilConfig): void {
  if (config.retry.maxAttempts < 1) {
    throw new RuntimeConfigError("retry.maxAttempts must be >= 1.");
  }

  if (config.retry.baseDelayMs < 0 || config.retry.maxDelayMs < 0) {
    throw new RuntimeConfigError("retry delays must be >= 0.");
  }

  if (config.retry.backoffMultiplier < 1) {
    throw new RuntimeConfigError("retry.backoffMultiplier must be >= 1.");
  }

  if (config.timeouts.advisorTimeoutMs <= 0) {
    throw new RuntimeConfigError("timeouts.advisorTimeoutMs must be > 0.");
  }

  if (config.timeouts.chairmanTimeoutMs <= 0) {
    throw new RuntimeConfigError("timeouts.chairmanTimeoutMs must be > 0.");
  }

  if (config.timeouts.overallCouncilTimeoutMs < 0) {
    throw new RuntimeConfigError(
      "timeouts.overallCouncilTimeoutMs must be >= 0 (0 disables).",
    );
  }

  if (config.advisors.enabledAdvisorIds.length === 0) {
    throw new RuntimeConfigError("advisors.enabledAdvisorIds must not be empty.");
  }

  if (config.advisors.executionOrder.length === 0) {
    throw new RuntimeConfigError("advisors.executionOrder must not be empty.");
  }

  for (const advisorId of config.advisors.enabledAdvisorIds) {
    if (!config.advisors.executionOrder.includes(advisorId)) {
      throw new RuntimeConfigError(
        `Enabled advisor ${advisorId} is missing from executionOrder.`,
      );
    }
  }

  if (config.advisors.maxConcurrency < 1) {
    throw new RuntimeConfigError("advisors.maxConcurrency must be >= 1.");
  }

  if (config.chairman.minimumSuccessfulAdvisors < 1) {
    throw new RuntimeConfigError(
      "chairman.minimumSuccessfulAdvisors must be >= 1.",
    );
  }

  if (
    config.chairman.completeAdvisorThreshold <
    config.chairman.minimumSuccessfulAdvisors
  ) {
    throw new RuntimeConfigError(
      "chairman.completeAdvisorThreshold must be >= minimumSuccessfulAdvisors.",
    );
  }

  if (
    config.openRouter.defaultTemperature < 0 ||
    config.openRouter.defaultTemperature > 2
  ) {
    throw new RuntimeConfigError(
      "openRouter.defaultTemperature must be between 0 and 2.",
    );
  }
}

/**
 * Load and validate runtime configuration from process environment.
 * Defaults preserve current Decision Council operational behavior.
 */
export function loadRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeCouncilConfig {
  const defaults = DEFAULT_RUNTIME_CONFIG;

  const enabledAdvisorIds = parseAdvisorIds(
    readAdvisorIdList(
      env,
      "COUNCIL_ENABLED_ADVISORS",
      defaults.advisors.enabledAdvisorIds,
    ),
    "COUNCIL_ENABLED_ADVISORS",
  );

  const executionOrder = parseAdvisorIds(
    readAdvisorIdList(
      env,
      "COUNCIL_ADVISOR_EXECUTION_ORDER",
      defaults.advisors.executionOrder,
    ),
    "COUNCIL_ADVISOR_EXECUTION_ORDER",
  );

  const config: RuntimeCouncilConfig = {
    retry: {
      maxAttempts: readEnvNumber(env, "COUNCIL_RETRY_MAX_ATTEMPTS", defaults.retry.maxAttempts, {
        min: 1,
        integer: true,
      }),
      baseDelayMs: readEnvNumber(env, "COUNCIL_RETRY_BASE_DELAY_MS", defaults.retry.baseDelayMs, {
        min: 0,
        integer: true,
      }),
      backoffMultiplier: readEnvNumber(
        env,
        "COUNCIL_RETRY_BACKOFF_MULTIPLIER",
        defaults.retry.backoffMultiplier,
        { min: 1 },
      ),
      maxDelayMs: readEnvNumber(env, "COUNCIL_RETRY_MAX_DELAY_MS", defaults.retry.maxDelayMs, {
        min: 0,
        integer: true,
      }),
      retryableCategories: readRetryableCategories(
        env,
        "COUNCIL_RETRY_CATEGORIES",
        defaults.retry.retryableCategories,
      ),
      enabled: readEnvBoolean(env, "COUNCIL_RETRY_ENABLED", defaults.retry.enabled),
    },
    timeouts: {
      advisorTimeoutMs: readEnvNumber(
        env,
        "COUNCIL_ADVISOR_TIMEOUT_MS",
        readEnvNumber(
          env,
          "OPENROUTER_REQUEST_TIMEOUT_MS",
          defaults.timeouts.advisorTimeoutMs,
          { min: 1, integer: true },
        ),
        { min: 1, integer: true },
      ),
      chairmanTimeoutMs: readEnvNumber(
        env,
        "COUNCIL_CHAIRMAN_TIMEOUT_MS",
        readEnvNumber(
          env,
          "OPENROUTER_REQUEST_TIMEOUT_MS",
          defaults.timeouts.chairmanTimeoutMs,
          { min: 1, integer: true },
        ),
        { min: 1, integer: true },
      ),
      overallCouncilTimeoutMs: readEnvNumber(
        env,
        "COUNCIL_OVERALL_TIMEOUT_MS",
        defaults.timeouts.overallCouncilTimeoutMs,
        { min: 0, integer: true },
      ),
    },
    advisors: {
      enabledAdvisorIds,
      executionOrder,
      maxConcurrency: readEnvNumber(
        env,
        "COUNCIL_ADVISOR_MAX_CONCURRENCY",
        defaults.advisors.maxConcurrency,
        { min: 1, integer: true },
      ),
    },
    chairman: {
      enabled: readEnvBoolean(
        env,
        "COUNCIL_CHAIRMAN_ENABLED",
        defaults.chairman.enabled,
      ),
      minimumSuccessfulAdvisors: readEnvNumber(
        env,
        "COUNCIL_MIN_SUCCESSFUL_ADVISORS",
        defaults.chairman.minimumSuccessfulAdvisors,
        { min: 1, integer: true },
      ),
      completeAdvisorThreshold: readEnvNumber(
        env,
        "COUNCIL_COMPLETE_ADVISOR_THRESHOLD",
        defaults.chairman.completeAdvisorThreshold,
        { min: 1, integer: true },
      ),
      allowInventedAdvisorContent: readEnvBoolean(
        env,
        "COUNCIL_ALLOW_INVENTED_ADVISOR_CONTENT",
        defaults.chairman.allowInventedAdvisorContent,
      ),
    },
    openRouter: {
      apiUrl:
        readEnvString(env, "OPENROUTER_API_URL") ?? defaults.openRouter.apiUrl,
      defaultTemperature: readEnvNumber(
        env,
        "OPENROUTER_DEFAULT_TEMPERATURE",
        defaults.openRouter.defaultTemperature,
        { min: 0, max: 2 },
      ),
      maxTokens: readEnvNumber(
        env,
        "OPENROUTER_MAX_TOKENS",
        defaults.openRouter.maxTokens,
        { min: 0, integer: true },
      ),
      httpReferer:
        readEnvString(env, "OPENROUTER_HTTP_REFERER") ??
        defaults.openRouter.httpReferer,
      modelEnvVars: defaults.openRouter.modelEnvVars,
    },
    features: {
      enableStructuredLogging: readEnvBoolean(
        env,
        "COUNCIL_FEATURE_STRUCTURED_LOGGING",
        defaults.features.enableStructuredLogging,
      ),
      enableDetailedTraces: readEnvBoolean(
        env,
        "COUNCIL_FEATURE_DETAILED_TRACES",
        defaults.features.enableDetailedTraces,
      ),
      enableProviderDiagnostics: readEnvBoolean(
        env,
        "COUNCIL_FEATURE_PROVIDER_DIAGNOSTICS",
        defaults.features.enableProviderDiagnostics,
      ),
      enableRetryMetrics: readEnvBoolean(
        env,
        "COUNCIL_FEATURE_RETRY_METRICS",
        defaults.features.enableRetryMetrics,
      ),
    },
  };

  validateConfig(config);
  return freezeConfig(config);
}
