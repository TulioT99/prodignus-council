import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

const validChairmanPayload = {
  executiveSummary: "Synthesized council view.",
  finalRecommendation: "Run a bounded pilot first.",
  decision: "test_first",
  consensus: ["Safety guardrails are required."],
  disagreements: ["Scope of the initial pilot."],
  keyArguments: ["Citizen safety outweighs speed to market."],
  risks: ["Operational burden on frontline staff."],
  conditions: ["Mandatory human escalation."],
  nextSteps: ["Define pilot metrics."],
  confidence: 72,
};

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
    displayName: "The First Principles Thinker",
    thinkingLens: "first-principles",
    expertise: "Public Policy",
    background: "Public Policy Researcher",
    yearsExperience: 18,
    mission: "Challenge assumptions.",
    decisionStyle: "Rebuild from first principles.",
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

function createOpenRouterResponse(content, model = "test/chairman") {
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

test("runChairman returns structured ChairmanResult on success", async () => {
  globalThis.fetch = mock.fn(async () => createOpenRouterResponse(validChairmanPayload));

  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-SHARED-001",
  });
  const result = await runChairman(decisionContext, [sampleAdvisor]);

  assert.equal(result.status, "success");
  assert.equal(result.executionId, "EXEC-SHARED-001");
  assert.equal(result.decision, "test_first");
  assert.equal(result.executiveSummary, validChairmanPayload.executiveSummary);
  assert.equal(result.finalRecommendation, validChairmanPayload.finalRecommendation);
  assert.deepEqual(result.consensus, validChairmanPayload.consensus);
  assert.equal(result.confidence, 0.72);
  assert.equal(result.totalTokens, 300);
  assert.ok(result.durationMs >= 0);
});

test("runChairman returns failed result when model is not configured", async () => {
  delete process.env.OPENROUTER_MODEL_CHAIRMAN;

  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-SHARED-001",
  });
  const result = await runChairman(decisionContext, [sampleAdvisor]);

  assert.equal(result.status, "failed");
  assert.equal(result.executionId, "EXEC-SHARED-001");
  assert.match(result.errorMessage ?? "", /not configured/i);
});

test("runChairman returns failed result when provider returns invalid JSON", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterResponse({ invalid: true }),
  );

  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const decisionContext = createDecisionContext(sampleDecision, {
    executionId: "EXEC-SHARED-001",
  });
  const result = await runChairman(decisionContext, [sampleAdvisor]);

  assert.equal(result.status, "failed");
  assert.equal(result.executionId, "EXEC-SHARED-001");
  assert.ok(result.errorMessage);
});
