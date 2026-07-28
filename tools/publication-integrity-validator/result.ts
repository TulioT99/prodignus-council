import type {
  OverallStatus,
  PublicationRuleResult,
  PublicationValidationResult,
  PublicationType,
} from "./types.ts";
import { PUBLICATION_VALIDATOR_VERSION } from "./types.ts";

export function aggregateOverallStatus(
  results: readonly PublicationRuleResult[],
): OverallStatus {
  if (results.some((result) => result.status === "FAIL")) {
    return "FAIL";
  }

  if (results.some((result) => result.status === "WARNING")) {
    return "PASS WITH WARNINGS";
  }

  return "PASS";
}

export function buildPublicationValidationResult(input: {
  repository: string;
  publicationType: PublicationType;
  gitHead: string;
  executionTimestamp: string;
  ruleResults: readonly PublicationRuleResult[];
}): PublicationValidationResult {
  const warnings = input.ruleResults.filter(
    (result) => result.status === "WARNING",
  );
  const failures = input.ruleResults.filter(
    (result) => result.status === "FAIL",
  );

  return Object.freeze({
    validatorVersion: PUBLICATION_VALIDATOR_VERSION,
    executionTimestamp: input.executionTimestamp,
    repository: input.repository,
    publicationType: input.publicationType,
    gitHead: input.gitHead,
    ruleResults: Object.freeze([...input.ruleResults]),
    warnings: Object.freeze(warnings),
    failures: Object.freeze(failures),
    overallStatus: aggregateOverallStatus(input.ruleResults),
  });
}

export function pass(
  ruleId: string,
  ruleName: string,
  message: string,
  evidence: readonly string[] = [],
): PublicationRuleResult {
  return Object.freeze({
    ruleId,
    ruleName,
    status: "PASS",
    message,
    evidence: Object.freeze([...evidence]),
  });
}

export function warn(
  ruleId: string,
  ruleName: string,
  message: string,
  evidence: readonly string[] = [],
): PublicationRuleResult {
  return Object.freeze({
    ruleId,
    ruleName,
    status: "WARNING",
    message,
    evidence: Object.freeze([...evidence]),
  });
}

export function fail(
  ruleId: string,
  ruleName: string,
  message: string,
  evidence: readonly string[] = [],
): PublicationRuleResult {
  return Object.freeze({
    ruleId,
    ruleName,
    status: "FAIL",
    message,
    evidence: Object.freeze([...evidence]),
  });
}
