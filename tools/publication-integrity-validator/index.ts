export { PUBLICATION_VALIDATOR_VERSION } from "./types.ts";
export type {
  OverallStatus,
  PublicationManifest,
  PublicationRuleDefinition,
  PublicationRuleResult,
  PublicationType,
  PublicationValidationResult,
  PublicationValidatorOptions,
  RuleStatus,
} from "./types.ts";
export { INITIAL_PUBLICATION_RULES } from "./rules.ts";
export { publicationMayProceed, runPublicationValidator } from "./validator.ts";
export {
  createNodeCommandRunner,
  createNodeGitAdapter,
  pathExists,
  readTextFile,
  resolveRepositoryRoot,
} from "./adapters.ts";
export {
  aggregateOverallStatus,
  buildPublicationValidationResult,
} from "./result.ts";
export {
  extractCommitHashFromBaseline,
  hashesMatch,
  pathIsAllowed,
} from "./helpers.ts";
