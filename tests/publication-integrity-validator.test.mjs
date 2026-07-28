import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateOverallStatus,
  buildPublicationValidationResult,
  extractCommitHashFromBaseline,
  hashesMatch,
  pathIsAllowed,
  publicationMayProceed,
  runPublicationValidator,
} from "../tools/publication-integrity-validator/index.ts";
import { INITIAL_PUBLICATION_RULES } from "../tools/publication-integrity-validator/rules.ts";

function createManifest(overrides = {}) {
  return {
    publicationType: "WP",
    repositoryName: "prodignus-council",
    baselineDocumentPath: "docs/assessments/WP-TEST-IMPLEMENTATION-BASELINE.md",
    predecessorBaselinePath:
      "docs/assessments/WP-PREV-IMPLEMENTATION-BASELINE.md",
    expectedPredecessorHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    allowedPathPrefixes: [
      "docs/",
      "tools/publication-integrity-validator/",
      "package.json",
    ],
    requiredNavigationPaths: ["docs/README.md", "docs/assessments/README.md"],
    requiredMetadataMarkers: [
      "Commit hash",
      "Published at",
      "Governing specification",
      "Executive Architecture Review",
      "Validation summary",
    ],
    requiredGovernanceReferences: ["ENG-0007", "OPS-0002", "OPS-0003"],
    runQualityGates: false,
    ...overrides,
  };
}

function createBaselineMarkdown({
  head = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  predecessor = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
} = {}) {
  return `# WP-TEST Baseline

| Field | Value |
| --- | --- |
| Predecessor baseline | WP-PREV @ \`${predecessor}\` |
| Governing specification | ENG-0007 |
| Executive Architecture Review | **PASS WITH OBSERVATIONS** |

## Canonical baseline commit

| Item | Value |
| --- | --- |
| Commit hash | \`${head}\` |
| Published at | 2026-07-28 22:00:00 +0200 |

## Validation summary

| Check | Result |
| --- | --- |
| Tests | Pass |

OPS-0002 and OPS-0003 apply.
`;
}

function createPredecessorMarkdown(
  hash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
) {
  return `# Predecessor

| Item | Value |
| --- | --- |
| Commit hash | \`${hash}\` |
`;
}

function createFiles(map) {
  return {
    async readFile(absolutePath) {
      const key = absolutePath.replaceAll("\\", "/");
      const hit = Object.entries(map).find(([relative]) =>
        key.endsWith(relative.replaceAll("\\", "/")),
      );
      if (!hit) {
        throw new Error(`Missing file fixture: ${absolutePath}`);
      }
      return hit[1];
    },
    async fileExists(absolutePath) {
      const key = absolutePath.replaceAll("\\", "/");
      return Object.keys(map).some((relative) =>
        key.endsWith(relative.replaceAll("\\", "/")),
      );
    },
  };
}

function createGit({
  head = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  status = [],
} = {}) {
  return {
    async revParseHead() {
      return head;
    },
    async statusPorcelain() {
      return status;
    },
  };
}

function createCommands(handler) {
  return {
    async run(command, args) {
      return handler(command, args);
    },
  };
}

async function runWithFixtures({
  head = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  status = [],
  files,
  manifestOverrides = {},
  onlyRuleIds,
  commands,
  rules,
} = {}) {
  const headHash = head;
  const fileMap = {
    "docs/assessments/WP-TEST-IMPLEMENTATION-BASELINE.md":
      createBaselineMarkdown({ head: headHash }),
    "docs/assessments/WP-PREV-IMPLEMENTATION-BASELINE.md":
      createPredecessorMarkdown(),
    "docs/README.md":
      "See WP-TEST-IMPLEMENTATION-BASELINE and assessments index.",
    "docs/assessments/README.md":
      "| [WP-TEST-IMPLEMENTATION-BASELINE.md](./WP-TEST-IMPLEMENTATION-BASELINE.md) | Test |",
    ...files,
  };

  const io = createFiles(fileMap);

  return runPublicationValidator({
    repositoryRoot: "C:/repo",
    manifest: createManifest(manifestOverrides),
    git: createGit({ head: headHash, status }),
    commands:
      commands ??
      createCommands(async () => ({
        ok: true,
        exitCode: 0,
        stdout: "ok",
        stderr: "",
      })),
    clock: { now: () => "2026-07-28T20:00:00.000Z" },
    readFile: io.readFile,
    fileExists: io.fileExists,
    onlyRuleIds,
    rules,
  });
}

