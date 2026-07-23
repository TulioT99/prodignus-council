import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, test } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(__dirname, "fixtures", "pkos-mini");

const sampleDecisionContext = Object.freeze({
  executionId: "exec-test-001",
  decisionId: "decision-test-001",
  title: "Architecture compliance review",
  question: "Why must the Decision Council not access the PKOS directly?",
  language: "en-US",
  context: "We are validating ADR-0007 and ENG-0004 separation.",
  constraints: "Use canonical evidence only.",
  objectives: "Confirm retrieval architecture.",
  attachments: Object.freeze([]),
  timestamp: "2026-07-23T12:00:00.000Z",
  status: "under_review",
});

let savedEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
});

afterEach(() => {
  process.env = savedEnv;
});

test("resolvePKOSRetrievalConfig fails clearly when configured path does not exist", async () => {
  const { resolvePKOSRetrievalConfig, PKOSConfigurationError } = await import(
    "../src/lib/pkos/config.ts"
  );

  process.env.PKOS_REPOSITORY_PATH = join(tmpdir(), "missing-pkos-repo");

  assert.throws(
    () => resolvePKOSRetrievalConfig(),
    (error) =>
      error instanceof PKOSConfigurationError &&
      error.message.includes("does not point to an existing directory"),
  );
});

test("discoverMarkdownArtifacts ignores non-canonical folders and finds markdown recursively", async () => {
  const { discoverMarkdownArtifacts } = await import("../src/lib/pkos/discovery.ts");
  const discovered = discoverMarkdownArtifacts(FIXTURE_ROOT);

  assert.ok(discovered.some((path) => path.includes("ADR-0007-separation.md")));
  assert.ok(discovered.some((path) => path.includes("PK-0005-product-principles.md")));
  assert.ok(!discovered.some((path) => path.includes("node_modules")));
});

test("parsePKOSArtifact parses YAML front matter and infers metadata", async () => {
  const { parsePKOSArtifact } = await import("../src/lib/pkos/metadata-parser.ts");
  const { readFileSync } = await import("node:fs");

  const content = readFileSync(
    join(FIXTURE_ROOT, "decisions", "ADR-0007-separation.md"),
    "utf8",
  );
  const parsed = parsePKOSArtifact("decisions/ADR-0007-separation.md", content);

  assert.ok(parsed.artifact);
  assert.equal(parsed.artifact.id, "ADR-0007");
  assert.equal(parsed.artifact.status, "accepted");
  assert.equal(parsed.artifact.family, "ADR");
});

test("governance excludes deprecated artifacts and allows accepted artifacts", async () => {
  const { parsePKOSArtifact } = await import("../src/lib/pkos/metadata-parser.ts");
  const { evaluateGovernanceEligibility } = await import("../src/lib/pkos/governance.ts");
  const { readFileSync } = await import("node:fs");

  const deprecated = parsePKOSArtifact(
    "decisions/ADR-9999-deprecated.md",
    readFileSync(join(FIXTURE_ROOT, "decisions", "ADR-9999-deprecated.md"), "utf8"),
  ).artifact;
  const accepted = parsePKOSArtifact(
    "decisions/ADR-0007-separation.md",
    readFileSync(join(FIXTURE_ROOT, "decisions", "ADR-0007-separation.md"), "utf8"),
  ).artifact;

  assert.equal(evaluateGovernanceEligibility(deprecated).eligible, false);
  assert.equal(evaluateGovernanceEligibility(accepted).eligible, true);
});

test("request analyzer extracts document IDs and keywords", async () => {
  const { analyzeCouncilRequest } = await import("../src/lib/pkos/request-analyzer.ts");
  const analysis = analyzeCouncilRequest(sampleDecisionContext);

  assert.ok(analysis.documentIds.includes("ADR-0007"));
  assert.ok(analysis.documentIds.includes("ENG-0004"));
  assert.ok(analysis.keywords.length > 0);
});

test("ranking prioritizes exact document ID matches with stable ordering", async () => {
  const { discoverMarkdownArtifacts, readArtifactFile, toRepositoryRelativePath } =
    await import("../src/lib/pkos/discovery.ts");
  const { parsePKOSArtifact } = await import("../src/lib/pkos/metadata-parser.ts");
  const { evaluateGovernanceEligibility } = await import("../src/lib/pkos/governance.ts");
  const { analyzeCouncilRequest } = await import("../src/lib/pkos/request-analyzer.ts");
  const { rankArtifacts } = await import("../src/lib/pkos/ranking.ts");

  const artifacts = discoverMarkdownArtifacts(FIXTURE_ROOT)
    .map((absolutePath) => {
      const relativePath = toRepositoryRelativePath(FIXTURE_ROOT, absolutePath);
      const parsed = parsePKOSArtifact(relativePath, readArtifactFile(FIXTURE_ROOT, absolutePath));
      return parsed.artifact;
    })
    .filter(Boolean);

  const eligible = artifacts.filter(
    (artifact) => evaluateGovernanceEligibility(artifact).eligible,
  );
  const analysis = analyzeCouncilRequest(sampleDecisionContext);
  const ranked = rankArtifacts(eligible, analysis);

  assert.equal(ranked[0].artifact.id, "ADR-0007");
  const secondRun = rankArtifacts(eligible, analysis);
  assert.deepEqual(
    ranked.map((entry) => entry.artifact.id),
    secondRun.map((entry) => entry.artifact.id),
  );
});

