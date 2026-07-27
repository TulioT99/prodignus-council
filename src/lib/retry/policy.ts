import type {
  RetryDecisionInput,
  RetryFailureCategory,
  RetryPolicyDefaults,
} from "@/lib/retry/types";

/**
 * Default bounded retry budget.
 * Preserves prior adapter behavior: 2 retries after the initial attempt ⇒ 3 total attempts.
 */
export const DEFAULT_RETRY_POLICY: RetryPolicyDefaults = {
  maxAttempts: 3,
};

/** Explicit alias: retries after the first attempt under the default policy. */
export const DEFAULT_MAX_RETRIES = DEFAULT_RETRY_POLICY.maxAttempts - 1;

const RETRYABLE_CATEGORIES: ReadonlySet<RetryFailureCategory> = new Set([
  "timeout",
  "rate_limited",
  "transient",
  "invalid_response",
]);

export function isRetryEligible(category: RetryFailureCategory): boolean {
  return RETRYABLE_CATEGORIES.has(category);
}

/**
 * Whether another attempt should run after a failure on `attemptIndex`.
 * Fail-closed: returns false when the category is ineligible or the attempt
 * budget would be exceeded.
 */
export function shouldRetryAttempt(input: RetryDecisionInput): boolean {
  const maxAttempts = input.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts;

  if (maxAttempts < 1) {
    return false;
  }

  if (!isRetryEligible(input.category)) {
    return false;
  }

  return input.attemptIndex + 1 < maxAttempts;
}

/**
 * Delay before the next attempt. Currently immediate (0 ms).
 * Backoff externalization remains WP-07 (NFR-CFG-01); this hook keeps delay
 * decisions in the policy module rather than the provider adapter.
 */
export function getRetryDelayMs(
  attemptIndex: number,
  category: RetryFailureCategory,
): number {
  void attemptIndex;
  void category;
  return 0;
}

export function resolveMaxAttempts(override?: number): number {
  if (
    typeof override === "number" &&
    Number.isFinite(override) &&
    override >= 1
  ) {
    return Math.floor(override);
  }

  return DEFAULT_RETRY_POLICY.maxAttempts;
}