test("helpers extract commit hash and allowlist paths", () => {
  const hash = extractCommitHashFromBaseline(createBaselineMarkdown());
  assert.equal(hash, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  assert.equal(pathIsAllowed("docs/ops/x.md", ["docs/"]), true);
  assert.equal(pathIsAllowed("src/app.ts", ["docs/"]), false);
  assert.equal(hashesMatch("abcdef1", "abcdef1234567890"), true);
});

test("aggregateOverallStatus precedence Fail > Warning > Pass", () => {
  assert.equal(
    aggregateOverallStatus([
      { ruleId: "A", ruleName: "A", status: "PASS", message: "" },
      { ruleId: "B", ruleName: "B", status: "WARNING", message: "" },
    ]),
    "PASS WITH WARNINGS",
  );
  assert.equal(
    aggregateOverallStatus([
      { ruleId: "A", ruleName: "A", status: "WARNING", message: "" },
      { ruleId: "B", ruleName: "B", status: "FAIL", message: "" },
    ]),
    "FAIL",
  );
  assert.equal(
    aggregateOverallStatus([
      { ruleId: "A", ruleName: "A", status: "PASS", message: "" },
    ]),
    "PASS",
  );
});

test("PublicationValidationResult serializes with stable fields", () => {
  const result = buildPublicationValidationResult({
    repository: "prodignus-council",
    publicationType: "WP",
    gitHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    executionTimestamp: "2026-07-28T20:00:00.000Z",
    ruleResults: [
      {
        ruleId: "PV-007",
        ruleName: "Baseline Integrity",
        status: "PASS",
        message: "ok",
      },
    ],
  });

  const json = JSON.parse(JSON.stringify(result));
  assert.equal(json.validatorVersion, "1.0.0");
  assert.equal(json.overallStatus, "PASS");
  assert.equal(json.ruleResults[0].ruleId, "PV-007");
  assert.equal(publicationMayProceed(result), true);
});

test("registry exposes all PV-001..PV-012 rules", () => {
  const ids = INITIAL_PUBLICATION_RULES.map((rule) => rule.ruleId);
  assert.deepEqual(ids, [
    "PV-001",
    "PV-002",
    "PV-003",
    "PV-004",
    "PV-005",
    "PV-006",
    "PV-007",
    "PV-008",
    "PV-009",
    "PV-010",
    "PV-011",
    "PV-012",
  ]);
});

test("happy path passes structural rules when quality gates skipped", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: [
      "PV-001",
      "PV-007",
      "PV-008",
      "PV-009",
      "PV-010",
      "PV-011",
      "PV-012",
    ],
  });
  assert.equal(result.overallStatus, "PASS");
  assert.equal(result.failures.length, 0);
});

test("PV-001 fails on unrelated dirty paths", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-001"],
    status: [{ code: " M", path: "src/lib/council/chairman-runner.ts" }],
  });
  assert.equal(result.overallStatus, "FAIL");
  assert.equal(result.failures[0].ruleId, "PV-001");
});

test("PV-007 fails on baseline hash mismatch", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-007"],
    head: "cccccccccccccccccccccccccccccccccccccccc",
    files: {
      "docs/assessments/WP-TEST-IMPLEMENTATION-BASELINE.md":
        createBaselineMarkdown({
          head: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        }),
    },
  });
  assert.equal(result.overallStatus, "FAIL");
  assert.equal(result.failures[0].ruleId, "PV-007");
});

test("PV-007 fails when baseline document is missing", async () => {
  const result = await runPublicationValidator({
    repositoryRoot: "C:/repo",
    manifest: createManifest(),
    git: createGit({
      head: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    }),
    commands: createCommands(async () => ({
      ok: true,
      exitCode: 0,
      stdout: "",
      stderr: "",
    })),
    clock: { now: () => "2026-07-28T20:00:00.000Z" },
    async readFile() {
      throw new Error("should not read");
    },
    async fileExists() {
      return false;
    },
    onlyRuleIds: ["PV-007"],
  });

  assert.equal(result.overallStatus, "FAIL");
  assert.match(result.failures[0].message, /not found/i);
});

