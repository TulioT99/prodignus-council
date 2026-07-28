import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

import {
  createOpenRouterChairmanResponse,
  validChairmanPayload,
} from "./chairman-fixtures.mjs";
import {
  assertChairmanFailed,
  buildTestConsensusPackage,
} from "./chairman-test-helpers.mjs";

const sampleDecision = {
  id: "DEC-20260728-001",
  title: "Chairman contract enforcement",
  question: "Should Prodignus enforce Consensus Package before Chairman?",
  context: "WP-05A contract validation.",
  constraints: "No fabricated recommendations on failure.",
  createdAt: "2026-07-28T10:00:00.000Z",
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
    executionId: "EXEC-CONTRACT-001",
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

test("validateChairmanExecutionContract accepts a valid Consensus Package contract", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { validateChairmanExecutionContract } =
    await import("../src/lib/council/chairman-contract.ts");

  const advisors = createSuccessfulAdvisors(3);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-CONTRACT-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONTRACT-001",
    advisors,
  });

  const result = validateChairmanExecutionContract({
    decisionContext,
    advisors,
    consensus,
  });

  assert.equal(result.ok, true);
  assert.equal(result.contract.consensus, consensus);
  assert.equal(
    result.contract.executionMetadata.executionId,
    "EXEC-CONTRACT-001",
  );
  assert.equal(result.contract.confidenceMetadata, consensus.confidence);
});

test("validateChairmanExecutionContract rejects missing Consensus Package", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { validateChairmanExecutionContract } =
    await import("../src/lib/council/chairman-contract.ts");

  const advisors = createSuccessfulAdvisors(3);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-CONTRACT-001",
  });

  const result = validateChairmanExecutionContract({
    decisionContext,
    advisors,
    consensus: undefined,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "MISSING_CONSENSUS_PACKAGE");
});

test("validateChairmanExecutionContract rejects invalid Consensus Package schema", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { validateChairmanExecutionContract } =
    await import("../src/lib/council/chairman-contract.ts");

  const advisors = createSuccessfulAdvisors(3);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-CONTRACT-001",
  });

  const result = validateChairmanExecutionContract({
    decisionContext,
    advisors,
    consensus: {
      schemaVersion: "9.9",
      executionId: "EXEC-CONTRACT-001",
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_CONSENSUS_PACKAGE_SCHEMA");
});

test("validateChairmanExecutionContract rejects missing execution metadata", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { validateChairmanExecutionContract } =
    await import("../src/lib/council/chairman-contract.ts");

  const advisors = createSuccessfulAdvisors(3);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-CONTRACT-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONTRACT-001",
    advisors,
  });

  const result = validateChairmanExecutionContract({
    decisionContext,
    advisors,
    consensus: {
      ...consensus,
      metadata: undefined,
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "MISSING_EXECUTION_METADATA");
});

test("validateChairmanExecutionContract rejects mismatched identifiers", async () => {
  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { validateChairmanExecutionContract } =
    await import("../src/lib/council/chairman-contract.ts");

  const advisors = createSuccessfulAdvisors(3);
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-CONTRACT-001",
  });
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-OTHER-999",
    advisors,
  });

  const result = validateChairmanExecutionContract({
    decisionContext,
    advisors,
    consensus,
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_IDENTIFIERS");
});

test("runChairman refuses execution without Consensus Package and does not call the LLM", async () => {
  globalThis.fetch = mock.fn(async () => {
    throw new Error(
      "LLM must not be invoked after contract validation failure",
    );
  });

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");

  const result = await runChairman(
    createDecisionContext(sampleDecision, { executionId: "EXEC-CONTRACT-001" }),
    createSuccessfulAdvisors(3),
    { consensus: undefined },
  );

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "MISSING_CONSENSUS_PACKAGE");
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("runChairman refuses invalid schema before LLM invocation", async () => {
  globalThis.fetch = mock.fn(async () => {
    throw new Error("LLM must not be invoked after schema validation failure");
  });

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const advisors = createSuccessfulAdvisors(3);
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONTRACT-001",
    advisors,
  });

  const result = await runChairman(
    createDecisionContext(sampleDecision, { executionId: "EXEC-CONTRACT-001" }),
    advisors,
    {
      consensus: {
        ...consensus,
        confidence: { overall: "not-a-number" },
      },
    },
  );

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "INVALID_CONSENSUS_PACKAGE_SCHEMA");
  assert.equal(globalThis.fetch.mock.callCount(), 0);
});

test("runChairman succeeds with a valid Consensus Package and execution contract", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterChairmanResponse(validChairmanPayload),
  );

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const advisors = createSuccessfulAdvisors(5);
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONTRACT-001",
    advisors,
  });

  const result = await runChairman(
    createDecisionContext(sampleDecision, { executionId: "EXEC-CONTRACT-001" }),
    advisors,
    { consensus },
  );

  assert.equal(result.status, "success");
  assert.equal(result.executionId, "EXEC-CONTRACT-001");
  assert.equal(result.recommendationType, "run_bounded_experiment");
  assert.equal(globalThis.fetch.mock.callCount(), 1);
});

test("ChairmanFailed operational failures never emit recommendation placeholders", async () => {
  delete process.env.OPENROUTER_MODEL_CHAIRMAN;

  const { createDecisionContext } =
    await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const advisors = createSuccessfulAdvisors(3);
  const consensus = await buildTestConsensusPackage({
    executionId: "EXEC-CONTRACT-001",
    advisors,
  });

  const result = await runChairman(
    createDecisionContext(sampleDecision, { executionId: "EXEC-CONTRACT-001" }),
    advisors,
    { consensus },
  );

  assertChairmanFailed(result);
  assert.equal(result.failureReasonCode, "CONFIGURATION_ERROR");
  assert.equal(result.decision, undefined);
  assert.equal(result.finalRecommendation, undefined);
});