test("resolver deduplicates duplicate identifiers and detects conflicts", async () => {
  const { parsePKOSArtifact } = await import("../src/lib/pkos/metadata-parser.ts");
  const { rankArtifacts } = await import("../src/lib/pkos/ranking.ts");
  const { resolveEvidence } = await import("../src/lib/pkos/resolver.ts");
  const { readFileSync } = await import("node:fs");

  const draft = parsePKOSArtifact(
    "engineering/ENG-0004-retrieval-draft.md",
    readFileSync(join(FIXTURE_ROOT, "engineering", "ENG-0004-retrieval-draft.md"), "utf8"),
  ).artifact;
  const accepted = parsePKOSArtifact(
    "engineering/ENG-0004-retrieval-accepted.md",
    readFileSync(join(FIXTURE_ROOT, "engineering", "ENG-0004-retrieval-accepted.md"), "utf8"),
  ).artifact;

  const ranked = rankArtifacts(
    [draft, accepted],
    {
      normalizedText: "Summarize ENG-0004",
      keywords: ["eng", "0004"],
      documentIds: ["ENG-0004"],
      families: ["ENG"],
      phrases: [],
      language: "en-US",
    },
  );

  const resolution = resolveEvidence(ranked, 5, ["ENG-0004"]);
  assert.equal(resolution.selected.length, 1);
  assert.equal(resolution.selected[0].artifact.status, "accepted");
  assert.ok(
    resolution.warnings.some((warning) => warning.code === "DUPLICATE_IDENTIFIER"),
  );
});

test("retrieveEvidenceForCouncil builds an immutable evidence package", async () => {
  const { retrieveEvidenceForCouncil } = await import(
    "../src/lib/pkos/context-retrieval-engine.ts"
  );

  process.env.PKOS_REPOSITORY_PATH = FIXTURE_ROOT;
  const evidencePackage = retrieveEvidenceForCouncil(sampleDecisionContext);

  assert.ok(evidencePackage.generatedAt);
  assert.ok(evidencePackage.sources.some((source) => source.artifactId === "ADR-0007"));
  assert.ok(["complete", "partial"].includes(evidencePackage.retrievalStatus));
  assert.throws(() => {
    evidencePackage.sources.push({});
  });
});

test("retrieveEvidenceForCouncil returns insufficient when no relevant evidence exists", async () => {
  const { retrieveEvidenceForCouncil } = await import(
    "../src/lib/pkos/context-retrieval-engine.ts"
  );

  process.env.PKOS_REPOSITORY_PATH = FIXTURE_ROOT;
  const evidencePackage = retrieveEvidenceForCouncil({
    ...sampleDecisionContext,
    question: "What is the canonical Prodignus policy for orbital satellite procurement?",
    context: "",
    constraints: "",
    objectives: undefined,
  });

  assert.equal(evidencePackage.retrievalStatus, "insufficient");
  assert.equal(evidencePackage.sources.length, 0);
});

test("retrieveEvidenceForCouncil returns failed when PKOS is unavailable", async () => {
  const { retrieveEvidenceForCouncil } = await import(
    "../src/lib/pkos/context-retrieval-engine.ts"
  );

  delete process.env.PKOS_REPOSITORY_PATH;
  const evidencePackage = retrieveEvidenceForCouncil(sampleDecisionContext);

  assert.equal(evidencePackage.retrievalStatus, "failed");
  assert.ok(
    evidencePackage.warnings.some((warning) => warning.code === "PKOS_UNAVAILABLE"),
  );
});

test("product principles question prioritizes PK-0005", async () => {
  const { retrieveEvidenceForCouncil } = await import(
    "../src/lib/pkos/context-retrieval-engine.ts"
  );

  process.env.PKOS_REPOSITORY_PATH = FIXTURE_ROOT;
  const evidencePackage = retrieveEvidenceForCouncil({
    ...sampleDecisionContext,
    question: "Which Prodignus product principles should guide this decision?",
    context: "",
    constraints: "",
  });

  assert.ok(evidencePackage.sources.some((source) => source.artifactId === "PK-0005"));
});

test("explicit ENG-0004 request prioritizes ENG-0004 accepted artifact", async () => {
  const { retrieveEvidenceForCouncil } = await import(
    "../src/lib/pkos/context-retrieval-engine.ts"
  );

  process.env.PKOS_REPOSITORY_PATH = FIXTURE_ROOT;
  const evidencePackage = retrieveEvidenceForCouncil({
    ...sampleDecisionContext,
    question: "Summarize ENG-0004 for an executive audience.",
    context: "",
    constraints: "",
  });

  assert.equal(evidencePackage.sources[0]?.artifactId, "ENG-0004");
  assert.equal(evidencePackage.sources[0]?.status, "accepted");
});

