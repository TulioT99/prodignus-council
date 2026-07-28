import "server-only";

import { getRuntimeConfig } from "@/config/runtime";
import type {
  ChairmanFailureReasonCode,
  DecisionFailureDiagnostics,
  DecisionFailureReport,
  FailureCategory,
  FailureRecoveryPolicy,
  FailureSeverity,
  PublicationEligibilityDecision,
} from "@/types/council";

export const FAILURE_MODEL_SCHEMA_VERSION = "1.0" as const;
export const FAILURE_MANAGER_IDENTITY = "council-failure-manager" as const;

export type FailureClock = {
  now(): string;
};

export const systemFailureClock: FailureClock = {
  now: () => new Date().toISOString(),
};

/**
 * Deterministic recovery policy table (WP-05E).
 * Recovery never fabricates missing information.
 */
export const FAILURE_RECOVERY_POLICIES: Readonly<
  Record<FailureCategory, FailureRecoveryPolicy>
> = Object.freeze({
  "FM-001": Object.freeze({
    category: "FM-001",
    description: "Infrastructure failure (provider, network, filesystem)",
    retryable: true,
    maxAttempts: 3,
    fallbackBehavior: "structured_failure",
    publicationEligible: false,
    userVisibleOutcome:
      "Structured failure after infrastructure recovery exhaustion",
    defaultSeverity: "ERROR",
  }),
  "FM-002": Object.freeze({
    category: "FM-002",
    description: "Advisor failure (timeout, invalid response, schema)",
    retryable: true,
    maxAttempts: 3,
    fallbackBehavior: "isolate_and_continue",
    publicationEligible: false,
    userVisibleOutcome:
      "Advisor isolated; council may continue when policy allows",
    defaultSeverity: "WARNING",
  }),
  "FM-003": Object.freeze({
    category: "FM-003",
    description: "Consensus failure (insufficient inputs / cannot compute)",
    retryable: false,
    maxAttempts: 1,
    fallbackBehavior: "structured_failure",
    publicationEligible: false,
    userVisibleOutcome: "Structured consensus failure; no fabricated consensus",
    defaultSeverity: "CRITICAL",
  }),
  "FM-004": Object.freeze({
    category: "FM-004",
    description: "Chairman failure (invalid response, contract, reasoning)",
    retryable: true,
    maxAttempts: 2,
    fallbackBehavior: "structured_failure",
    publicationEligible: false,
    userVisibleOutcome:
      "Structured ChairmanFailed after bounded schema recovery",
    defaultSeverity: "ERROR",
  }),
  "FM-005": Object.freeze({
    category: "FM-005",
    description: "Metadata / traceability generation failure",
    retryable: false,
    maxAttempts: 1,
    fallbackBehavior: "structured_failure",
    publicationEligible: false,
    userVisibleOutcome: "Publication prohibited — metadata incomplete",
    defaultSeverity: "FATAL",
  }),
  "FM-006": Object.freeze({
    category: "FM-006",
    description: "Confidence / uncertainty model failure",
    retryable: false,
    maxAttempts: 1,
    fallbackBehavior: "structured_failure",
    publicationEligible: false,
    userVisibleOutcome: "Publication prohibited — confidence invalid",
    defaultSeverity: "FATAL",
  }),
  "FM-007": Object.freeze({
    category: "FM-007",
    description: "Policy engine unavailable or invalid evaluation",
    retryable: false,
    maxAttempts: 1,
    fallbackBehavior: "structured_failure",
    publicationEligible: false,
    userVisibleOutcome: "Publication prohibited — policy gate failed",
    defaultSeverity: "FATAL",
  }),
  "FM-008": Object.freeze({
    category: "FM-008",
    description: "Publication / serialization / persistence failure",
    retryable: false,
    maxAttempts: 1,
    fallbackBehavior: "structured_failure",
    publicationEligible: false,
    userVisibleOutcome: "Decision not published; execution recorded as failed",
    defaultSeverity: "FATAL",
  }),
});

/**
 * Map WP-05A Chairman reason codes onto the WP-05E failure taxonomy.
 * Deterministic — no heuristics beyond the static table.
 */
export const REASON_CODE_TO_FAILURE_CATEGORY: Readonly<
  Record<ChairmanFailureReasonCode, FailureCategory>
