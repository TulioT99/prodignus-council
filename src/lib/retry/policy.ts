import { DEFAULT_RUNTIME_CONFIG } from "@/config/defaults";
import { getRuntimeConfig } from "@/config/runtime";
import type {
  RetryDecisionInput,
  RetryFailureCategory,
  RetryPolicyDefaults,
} from "@/lib/retry/types";

/**
 * Default bounded retry budget (derived from DEFAULT_RUNTIME_CONFIG).
 * Prefer getRuntimeConfig().retry at runtime; this export remains for tests/docs.
 */
export const DEFAULT_RETRY_POLICY: RetryPolicyDefaults = {
  maxAttempts: DEFAULT_RUNTIME_CONFIG.retry.maxAttempts,
};

/** Explicit alias: retries after the first attempt under the default policy. */
export const DEFAULT_MAX_RETRIES = DEFAULT_RETRY_POLICY.maxAttempts - 1;

function resolveRetryConfig() {
  return getRuntimeConfig().retry;
}

export function isRetryEligible(category: RetryFailureCategory): boolean {
  const retry = resolveRetryConfig();
  if (!retry.enabled) {
    return false;
  }

  return retry.retryableCategories.includes(category);
}

/**
 * Whether another attempt should run after a failure on `attemptIndex`.
 * Fail-closed: returns false when the category is ineligible or the attempt
 * budget would be exceeded.
 */
export function shouldRetryAttempt(input: RetryDecisionInput): boolean {
  const retry = resolveRetryConfig();
  const maxAttempts = input.maxAttempts ?? retry.maxAttempts;

  if (!retry.enabled) {
    return false;
  }

  if (maxAttempts < 1) {
    return false;
  }

  if (!isRetryEligible(input.category)) {
    return false;
  }

  return input.attemptIndex + 1 < maxAttempts;
}

/**
 * Delay before the next attempt.
 * Uses configured base delay, exponential multiplier, and max delay.
 * Default baseDelayMs = 0 preserves historical immediate retries (AR-002 surface).
 * Category is accepted so rate_limited can diverge later without remapping (AR-003).
 */
export function getRetryDelayMs(
  attemptIndex: number,
  category: RetryFailureCategory,
): number {
  void category;
  const retry = resolveRetryConfig();

  if (retry.baseDelayMs <= 0) {
    return 0;
  }

  const factor = retry.backoffMultiplier ** Math.max(0, attemptIndex);
  const computed = Math.floor(retry.baseDelayMs * factor);
  return Math.min(computed, retry.maxDelayMs);
}

export function resolveMaxAttempts(override?: number): number {
  if (
    typeof override === "number" &&
    Number.isFinite(override) &&
    override >= 1
  ) {
    return Math.floor(override);
  }

  return resolveRetryConfig().maxAttempts;
}
