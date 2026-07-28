import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

import {
  createOpenRouterChairmanResponse,
  validChairmanPayload,
} from "./chairman-fixtures.mjs";
import {
  assertChairmanFailed,
  buildTestConsensusPackage,
  createTestDecisionMetadata,
} from "./chairman-test-helpers.mjs";

const sampleDecision = {
  id: "DEC-20260728-META",
  title: "Decision metadata enforcement",
  question:
    "Should Prodignus publish Decision Metadata with every Chairman success?",
  context: "WP-05B auditability requirements.",
  constraints: "Provider-independent metadata only.",
  createdAt: "2026-07-28T12:00:00.000Z",
  status: "under_review",
};

function createSuccessfulAdvisors(count = 3) {
  const ids = ["ADV-002", "ADV-003", "ADV-004", "ADV-005", "ADV-001"];

  return ids.slice(0, count).map((id, index) => ({
    persona: {
      id,
      displayName: `Advisor ${id}`,
      thinkingLens: "product-strategy",
      expertise: "Product Strategy",
      background: "Head of Product",
      yearsExperience: 18,
      mission: "Challenge assumptions.",
      decisionStyle: "Evaluate product fit.",
      coreBeliefs: ["Every recommendation depends on explicit assumptions."],
      model: "OpenRouter (configured model)",
    },
    source: "live",
    status: "success",
    executionId: "EXEC-META-001",
    summary: `Perspective ${index + 1}.`,
    analysis: [{ title: "Need", description: "Scoped decision." }],
    assumptions: ["Assumptions are explicit."],
    risks: ["Residual risk remains."],
    recommendation: "proceed_with_conditions",
    confidence: 0.8,
    durationMs: 100,
    totalTokens: 200,
  }));
}

let originalFetch;
let originalEnv;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalEnv = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL_CHAIRMAN: process.env.OPENROUTER_MODEL_CHAIRMAN,
  };

  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.OPENROUTER_MODEL_CHAIRMAN = "test/chairman";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.OPENROUTER_API_KEY = originalEnv.OPENROUTER_API_KEY;
  process.env.OPENROUTER_MODEL_CHAIRMAN = originalEnv.OPENROUTER_MODEL_CHAIRMAN;
  mock.restoreAll();
});

test("buildDecisionMetadata populates identity, versions, and consensus linkage", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const {
    buildConsensusPackageId,
    buildDecisionMetadata,
    CHAIRMAN_IMPLEMENTATION_BASELINE,
  } = await import("../src/lib/council/chairman-decision-metadata.ts");

  const advisors = createSuccessfulAdvisors(3);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-META-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-META-001",
    advisors,
  });
  const fixedClock = { now: () => "2026-07-28T19:00:00.000Z" };

  const first = buildDecisionMetadata({
    decisionContext,
    consensus,
    clock: fixedClock,
  });
  const second = buildDecisionMetadata({
    decisionContext,
    consensus,
    clock: fixedClock,
  });

  assert.equal(first.decisionId, "decpkg:EXEC-META-001");
  assert.equal(first.decisionTimestamp, "2026-07-28T19:00:00.000Z");
  assert.equal(first.governingEngineeringSpecification, "ENG-0007");
  assert.equal(first.governingEngineeringSpecificationVersion, "1.0");
  assert.equal(first.chairmanSpecificationVersion, "1.0");
  assert.equal(first.implementationBaseline, CHAIRMAN_IMPLEMENTATION_BASELINE);
  assert.equal(first.consensusPackageId, buildConsensusPackageId(consensus));
  assert.equal(first.parentConsensusReference, first.consensusPackageId);
  assert.equal(first.executionId, "EXEC-META-001");
  assert.equal(first.requestId, sampleDecision.id);
  assert.equal(first.traceabilityId, "trace:EXEC-META-001");
  assert.deepEqual(first, second);
});

test("validateDecisionMetadata rejects missing and malformed metadata", async () => {
  const { validateDecisionMetadata, buildConsensusPackageId } =
    await import("../src/lib/council/chairman-decision-metadata.ts");

  const advisors = createSuccessfulAdvisors(3);
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-META-001",
    advisors,
  });
  const expected = {
    executionId: "EXEC-META-001",
    requestId: sampleDecision.id,
    consensusPackageId: buildConsensusPackageId(consensus),
  };

  assert.equal(validateDecisionMetadata(undefined, expected).ok, false);
  assert.equal(
    validateDecisionMetadata(
      createTestDecisionMetadata({
        executionId: "EXEC-META-001",
        requestId: sampleDecision.id,
        consensusPackageId: expected.consensusPackageId,
        decisionTimestamp: "not-a-timestamp",
      }),
      expected,
    ).ok,
    false,
  );
  assert.equal(
    validateDecisionMetadata(
      createTestDecisionMetadata({
        executionId: "EXEC-META-001",
        requestId: sampleDecision.id,
        consensusPackageId: expected.consensusPackageId,
        governingEngineeringSpecification: "ENG-9999",
      }),
      expected,
    ).ok,
    false,
  );
  assert.equal(
    validateDecisionMetadata(
      createTestDecisionMetadata({
        executionId: "EXEC-META-001",
        requestId: sampleDecision.id,
        consensusPackageId: "cp:wrong:v1.0",
      }),
      expected,
    ).ok,
    false,
  );
});