> = Object.freeze({
  MISSING_CONSENSUS_PACKAGE: "FM-003",
  INVALID_CONSENSUS_PACKAGE_SCHEMA: "FM-003",
  INSUFFICIENT_COUNCIL: "FM-003",
  MISSING_EXECUTION_METADATA: "FM-004",
  INVALID_IDENTIFIERS: "FM-004",
  INVALID_CHAIRMAN_CONTRACT: "FM-004",
  CONTEXT_BUILD_ERROR: "FM-004",
  INVALID_MODEL_OUTPUT: "FM-004",
  CONFIGURATION_ERROR: "FM-001",
  PROVIDER_ERROR: "FM-001",
  INVALID_DECISION_METADATA: "FM-005",
  INVALID_DECISION_CONFIDENCE: "FM-006",
  DECISION_POLICY_REJECTED: "FM-007",
  INVALID_DECISION_POLICY: "FM-007",
  INTERNAL_ERROR: "FM-008",
});

export const REASON_CODE_TO_COMPONENT: Readonly<
  Record<ChairmanFailureReasonCode, string>
> = Object.freeze({
  MISSING_CONSENSUS_PACKAGE: "consensus-engine",
  INVALID_CONSENSUS_PACKAGE_SCHEMA: "consensus-engine",
  INSUFFICIENT_COUNCIL: "consensus-participation",
  MISSING_EXECUTION_METADATA: "chairman-contract",
  INVALID_IDENTIFIERS: "chairman-contract",
  INVALID_CHAIRMAN_CONTRACT: "chairman-contract",
  CONTEXT_BUILD_ERROR: "chairman-context-builder",
  INVALID_MODEL_OUTPUT: "chairman-response-parser",
  CONFIGURATION_ERROR: "runtime-configuration",
  PROVIDER_ERROR: "openrouter-provider",
  INVALID_DECISION_METADATA: "decision-metadata",
  INVALID_DECISION_CONFIDENCE: "decision-confidence",
  DECISION_POLICY_REJECTED: "decision-policy-engine",
  INVALID_DECISION_POLICY: "decision-policy-engine",
  INTERNAL_ERROR: "publication",
});

export function getRecoveryPolicy(
  category: FailureCategory,
): FailureRecoveryPolicy {
  return FAILURE_RECOVERY_POLICIES[category];
}

/**
 * Resolve infrastructure retry budget from runtime config while keeping the
 * taxonomy table as the authoritative category definition.
 */
export function resolveInfrastructureMaxAttempts(): number {
  const configured = getRuntimeConfig().retry.maxAttempts;
  return Math.max(1, configured);
}

export function classifyFailureFromReasonCode(
  failureReasonCode: ChairmanFailureReasonCode,
): {
  readonly category: FailureCategory;
  readonly severity: FailureSeverity;
  readonly component: string;
  readonly policy: FailureRecoveryPolicy;
} {
  const category = REASON_CODE_TO_FAILURE_CATEGORY[failureReasonCode];
  const policy = getRecoveryPolicy(category);
  const severity = resolveSeverity(category, failureReasonCode, policy);
  return {
    category,
    severity,
    component: REASON_CODE_TO_COMPONENT[failureReasonCode],
    policy,
  };
}

function resolveSeverity(
  category: FailureCategory,
  failureReasonCode: ChairmanFailureReasonCode,
  policy: FailureRecoveryPolicy,
): FailureSeverity {
  if (failureReasonCode === "CONFIGURATION_ERROR") {
    return "FATAL";
  }

  if (failureReasonCode === "DECISION_POLICY_REJECTED") {
    return "CRITICAL";
  }

  if (category === "FM-002") {
    return "WARNING";
  }

  return policy.defaultSeverity;
}

export type BuildDecisionFailureReportInput = {
  readonly executionId: string;
  readonly failureReasonCode: ChairmanFailureReasonCode;
  readonly message: string;
  readonly recoveryAttempted?: boolean;
  readonly recoverySucceeded?: boolean;
  readonly retryCount?: number;
  readonly recoveryActions?: readonly string[];
  readonly durationMs?: number;
  readonly relatedMetadata?: {
    readonly failureId?: string;
    readonly consensusPackageId?: string;
    readonly requestId?: string;
    readonly sessionId?: string;
  };
  readonly clock?: FailureClock;
  /** Override category when classifying non-reason-code events (tests / FM-002). */
  readonly categoryOverride?: FailureCategory;
  readonly componentOverride?: string;
  readonly severityOverride?: FailureSeverity;
};

/**
 * Build a structured DecisionFailureReport. Always sets publicationAllowed=false
 * for terminal failure artifacts (no silent publication).
 */
