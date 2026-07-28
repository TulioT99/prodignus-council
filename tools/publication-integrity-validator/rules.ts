import path from "node:path";

import {
  extractCommitHashFromBaseline,
  extractPredecessorHashFromDocument,
  hashesMatch,
  pathIsAllowed,
  toPosixRelative,
} from "./helpers.ts";
import { fail, pass, warn } from "./result.ts";
import type {
  PublicationRuleContext,
  PublicationRuleDefinition,
} from "./types.ts";

async function runQualityGate(
  context: PublicationRuleContext,
  ruleId: string,
  ruleName: string,
  command: string,
  args: readonly string[],
): Promise<ReturnType<typeof pass>> {
  if (context.manifest.runQualityGates === false) {
    return pass(
      ruleId,
      ruleName,
      `${ruleName} skipped (runQualityGates=false).`,
      ["skipped"],
    );
  }

  const result = await context.commands.run(command, args, {
    cwd: context.repositoryRoot,
  });

  if (!result.ok) {
    return fail(
      ruleId,
      ruleName,
      `${ruleName} failed with exit code ${result.exitCode}.`,
      [result.stderr.slice(0, 2000) || result.stdout.slice(0, 2000)],
    );
  }

  return pass(ruleId, ruleName, `${ruleName} succeeded.`, [
    `exitCode=${result.exitCode}`,
  ]);
}

export const PV001_CLEAN_WORKING_TREE: PublicationRuleDefinition = {
  ruleId: "PV-001",
  ruleName: "Clean Working Tree",
  evaluate: async (context) => {
    const entries = await context.git.statusPorcelain();
    const disallowed = entries.filter(
      (entry) =>
        !pathIsAllowed(entry.path, context.manifest.allowedPathPrefixes),
    );

    if (disallowed.length > 0) {
      return fail(
        "PV-001",
        "Clean Working Tree",
        "Working tree contains paths outside the publication allowlist.",
        disallowed.map((entry) => `${entry.code} ${entry.path}`),
      );
    }

    return pass(
      "PV-001",
      "Clean Working Tree",
      entries.length === 0
        ? "Working tree is clean."
        : "Working tree changes are confined to the publication allowlist.",
      entries.map((entry) => `${entry.code} ${entry.path}`),
    );
  },
};

export const PV002_BUILD: PublicationRuleDefinition = {
  ruleId: "PV-002",
  ruleName: "Build",
  evaluate: (context) =>
    runQualityGate(context, "PV-002", "Build", "npm", ["run", "build"]),
};

export const PV003_TYPESCRIPT: PublicationRuleDefinition = {
  ruleId: "PV-003",
  ruleName: "TypeScript",
  evaluate: (context) =>
    runQualityGate(context, "PV-003", "TypeScript", "npm", [
      "run",
      "typecheck",
    ]),
};

export const PV004_LINT: PublicationRuleDefinition = {
  ruleId: "PV-004",
  ruleName: "Lint",
  evaluate: (context) =>
    runQualityGate(context, "PV-004", "Lint", "npm", ["run", "lint"]),
};

export const PV005_FORMATTING: PublicationRuleDefinition = {
  ruleId: "PV-005",
  ruleName: "Formatting",
  evaluate: async (context) => {
    if (context.manifest.runQualityGates === false) {
      return pass(
        "PV-005",
        "Formatting",
        "Formatting skipped (runQualityGates=false).",
        ["skipped"],
      );
    }

    const targets = context.manifest.prettierTargets ?? [
      "docs/ops",
      "docs/assessments/README.md",
      "docs/README.md",
      "tools/publication-integrity-validator",
    ];

    return runQualityGate(context, "PV-005", "Formatting", "npx", [
      "prettier",
      "--check",
      ...targets,
    ]);
  },
};

export const PV006_TESTS: PublicationRuleDefinition = {
  ruleId: "PV-006",
  ruleName: "Tests",
  evaluate: (context) =>
    runQualityGate(context, "PV-006", "Tests", "npm", ["test"]),
};