test("validateDecisionMetadata accepts a complete valid package", async () => {
  const { validateDecisionMetadata, buildConsensusPackageId } =
    await import("../src/lib/council/chairman-decision-metadata.ts");

  const advisors = createSuccessfulAdvisors(3);
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-META-001",
    advisors,
  });
  const consensusPackageId = buildConsensusPackageId(consensus);
  const metadata = createTestDecisionMetadata({
    executionId: "EXEC-META-001",
    requestId: sampleDecision.id,
    consensusPackageId,
    parentConsensusReference: consensusPackageId,
    executionMetadataReference: `execmeta:${consensus.executionId}:cfg:${consensus.metadata.configIdentity}`,
  });

  const result = validateDecisionMetadata(metadata, {
    executionId: "EXEC-META-001",
    requestId: sampleDecision.id,
    consensusPackageId,
  });

  assert.equal(result.ok, true);
});

test("runChairman success publishes Decision Metadata with Consensus linkage", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterChairmanResponse(validChairmanPayload),
  );

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const { buildConsensusPackageId, CHAIRMAN_IMPLEMENTATION_BASELINE } =
    await import("../src/lib/council/chairman-decision-metadata.ts");

  const advisors = createSuccessfulAdvisors(5);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-META-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-META-001",
    advisors,
  });

  const result = await runChairman(decisionContext, advisors, { consensus });

  assert.equal(result.status, "success");
  assert.ok(result.metadata);
  assert.equal(result.metadata.decisionId, "decpkg:EXEC-META-001");
  assert.equal(result.metadata.executionId, "EXEC-META-001");
  assert.equal(result.metadata.requestId, sampleDecision.id);
  assert.equal(
    result.metadata.consensusPackageId,
    buildConsensusPackageId(consensus),
  );
  assert.equal(
    result.metadata.parentConsensusReference,
    result.metadata.consensusPackageId,
  );
  assert.equal(result.metadata.governingEngineeringSpecification, "ENG-0007");
  assert.equal(
    result.metadata.implementationBaseline,
    CHAIRMAN_IMPLEMENTATION_BASELINE,
  );
  assert.match(result.metadata.decisionTimestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("Decision Metadata survives JSON serialization round-trip", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterChairmanResponse(validChairmanPayload),
  );

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");

  const advisors = createSuccessfulAdvisors(5);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-META-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-META-001",
    advisors,
  });
  const result = await runChairman(decisionContext, advisors, { consensus });

  const revived = JSON.parse(JSON.stringify(result));
  assert.equal(revived.status, "success");
  assert.deepEqual(revived.metadata, result.metadata);
  assert.equal(revived.metadata.governingEngineeringSpecification, "ENG-0007");
});

test("ChairmanFailed includes failureTraceability without decision package identity", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");

  const advisors = createSuccessfulAdvisors(3);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-META-001",
  });

  const result = await runChairman(decisionContext, advisors, {
    consensus: undefined,
  });

  assertChairmanFailed(result);
  assert.equal(result.failureTraceability.decisionAbsent, true);
  assert.equal(result.failureTraceability.failureId, "chfail:EXEC-META-001");
  assert.equal(result.failureTraceability.executionId, "EXEC-META-001");
  assert.equal(
    result.failureTraceability.governingEngineeringSpecification,
    "ENG-0007",
  );
  assert.equal("decisionId" in result.failureTraceability, false);
  assert.equal("metadata" in result, false);
});

test("buildChairmanFailureTraceability omits fabricated decision identifiers", async () => {
  const { buildChairmanFailureTraceability } =
    await import("../src/lib/council/chairman-decision-metadata.ts");
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");

  const advisors = createSuccessfulAdvisors(3);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-META-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-META-001",
    advisors,
  });

  const failure = buildChairmanFailureTraceability({
    executionId: "EXEC-META-001",
    decisionContext,
    consensus,
    clock: { now: () => "2026-07-28T19:30:00.000Z" },
  });

  assert.equal(failure.decisionAbsent, true);
  assert.equal(failure.failureTimestamp, "2026-07-28T19:30:00.000Z");
  assert.ok(failure.consensusPackageId);
  assert.equal("decisionId" in failure, false);
  assert.equal("decisionTimestamp" in failure, false);
});
