import path from "node:path";

import { buildPublicationValidationResult } from "./result.ts";
import { INITIAL_PUBLICATION_RULES } from "./rules.ts";
import type {
  PublicationRuleDefinition,
  PublicationValidationResult,
  PublicationValidatorOptions,
} from "./types.ts";

export type RunPublicationValidatorInput = PublicationValidatorOptions & {
  readonly rules?: readonly PublicationRuleDefinition[];
};

/**
 * Execute the Publication Integrity Validator (OPS-0003).
 * Returns a machine-readable result. Overall FAIL must block publication.
 */
export async function runPublicationValidator(
  input: RunPublicationValidatorInput,
): Promise<PublicationValidationResult> {
  const clock = input.clock ?? { now: () => new Date().toISOString() };
  const gitHead = (await input.git.revParseHead()).trim();
  const rules = (input.rules ?? INITIAL_PUBLICATION_RULES).filter((rule) => {
    if (!input.onlyRuleIds || input.onlyRuleIds.length === 0) {
      return true;
    }
    return input.onlyRuleIds.includes(rule.ruleId);
  });

  const context = {
    ...input,
    gitHead,
    baselineAbsolutePath: path.join(
      input.repositoryRoot,
      input.manifest.baselineDocumentPath,
    ),
    predecessorAbsolutePath: path.join(
      input.repositoryRoot,
      input.manifest.predecessorBaselinePath,
    ),
  };

  const ruleResults = [];
  for (const rule of rules) {
    ruleResults.push(await rule.evaluate(context));
  }

  return buildPublicationValidationResult({
    repository:
      input.manifest.repositoryName ?? path.basename(input.repositoryRoot),
    publicationType: input.manifest.publicationType,
    gitHead,
    executionTimestamp: clock.now(),
    ruleResults,
  });
}

export function publicationMayProceed(
  result: PublicationValidationResult,
): boolean {
  return result.overallStatus === "PASS";
}