export function buildDecisionFailureReport(
  input: BuildDecisionFailureReportInput,
): DecisionFailureReport {
  const classified = classifyFailureFromReasonCode(input.failureReasonCode);
  const category = input.categoryOverride ?? classified.category;
  const policy = getRecoveryPolicy(category);
  const severity = input.severityOverride ?? classified.severity;
  const component = input.componentOverride ?? classified.component;
  const clock = input.clock ?? systemFailureClock;
  const retryCount = Math.max(0, input.retryCount ?? 0);
  const recoveryAttempted = input.recoveryAttempted ?? retryCount > 0;
  const recoverySucceeded = input.recoverySucceeded === true;

  const diagnostics: DecisionFailureDiagnostics = {
    message: input.message,
    failureReasonCode: input.failureReasonCode,
    recoveryActions: Object.freeze([...(input.recoveryActions ?? [])]),
    durationMs: input.durationMs,
    failedComponent: component,
    terminalStatus: "failed",
  };

  return {
    schemaVersion: FAILURE_MODEL_SCHEMA_VERSION,
    executionId: input.executionId,
    timestamp: clock.now(),
    failureCategory: category,
    severity,
    component,
    recoveryAttempted,
    recoverySucceeded,
    retryCount,
    publicationAllowed: false,
    diagnostics,
    relatedMetadata: {
      failureId: input.relatedMetadata?.failureId,
      consensusPackageId: input.relatedMetadata?.consensusPackageId,
      requestId: input.relatedMetadata?.requestId,
      sessionId: input.relatedMetadata?.sessionId,
      governingSpecification: "ENG-0007",
      failureManager: FAILURE_MANAGER_IDENTITY,
      recoveryPolicyCategory: category,
      recoveryFallback: policy.fallbackBehavior,
    },
  };
}

export type PublicationGateInput =
  | {
      readonly kind: "success_candidate";
      readonly executionId: string;
      readonly hasMetadata: boolean;
      readonly hasConfidence: boolean;
      readonly hasUncertainty: boolean;
      readonly hasPolicyEvaluation: boolean;
      readonly policyStatus: "Approved" | "EscalationRequired" | "Rejected";
    }
  | {
      readonly kind: "failure_candidate";
      readonly failureReport: DecisionFailureReport;
    }
  | {
      readonly kind: "publication_artifact";
      readonly executionId: string;
      readonly serialize: () => string;
    };

/**
 * Final operational gate before publication (WP-05E Failure Evaluation).
 * Never fabricates a decision; never allows publication on failure artifacts.
 */
export function evaluatePublicationGate(
  input: PublicationGateInput,
): PublicationEligibilityDecision {
  if (input.kind === "failure_candidate") {
    return {
      publicationAllowed: false,
      reason: "Terminal failure artifact — publication prohibited",
      failureCategory: input.failureReport.failureCategory,
      severity: input.failureReport.severity,
    };
  }

  if (input.kind === "publication_artifact") {
    try {
      const serialized = input.serialize();
      if (!serialized || serialized === "null" || serialized === "undefined") {
        return {
          publicationAllowed: false,
          reason: "Publication serialization produced an empty artifact",
          failureCategory: "FM-008",
          severity: "FATAL",
        };
      }

      return {
        publicationAllowed: true,
        reason: "Publication artifact serialized successfully",
      };
    } catch (error) {
      return {
        publicationAllowed: false,
        reason:
          error instanceof Error
            ? error.message
            : "Publication serialization failed",
        failureCategory: "FM-008",
        severity: "FATAL",
      };
    }
  }

  if (input.policyStatus === "Rejected") {
    return {
      publicationAllowed: false,
      reason: "Decision Policy Rejected — publication prohibited",
      failureCategory: "FM-007",
      severity: "CRITICAL",
    };
  }

  const missing: string[] = [];
  if (!input.hasMetadata) missing.push("metadata");
  if (!input.hasConfidence) missing.push("confidence");
  if (!input.hasUncertainty) missing.push("uncertainty");
  if (!input.hasPolicyEvaluation) missing.push("policyEvaluation");

  if (missing.length > 0) {
    const category: FailureCategory = missing.includes("metadata")
      ? "FM-005"
      : missing.includes("confidence") || missing.includes("uncertainty")
        ? "FM-006"
        : "FM-007";

    return {
      publicationAllowed: false,
      reason: `Missing required publication artifacts: ${missing.join(", ")}`,
      failureCategory: category,
      severity: "FATAL",
    };
  }

  return {
    publicationAllowed: true,
    reason: "Failure evaluation passed — publication eligible",
  };
}

export type BoundedRecoveryAttemptResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly attempts: number;
      readonly recoveryAttempted: boolean;
      readonly recoverySucceeded: boolean;
      readonly recoveryActions: readonly string[];
    }
  | {
      readonly ok: false;
      readonly error: unknown;
      readonly attempts: number;
      readonly recoveryAttempted: boolean;
      readonly recoverySucceeded: false;
      readonly recoveryActions: readonly string[];
    };

/**
 * Deterministic bounded recovery loop. Stops when the attempt succeeds,
 * the category is non-retryable, or maxAttempts is exhausted.
 */
export async function runWithBoundedRecovery<T>(
  category: FailureCategory,
  attemptFn: (attemptIndex: number) => Promise<T>,
  options: {
    readonly maxAttempts?: number;
    readonly isRetryableError?: (
      error: unknown,
      attemptIndex: number,
    ) => boolean;
    readonly onRetry?: (error: unknown, attemptIndex: number) => void;
  } = {},
): Promise<BoundedRecoveryAttemptResult<T>> {
  const policy = getRecoveryPolicy(category);
  const maxAttempts = Math.max(
    1,
    options.maxAttempts ??
      (category === "FM-001"
        ? resolveInfrastructureMaxAttempts()
        : policy.maxAttempts),
  );
  const recoveryActions: string[] = [];
  let lastError: unknown;

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    try {
      const value = await attemptFn(attemptIndex);
      return {
        ok: true,
        value,
        attempts: attemptIndex + 1,
        recoveryAttempted: attemptIndex > 0,
        recoverySucceeded: attemptIndex > 0,
        recoveryActions: Object.freeze([...recoveryActions]),
      };
    } catch (error) {
      lastError = error;
      const canRetry =
        policy.retryable &&
        attemptIndex + 1 < maxAttempts &&
        (options.isRetryableError
          ? options.isRetryableError(error, attemptIndex)
          : true);

      if (!canRetry) {
        break;
      }

      recoveryActions.push(
        `retry:${category}:attempt_${attemptIndex + 1}_of_${maxAttempts}`,
      );
      options.onRetry?.(error, attemptIndex);
    }
  }

  return {
    ok: false,
    error: lastError,
    attempts: recoveryActions.length + 1,
    recoveryAttempted: recoveryActions.length > 0,
    recoverySucceeded: false,
    recoveryActions: Object.freeze([...recoveryActions]),
  };
}

/**
 * Classify an isolated advisor failure for observability (FM-002).
 * Does not alter advisor reasoning — diagnostic only.
 */
export function classifyAdvisorFailure(input: {
  readonly executionId: string;
  readonly advisorId: string;
  readonly message: string;
  readonly retryCount?: number;
  readonly clock?: FailureClock;
}): DecisionFailureReport {
  const policy = getRecoveryPolicy("FM-002");
  const clock = input.clock ?? systemFailureClock;
  const retryCount = Math.max(0, input.retryCount ?? 0);

  return {
    schemaVersion: FAILURE_MODEL_SCHEMA_VERSION,
    executionId: input.executionId,
    timestamp: clock.now(),
    failureCategory: "FM-002",
    severity: policy.defaultSeverity,
    component: `advisor:${input.advisorId}`,
    recoveryAttempted: retryCount > 0,
    recoverySucceeded: false,
    retryCount,
    publicationAllowed: false,
    diagnostics: {
      message: input.message,
      recoveryActions: Object.freeze(
        retryCount > 0
          ? [`advisor_provider_retries:${retryCount}`]
          : ([] as string[]),
      ),
      failedComponent: `advisor:${input.advisorId}`,
      terminalStatus: "isolated",
    },
    relatedMetadata: {
      governingSpecification: "ENG-0007",
      failureManager: FAILURE_MANAGER_IDENTITY,
      recoveryPolicyCategory: "FM-002",
      recoveryFallback: policy.fallbackBehavior,
    },
  };
}

export function validateDecisionFailureReport(
  report: DecisionFailureReport | null | undefined,
): { ok: true } | { ok: false; message: string } {
  if (!report) {
    return { ok: false, message: "DecisionFailureReport is required." };
  }

  if (report.schemaVersion !== FAILURE_MODEL_SCHEMA_VERSION) {
    return { ok: false, message: "Unsupported DecisionFailureReport schema." };
  }

  if (!report.executionId?.trim()) {
    return { ok: false, message: "executionId is required." };
  }

  if (report.publicationAllowed !== false) {
    return {
      ok: false,
      message:
        "Terminal DecisionFailureReport must set publicationAllowed=false.",
    };
  }

  if (!FAILURE_RECOVERY_POLICIES[report.failureCategory]) {
    return { ok: false, message: "Unknown failureCategory." };
  }

  return { ok: true };
}