export const PV007_BASELINE_INTEGRITY: PublicationRuleDefinition = {
  ruleId: "PV-007",
  ruleName: "Baseline Integrity",
  evaluate: async (context) => {
    if (!(await context.fileExists(context.baselineAbsolutePath))) {
      return fail(
        "PV-007",
        "Baseline Integrity",
        `Baseline document not found: ${context.manifest.baselineDocumentPath}`,
      );
    }

    const content = await context.readFile(context.baselineAbsolutePath);
    const documented = extractCommitHashFromBaseline(content);

    if (!documented) {
      return fail(
        "PV-007",
        "Baseline Integrity",
        "Baseline document does not record an implementation commit hash.",
      );
    }

    if (!hashesMatch(documented, context.gitHead)) {
      return fail(
        "PV-007",
        "Baseline Integrity",
        "Baseline document commit hash does not match Git HEAD.",
        [
          `baselineHash=${documented}`,
          `gitHead=${context.gitHead}`,
          "Baseline Document Commit Hash == Published Git HEAD is mandatory (OPS-0002 / OPS-0003).",
        ],
      );
    }

    return pass(
      "PV-007",
      "Baseline Integrity",
      "Baseline document commit hash matches Git HEAD.",
      [`hash=${documented}`],
    );
  },
};

export const PV008_NAVIGATION: PublicationRuleDefinition = {
  ruleId: "PV-008",
  ruleName: "Navigation",
  evaluate: async (context) => {
    const baselineBasename = path.basename(
      context.manifest.baselineDocumentPath,
    );
    const missing: string[] = [];
    const lackingMention: string[] = [];

    for (const relative of context.manifest.requiredNavigationPaths) {
      const absolute = path.join(context.repositoryRoot, relative);
      if (!(await context.fileExists(absolute))) {
        missing.push(relative);
        continue;
      }

      const content = await context.readFile(absolute);
      if (!content.includes(baselineBasename.replace(/\.md$/i, ""))) {
        lackingMention.push(relative);
      }
    }

    if (missing.length > 0 || lackingMention.length > 0) {
      return fail(
        "PV-008",
        "Navigation",
        "Required navigation updates are missing or incomplete.",
        [
          ...missing.map((item) => `missing:${item}`),
          ...lackingMention.map((item) => `no-mention:${item}`),
        ],
      );
    }

    return pass(
      "PV-008",
      "Navigation",
      "Required navigation files exist and reference the baseline document.",
      [...context.manifest.requiredNavigationPaths],
    );
  },
};

export const PV009_PREVIOUS_BASELINE: PublicationRuleDefinition = {
  ruleId: "PV-009",
  ruleName: "Previous Baseline",
  evaluate: async (context) => {
    if (!(await context.fileExists(context.predecessorAbsolutePath))) {
      return fail(
        "PV-009",
        "Previous Baseline",
        `Predecessor baseline document not found: ${context.manifest.predecessorBaselinePath}`,
      );
    }

    const predecessorContent = await context.readFile(
      context.predecessorAbsolutePath,
    );
    const baselineContent = await context.readFile(
      context.baselineAbsolutePath,
    );
    const expected = context.manifest.expectedPredecessorHash;

    const referenced =
      extractPredecessorHashFromDocument(baselineContent) ??
      (baselineContent.includes(expected) ? expected : null);

    if (!referenced || !hashesMatch(referenced, expected)) {
      return fail(
        "PV-009",
        "Previous Baseline",
        "New baseline does not correctly reference the expected predecessor hash.",
        [
          `expectedPredecessorHash=${expected}`,
          `referenced=${referenced ?? "(none)"}`,
        ],
      );
    }

    const predecessorOwnHash =
      extractCommitHashFromBaseline(predecessorContent);
    if (
      predecessorOwnHash &&
      !hashesMatch(predecessorOwnHash, expected) &&
      !hashesMatch(expected, predecessorOwnHash)
    ) {
      return warn(
        "PV-009",
        "Previous Baseline",
        "Predecessor document's stamped commit hash differs from expectedPredecessorHash (historical dual-hash may exist).",
        [
          `predecessorDocumentHash=${predecessorOwnHash}`,
          `expectedPredecessorHash=${expected}`,
        ],
      );
    }

    return pass(
      "PV-009",
      "Previous Baseline",
      "Predecessor baseline exists and is correctly referenced.",
      [
        `predecessor=${context.manifest.predecessorBaselinePath}`,
        `hash=${expected}`,
      ],
    );
  },
};