test("PV-007 fails when commit hash field missing", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-007"],
    files: {
      "docs/assessments/WP-TEST-IMPLEMENTATION-BASELINE.md":
        "# Baseline without hash\n",
    },
  });
  assert.equal(result.overallStatus, "FAIL");
  assert.match(result.failures[0].message, /does not record/i);
});

test("PV-008 fails when navigation omits baseline mention", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-008"],
    files: {
      "docs/README.md": "No baseline link here.",
      "docs/assessments/README.md": "Still no mention.",
    },
  });
  assert.equal(result.overallStatus, "FAIL");
  assert.equal(result.failures[0].ruleId, "PV-008");
});

test("PV-009 fails on incorrect predecessor reference", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-009"],
    files: {
      "docs/assessments/WP-TEST-IMPLEMENTATION-BASELINE.md":
        createBaselineMarkdown({
          head: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          predecessor: "dddddddddddddddddddddddddddddddddddddddd",
        }),
    },
  });
  assert.equal(result.overallStatus, "FAIL");
  assert.equal(result.failures[0].ruleId, "PV-009");
});

test("PV-009 warns when predecessor document stamp differs historically", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-009"],
    files: {
      "docs/assessments/WP-PREV-IMPLEMENTATION-BASELINE.md":
        createPredecessorMarkdown("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"),
    },
  });
  assert.equal(result.overallStatus, "PASS WITH WARNINGS");
  assert.equal(result.warnings[0].ruleId, "PV-009");
});

test("PV-010 fails on missing metadata markers", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-010"],
    files: {
      "docs/assessments/WP-TEST-IMPLEMENTATION-BASELINE.md":
        "| Commit hash | `bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb` |\n",
    },
  });
  assert.equal(result.overallStatus, "FAIL");
  assert.equal(result.failures[0].ruleId, "PV-010");
});

test("PV-011 fails on unrelated scope modifications", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-011"],
    status: [{ code: "??", path: "secrets/credentials.json" }],
  });
  assert.equal(result.overallStatus, "FAIL");
  assert.equal(result.failures[0].ruleId, "PV-011");
});

test("PV-012 fails on missing governance references", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-012"],
    files: {
      "docs/assessments/WP-TEST-IMPLEMENTATION-BASELINE.md":
        createBaselineMarkdown().replaceAll("OPS-0003", "OPS-GONE"),
    },
  });
  assert.equal(result.overallStatus, "FAIL");
  assert.equal(result.failures[0].ruleId, "PV-012");
});

test("PV-002 fails when build command fails", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-002"],
    manifestOverrides: { runQualityGates: true },
    commands: createCommands(async () => ({
      ok: false,
      exitCode: 1,
      stdout: "",
      stderr: "build failed",
    })),
  });
  assert.equal(result.overallStatus, "FAIL");
  assert.equal(result.failures[0].ruleId, "PV-002");
});

test("PV-003..PV-006 pass when injected commands succeed", async () => {
  const result = await runWithFixtures({
    onlyRuleIds: ["PV-003", "PV-004", "PV-005", "PV-006"],
    manifestOverrides: { runQualityGates: true },
    commands: createCommands(async () => ({
      ok: true,
      exitCode: 0,
      stdout: "ok",
      stderr: "",
    })),
  });
  assert.equal(result.overallStatus, "PASS");
  assert.equal(result.ruleResults.length, 4);
});

test("publicationMayProceed is false for FAIL and warnings", async () => {
  const failed = await runWithFixtures({
    onlyRuleIds: ["PV-007"],
    files: {
      "docs/assessments/WP-TEST-IMPLEMENTATION-BASELINE.md": "# no hash\n",
    },
  });
  assert.equal(publicationMayProceed(failed), false);

  const warned = await runWithFixtures({
    onlyRuleIds: ["PV-009"],
    files: {
      "docs/assessments/WP-PREV-IMPLEMENTATION-BASELINE.md":
        createPredecessorMarkdown("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"),
    },
  });
  assert.equal(warned.overallStatus, "PASS WITH WARNINGS");
  assert.equal(publicationMayProceed(warned), false);
});