test("runCouncil attaches PKOS evidence before advisor execution", async () => {
  const { mock } = await import("node:test");
  const { createOpenRouterChairmanResponse, validChairmanPayload } = await import(
    "./chairman-fixtures.mjs"
  );

  process.env.PKOS_REPOSITORY_PATH = FIXTURE_ROOT;
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.OPENROUTER_MODEL_CONTRARIAN = "test/contrarian";
  process.env.OPENROUTER_MODEL_PRODUCT_STRATEGY = "test/product-strategy";
  process.env.OPENROUTER_MODEL_UX_ACCESSIBILITY = "test/ux-accessibility";
  process.env.OPENROUTER_MODEL_DELIVERY_ENGINEERING = "test/delivery-engineering";
  process.env.OPENROUTER_MODEL_HUMAN_IMPACT = "test/human-impact";
  process.env.OPENROUTER_MODEL_CHAIRMAN = "test/chairman";

  const promptBodies = [];
  const validAdvisorPayload = {
    summary: "Test advisor summary.",
    analysis: [{ title: "Analysis", description: "Test analysis." }],
    recommendation: "proceed_with_conditions",
    confidence: 70,
    assumptions: ["Test assumption."],
    risks: ["Test risk."],
  };

  function createOpenRouterResponse(content, model) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        model,
        choices: [{ message: { role: "assistant", content: JSON.stringify(content) } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      }),
    };
  }

  globalThis.fetch = mock.fn(async (_url, options) => {
    promptBodies.push(JSON.parse(options.body));
    const model = promptBodies.at(-1).model;

    if (model === "test/chairman") {
      return createOpenRouterChairmanResponse(validChairmanPayload, model);
    }

    return createOpenRouterResponse(validAdvisorPayload, model);
  });

  const { runCouncil } = await import("../src/lib/council/orchestrator.ts");
  const result = await runCouncil({
    id: "decision-001",
    title: "Architecture review",
    question: "Why must the Decision Council not access the PKOS directly?",
    context: "ADR-0007 and ENG-0004 apply.",
    constraints: "",
    createdAt: "2026-07-23T12:00:00.000Z",
    status: "under_review",
  });

  assert.ok(result.pkosRetrieval);
  assert.ok(result.decisionContext.pkosEvidence);
  assert.ok(
    promptBodies.some((body) =>
      body.messages.some(
        (message) =>
          message.role === "user" &&
          message.content.includes("=== CANONICAL PKOS EVIDENCE ==="),
      ),
    ),
  );
  assert.ok(
    promptBodies.some((body) =>
      body.messages.some(
        (message) => message.role === "user" && message.content.includes("ADR-0007"),
      ),
    ),
  );
  assert.ok(
    !promptBodies.some((body) =>
      body.messages.some(
        (message) => message.role === "user" && message.content.includes(FIXTURE_ROOT),
      ),
    ),
  );

  mock.restoreAll();
});

test("advisor prompt builders do not import PKOS filesystem modules", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  const councilDir = join(__dirname, "..", "src", "lib", "council");
  const files = [
    join(councilDir, "advisor-prompt.ts"),
    join(councilDir, "advisors", "product-strategy-prompt.ts"),
    join(councilDir, "advisors", "ux-accessibility-prompt.ts"),
    join(councilDir, "advisors", "delivery-engineering-prompt.ts"),
    join(councilDir, "advisors", "human-impact-prompt.ts"),
    join(councilDir, "chairman-prompt.ts"),
  ];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    assert.ok(!content.includes("@/lib/pkos/discovery"));
    assert.ok(!content.includes("@/lib/pkos/context-retrieval-engine"));
  }
});

test("malformed artifacts produce parsing warnings without crashing retrieval", async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "pkos-test-"));
  mkdirSync(join(tempRoot, "malformed"), { recursive: true });
  mkdirSync(join(tempRoot, "decisions"), { recursive: true });
  writeFileSync(join(tempRoot, "malformed", "no-id.md"), "# Missing id\n", "utf8");
  writeFileSync(
    join(tempRoot, "decisions", "ADR-0001-test.md"),
    "---\nid: ADR-0001\nstatus: Accepted\ntitle: Test ADR\n---\n# ADR-0001\nBody\n",
    "utf8",
  );

  try {
    const { retrieveEvidenceForCouncil } = await import(
      "../src/lib/pkos/context-retrieval-engine.ts"
    );
    process.env.PKOS_REPOSITORY_PATH = tempRoot;
    const evidencePackage = retrieveEvidenceForCouncil(sampleDecisionContext);
    assert.ok(
      evidencePackage.warnings.some((warning) => warning.code === "PARSING_WARNING"),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
