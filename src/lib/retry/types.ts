/**
 * Provider-neutral retry failure categories.
 * Adapters translate provider/transport failures into these categories;
 * the policy module decides eligibility without provider types.
 */
export type RetryFailureCategory =
  | "timeout"
  | "rate_limited"
  | "transient"
  | "invalid_response"
  | "configuration"
  | "permanent";

export type RetryPolicyDefaults = {
  /**
   * Maximum number of attempts per request, including the initial try.
   * Example: maxAttempts = 3 means 1 initial attempt + up to 2 retries.
   */
  readonly maxAttempts: number;
};

export type RetryDecisionInput = {
  readonly category: RetryFailureCategory;
  /** Zero-based index of the attempt that just failed (0 = first attempt). */
  readonly attemptIndex: number;
  readonly maxAttempts?: number;
};
