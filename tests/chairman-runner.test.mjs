import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

import {
  createOpenRouterChairmanResponse,
  validChairmanPayload,
} from "./chairman-fixtures.mjs";

const sampleDecision = {
  id: "DEC-20260720-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  createdAt: "2026-07-20T10:00:00.000Z",
  status: "under_review",
};

const sampleAdvisor = {
  persona: {
    id: "ADV-002",
    displayName: "The Product Strategy Advisor",
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
  executionId: "EXEC-SHARED-001",
  summary: "Image upload should be scoped to document evidence needs.",
  analysis: [{ title: "Need", description: "Upload support must map to verification." }],
  assumptions: ["Storage can be bounded per journey."],
  risks: ["Privacy exposure if uploads are not scoped."],
  recommendation: "proceed_with_conditions",
  confidence: 0.81,
  durationMs: 100,
  totalTokens: 200,
};

function createSuccessfulAdvisors(count = 3) {
  const ids = ["ADV-002", "ADV-003", "ADV-004", "ADV-005", "ADV-001"];

  return ids.slice(0, count).map((id, index) => ({
    ...sampleAdvisor,
    persona: {
      ...sampleAdvisor.persona,
      id,
      displayName: `Advisor ${id}`,
    },
    summary: `Perspective ${index + 1} on image upload.`,
  }));
}

function createFailedAdvisor(id, errorMessage) {
  return {
    ...sampleAdvisor,
    persona: { ...sampleAdvisor.persona, id, displayName: `Advisor ${id}` },
    status: "failed",
    summary: "The advisor could not complete this review.",
    analysis: [],
    assumptions: [],
    risks: [],
    recommendation: "insufficient_information",
    confidence: 0,
    durationMs: 0,
    totalTokens: 0,
    errorMessage,
  };
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

const sampleAdvisorsForSessionStatus = [
  ...createSuccessfulAdvisors(3),
  createFailedAdvisor("ADV-004", "The advisor could not complete this review."),
  createFailedAdvisor("ADV-001", "The model provider did not respond within the allowed time."),
];

test("TC-018: session status preservation after context-build failure", async () => {
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { determineCouncilSessionStatus } = await import("../src/lib/council/council-status.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");

  const advisorsBefore = structuredClone(sampleAdvisorsForSessionStatus);
  const expectedSessionStatus = determineCouncilSessionStatus(
    advisorsBefore,
    { status: "failed" },
    3,
  );

  const buildFailureContext = createDecisionContext(
    { ...sampleDecision, question: "   " },
    { executionId: "EXEC-SHARED-001" },
  );
  const buildFailureResult = await runChairman(buildFailureContext, advisorsBefore);

  assert.equal(buildFailureResult.status, "failed");
  assert.equal(buildFailureResult.executionId, "EXEC-SHARED-001");
  assert.match(buildFailureResult.errorMessage ?? "", /question is required/i);
  assert.deepEqual(
    determineCouncilSessionStatus(advisorsBefore, buildFailureResult, 3),
    expectedSessionStatus,
  );

  globalThis.fetch = mock.fn(async () =>
    createOpenRouterChairmanResponse({ invalid: true }),
  );

  const providerFailureContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-SHARED-001",
  });
  const advisorsForProviderFailure = structuredClone(sampleAdvisorsForSessionStatus);
  const providerFailureResult = await runChairman(
    providerFailureContext,
    advisorsForProviderFailure,
  );

  assert.equal(providerFailureResult.status, "failed");
  assert.equal(providerFailureResult.executionId, "EXEC-SHARED-001");
  assert.ok(providerFailureResult.errorMessage);
  assert.deepEqual(
    determineCouncilSessionStatus(advisorsForProviderFailure, providerFailureResult, 3),
    expectedSessionStatus,
  );
});

test("runChairman returns failed result when context build input is invalid", async () => {
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const decisionContext = createDecisionContext({ ...sampleDecision, question: "   " }, {
    executionId: "EXEC-SHARED-001",
  });
  const result = await runChairman(decisionContext, createSuccessfulAdvisors(3));

  assert.equal(result.status, "failed");
  assert.equal(result.executionId, "EXEC-SHARED-001");
  assert.match(result.errorMessage ?? "", /question is required/i);
});

test("runChairman returns structured ChairmanResult on success", async () => {
  globalThis.fetch = mock.fn(async () => createOpenRouterChairmanResponse(validChairmanPayload));

  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-SHARED-001",
  });
  const result = await runChairman(decisionContext, createSuccessfulAdvisors(5));

  assert.equal(result.status, "success");
  assert.equal(result.executionId, "EXEC-SHARED-001");
  assert.equal(result.recommendationType, "run_bounded_experiment");
  assert.equal(result.decision, "test_first");
  assert.equal(result.executiveSummary, validChairmanPayload.executiveSummary);
  assert.equal(result.confidence, 0.78);
  assert.equal(result.totalTokens, 300);
  assert.equal(result.promptTokens, 100);
  assert.equal(result.completionTokens, 200);
  assert.equal(result.estimatedCostUsd, 0.0025);
  assert.equal(result.nextActions.length, 1);
  assert.equal(result.reversalCriteria.length, 1);
  assert.ok(result.durationMs >= 0);
});

test("runChairman returns failed result when model is not configured", async () => {
  delete process.env.OPENROUTER_MODEL_CHAIRMAN;

  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-SHARED-001",
  });
  const result = await runChairman(decisionContext, createSuccessfulAdvisors(3));

  assert.equal(result.status, "failed");
  assert.match(result.errorMessage ?? "", /not configured/i);
});

test("runChairman returns insufficient council failure when fewer than three advisors succeed", async () => {
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-SHARED-001",
  });
  const result = await runChairman(decisionContext, createSuccessfulAdvisors(2));

  assert.equal(result.status, "failed");
  assert.equal(result.insufficientCouncil, true);
  assert.equal(globalThis.fetch, originalFetch);
});

test("runChairman returns failed result when provider returns invalid JSON", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterChairmanResponse({ invalid: true }),
  );

  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-SHARED-001",
  });
  const result = await runChairman(decisionContext, createSuccessfulAdvisors(3));

  assert.equal(result.status, "failed");
  assert.ok(result.errorMessage);
});