export const PV010_REQUIRED_METADATA: PublicationRuleDefinition = {
  ruleId: "PV-010",
  ruleName: "Required Metadata",
  evaluate: async (context) => {
    if (!(await context.fileExists(context.baselineAbsolutePath))) {
      return fail(
        "PV-010",
        "Required Metadata",
        "Baseline document missing; cannot validate metadata.",
      );
    }

    const content = await context.readFile(context.baselineAbsolutePath);
    const missing = context.manifest.requiredMetadataMarkers.filter(
      (marker) => !content.includes(marker),
    );

    if (missing.length > 0) {
      return fail(
        "PV-010",
        "Required Metadata",
        "Baseline document is missing required publication metadata markers.",
        missing.map((marker) => `missing:${marker}`),
      );
    }

    return pass(
      "PV-010",
      "Required Metadata",
      "Required publication metadata markers are present.",
      [...context.manifest.requiredMetadataMarkers],
    );
  },
};

export const PV011_SCOPE_VALIDATION: PublicationRuleDefinition = {
  ruleId: "PV-011",
  ruleName: "Scope Validation",
  evaluate: async (context) => {
    const entries = await context.git.statusPorcelain();
    const unrelated = entries
      .map((entry) => toPosixRelative(context.repositoryRoot, entry.path))
      .filter(
        (relative) =>
          !pathIsAllowed(relative, context.manifest.allowedPathPrefixes),
      );

    if (unrelated.length > 0) {
      return fail(
        "PV-011",
        "Scope Validation",
        "Publication scope includes unrelated modified paths.",
        unrelated,
      );
    }

    return pass(
      "PV-011",
      "Scope Validation",
      "No unrelated modifications detected for this publication scope.",
      entries.map((entry) => entry.path),
    );
  },
};

export const PV012_GOVERNANCE_REFERENCES: PublicationRuleDefinition = {
  ruleId: "PV-012",
  ruleName: "Governance References",
  evaluate: async (context) => {
    if (!(await context.fileExists(context.baselineAbsolutePath))) {
      return fail(
        "PV-012",
        "Governance References",
        "Baseline document missing; cannot validate governance references.",
      );
    }

    const content = await context.readFile(context.baselineAbsolutePath);
    const missing = context.manifest.requiredGovernanceReferences.filter(
      (reference) => !content.includes(reference),
    );

    if (missing.length > 0) {
      return fail(
        "PV-012",
        "Governance References",
        "Baseline document is missing required governance references.",
        missing.map((reference) => `missing:${reference}`),
      );
    }

    return pass(
      "PV-012",
      "Governance References",
      "Required governance references are present.",
      [...context.manifest.requiredGovernanceReferences],
    );
  },
};

export const INITIAL_PUBLICATION_RULES: readonly PublicationRuleDefinition[] =
  Object.freeze([
    PV001_CLEAN_WORKING_TREE,
    PV002_BUILD,
    PV003_TYPESCRIPT,
    PV004_LINT,
    PV005_FORMATTING,
    PV006_TESTS,
    PV007_BASELINE_INTEGRITY,
    PV008_NAVIGATION,
    PV009_PREVIOUS_BASELINE,
    PV010_REQUIRED_METADATA,
    PV011_SCOPE_VALIDATION,
    PV012_GOVERNANCE_REFERENCES,
  ]);
