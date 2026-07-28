/**
 * OPS-0003 — Publication Integrity Validator types.
 * Governance tooling only — not part of the Decision Council runtime.
 */

export const PUBLICATION_VALIDATOR_VERSION = "1.0.0" as const;

export type PublicationType = "WP" | "ENG" | "ARR" | "OPS" | "PKOS";

export type RuleStatus = "PASS" | "WARNING" | "FAIL";

export type OverallStatus = "PASS" | "PASS WITH WARNINGS" | "FAIL";

export type PublicationRuleResult = {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly status: RuleStatus;
  readonly message: string;
  readonly evidence?: readonly string[];
};

export type PublicationValidationResult = {
  readonly validatorVersion: typeof PUBLICATION_VALIDATOR_VERSION;
  readonly executionTimestamp: string;
  readonly repository: string;
  readonly publicationType: PublicationType;
  readonly gitHead: string;
  readonly ruleResults: readonly PublicationRuleResult[];
  readonly warnings: readonly PublicationRuleResult[];
  readonly failures: readonly PublicationRuleResult[];
  readonly overallStatus: OverallStatus;
};

export type CommandResult = {
  readonly ok: boolean;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

export type GitStatusEntry = {
  readonly path: string;
  /** Two-character porcelain status (e.g. " M", "A ", "??"). */
  readonly code: string;
};

export type PublicationGitAdapter = {
  revParseHead(): Promise<string>;
  statusPorcelain(): Promise<readonly GitStatusEntry[]>;
};

export type PublicationCommandRunner = {
  run(
    command: string,
    args: readonly string[],
    options?: { cwd?: string },
  ): Promise<CommandResult>;
};

export type PublicationValidatorClock = {
  now(): string;
};

/**
 * Manifest describing a publication candidate.
 * Publication-type specific details live here — not hardcoded in rules.
 */
export type PublicationManifest = {
  readonly publicationType: PublicationType;
  readonly repositoryName?: string;
  /** Path relative to repository root. */
  readonly baselineDocumentPath: string;
  /** Path relative to repository root. */
  readonly predecessorBaselinePath: string;
  /** Full or abbreviated predecessor commit hash expected in predecessor doc / manifest. */
  readonly expectedPredecessorHash: string;
  /**
   * Paths (relative) allowed to be dirty/staged for this publication.
   * A path matches if it equals an entry or is under an entry ending with "/".
   */
  readonly allowedPathPrefixes: readonly string[];
  /** Navigation / index files that must exist and mention the baseline basename. */
  readonly requiredNavigationPaths: readonly string[];
  /**
   * Substrings that must appear in the baseline document (metadata gates).
   * Examples: "Commit hash", "Published at", "ENG-0007", "PASS WITH OBSERVATIONS".
   */
  readonly requiredMetadataMarkers: readonly string[];
  /**
   * Governance reference substrings that must appear in the baseline document.
   */
  readonly requiredGovernanceReferences: readonly string[];
  /** When false, PV-002..PV-006 return PASS with evidence "skipped by configuration". */
  readonly runQualityGates?: boolean;
  /** Optional prettier target globs; defaults to a sensible docs/tools set. */
  readonly prettierTargets?: readonly string[];
};

export type PublicationValidatorOptions = {
  readonly repositoryRoot: string;
  readonly manifest: PublicationManifest;
  readonly git: PublicationGitAdapter;
  readonly commands: PublicationCommandRunner;
  readonly clock?: PublicationValidatorClock;
  readonly readFile: (absolutePath: string) => Promise<string>;
  readonly fileExists: (absolutePath: string) => Promise<boolean>;
  /** Optional rule-id allowlist for focused runs/tests. */
  readonly onlyRuleIds?: readonly string[];
};

export type PublicationRuleContext = PublicationValidatorOptions & {
  readonly gitHead: string;
  readonly baselineAbsolutePath: string;
  readonly predecessorAbsolutePath: string;
};

export type PublicationRuleDefinition = {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly evaluate: (
    context: PublicationRuleContext,
  ) => Promise<PublicationRuleResult>;
};
