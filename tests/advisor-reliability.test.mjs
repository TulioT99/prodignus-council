import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

const validContrarianPayload = {
  summary: "Pilot scope should be narrowed before proceeding.",
  analysis: [
    {
      title: "Hidden costs",
      description: "Operational burden may exceed initial estimates.",
    },
  ],
  assumptions: ["Partner readiness is overstated."],
  risks: ["Citizen trust erosion if rollout fails."],
  recommendation: "test_first",
  confidence: 65,
};

const sampleDecision = {
  id: "DEC-20260722-REL-001",
  title: "Territorial pilot selection",
  question:
    "Should Prodignus prioritize the first territorial pilot in Goiânia, Goiás, or Palmas, Tocantins?",
  context:
    "Consider citizen reach, implementation complexity, partner readiness, learning value, cost, accessibility, human impact, and operational risk.",
  constraints: "Pilot must launch within one quarter.",
  createdAt: "2026-07-22T10:00:00.000Z",
  status: "under_review",
};

const advisorModels = {
  OPENROUTER_MODEL_CONTRARIAN: "test/contrarian",
  OPENROUTER_MODEL_PRODUCT_STRATEGY: "test/product-strategy",
  OPENROUTER_MODEL_UX_ACCESSIBILITY: "test/ux-accessibility",
  OPENROUTER_MODEL_DELIVERY_ENGINEERING: "test/delivery-engineering",
  OPENROUTER_MODEL_HUMAN_IMPACT: "test/human-impact",
};

function createOpenRouterResponse(content, model) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      model,
      choices: [{ message: { role: "assistant", content: JSON.stringify(content) } }],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 180,
        total_tokens: 300,
      },
    }),
  };
}

let originalFetch;
let originalEnv;

beforeEach(async () => {
  originalFetch = globalThis.fetch;
  originalEnv = { ...process.env };
  process.env.OPENROUTER_API_KEY = "test-key";
  delete process.env.OPENROUTER_REQUEST_TIMEOUT_MS;
  delete process.env.COUNCIL_ADVISOR_TIMEOUT_MS;
  delete process.env.COUNCIL_OVERALL_TIMEOUT_MS;
  delete process.env.COUNCIL_RETRY_MAX_ATTEMPTS;
  for (const [key, value] of Object.entries(advisorModels)) {
    process.env[key] = value;
  }
  const { resetRuntimeConfigForTests } = await import("../src/config/runtime.ts");
  resetRuntimeConfigForTests();
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  process.env = originalEnv;
  const { resetRuntimeConfigForTests } = await import("../src/config/runtime.ts");
  resetRuntimeConfigForTests();
  mock.restoreAll();
});

test("normalizeAdvisorConfidence maps parser 0-100 scale to unit interval", async () => {
  const { normalizeAdvisorConfidence } = await import(
    "../src/lib/council/advisor-execution-result.ts"
  );

  assert.equal(normalizeAdvisorConfidence(72), 0.72);
  assert.equal(normalizeAdvisorConfidence(0), 0);
  assert.equal(normalizeAdvisorConfidence(100), 1);
  assert.equal(normalizeAdvisorConfidence(150), 1);
  assert.equal(normalizeAdvisorConfidence(Number.NaN), 0);
});

test("selectValidatedAdvisorOpinions excludes failed advisors and keeps normalized confidence", async () => {
  const { selectValidatedAdvisorOpinions } = await import(
    "../src/lib/council/validated-advisor-opinions.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const successPersona = getAdvisorPersonaById("ADV-001");
  const failedPersona = getAdvisorPersonaById("ADV-002");

  const opinions = selectValidatedAdvisorOpinions([
    {
      persona: successPersona,
      source: "live",
      status: "success",
      executionId: "EXEC-VAL-001",
      summary: "Proceed carefully.",
      analysis: [],
      assumptions: ["Budget holds."],
      risks: ["Delay risk."],
      recommendation: "proceed_with_conditions",
      confidence: 0.8,
      keyArguments: ["Learning value."],
      unknowns: ["Adoption rate."],
      durationMs: 1200,
      totalTokens: 100,
    },
    {
      persona: failedPersona,
      source: "live",
      status: "failed",
      executionId: "EXEC-VAL-001",
      summary: "The advisor could not complete this review.",
      analysis: [],
      assumptions: [],
      risks: [],
      recommendation: "insufficient_information",
      confidence: 0,
      durationMs: 50,
      totalTokens: 0,
      errorMessage: "timeout",
    },
  ]);

  assert.equal(opinions.length, 1);
  assert.equal(opinions[0].advisorId, "ADV-001");
  assert.equal(opinions[0].confidence, 0.8);
  assert.equal(opinions[0].recommendation, "proceed_with_conditions");
});

test("runAdvisor records durationMs on provider failure", async () => {
  globalThis.fetch = mock.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    return {
      ok: false,
      status: 503,
      json: async () => ({ error: { message: "unavailable" } }),
    };
  });

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const result = await runAdvisor(
    createDecisionContext(sampleDecision, { executionId: "EXEC-DUR-001" }),
    getAdvisorPersonaById("ADV-001"),
    getAdvisorExecutionConfig("ADV-001"),
  );

  assert.equal(result.status, "failed");
  assert.ok(result.durationMs >= 20);
  assert.equal(result.errorMessage, "The model provider returned an error.");
});

test("runAdvisor timeout uses runtime advisor timeout and returns failed result", async () => {
  const { resetRuntimeConfigForTests } = await import("../src/config/runtime.ts");
  process.env.COUNCIL_ADVISOR_TIMEOUT_MS = "40";
  process.env.COUNCIL_RETRY_MAX_ATTEMPTS = "1";
  resetRuntimeConfigForTests();

  globalThis.fetch = mock.fn(async (_url, options) => {
    assert.ok(options.signal instanceof AbortSignal);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 500);
      options.signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        },
        { once: true },
      );
    });

    return createOpenRouterResponse(validContrarianPayload, "test/contrarian");
  });

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const result = await runAdvisor(
    createDecisionContext(sampleDecision, { executionId: "EXEC-TIMEOUT-001" }),
    getAdvisorPersonaById("ADV-001"),
    getAdvisorExecutionConfig("ADV-001"),
  );

  assert.equal(result.status, "failed");
  assert.match(result.errorMessage, /allowed time/i);
  assert.ok(result.durationMs >= 30);
});

test("runAdvisor cancellation aborts provider work without retry", async () => {
  const { resetRuntimeConfigForTests } = await import("../src/config/runtime.ts");
  process.env.COUNCIL_RETRY_MAX_ATTEMPTS = "3";
  resetRuntimeConfigForTests();

  let fetchCalls = 0;
  const controller = new AbortController();

  globalThis.fetch = mock.fn(async (_url, options) => {
    fetchCalls += 1;
    assert.ok(options.signal instanceof AbortSignal);

    await new Promise((resolve, reject) => {
      options.signal.addEventListener(
        "abort",
        () => {
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        },
        { once: true },
      );
    });

    return createOpenRouterResponse(validContrarianPayload, "test/contrarian");
  });

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");
  const { ABORT_REASON_CANCELLED } = await import("../src/lib/council/execution-abort.ts");

  const pending = runAdvisor(
    createDecisionContext(sampleDecision, { executionId: "EXEC-CANCEL-001" }),
    getAdvisorPersonaById("ADV-001"),
    getAdvisorExecutionConfig("ADV-001"),
    { signal: controller.signal },
  );

  await new Promise((resolve) => setTimeout(resolve, 20));
  controller.abort(ABORT_REASON_CANCELLED);

  const result = await pending;

  assert.equal(result.status, "failed");
  assert.equal(result.errorMessage, "The advisor review was cancelled.");
  assert.equal(fetchCalls, 1);
});

test("callOpenRouter does not retry after REQUEST_CANCELLED", async () => {
  const controller = new AbortController();
  let fetchCalls = 0;

  globalThis.fetch = mock.fn(async (_url, options) => {
    fetchCalls += 1;
    await new Promise((resolve, reject) => {
      options.signal.addEventListener(
        "abort",
        () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" })),
        { once: true },
      );
    });
    return createOpenRouterResponse(validContrarianPayload, "test/contrarian");
  });

  const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");
  const { OpenRouterClientError } = await import("../src/lib/openrouter/types.ts");
  const { ABORT_REASON_CANCELLED } = await import("../src/lib/council/execution-abort.ts");

  const pending = callOpenRouter({
    model: "test/contrarian",
    systemPrompt: "system",
    userPrompt: "user",
    signal: controller.signal,
  });

  await new Promise((resolve) => setTimeout(resolve, 15));
  controller.abort(ABORT_REASON_CANCELLED);

  await assert.rejects(pending, (error) => {
    assert.ok(error instanceof OpenRouterClientError);
    assert.equal(error.code, "REQUEST_CANCELLED");
    assert.equal(error.retryable, false);
    return true;
  });

  assert.equal(fetchCalls, 1);
});

test("runAdvisor still succeeds for valid provider responses after reliability refactor", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterResponse(validContrarianPayload, "test/contrarian"),
  );

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const result = await runAdvisor(
    createDecisionContext(sampleDecision, { executionId: "EXEC-OK-001" }),
    getAdvisorPersonaById("ADV-001"),
    getAdvisorExecutionConfig("ADV-001"),
  );

  assert.equal(result.status, "success");
  assert.equal(result.confidence, 0.65);
  assert.equal(result.recommendation, "test_first");
});

test("mapWithConcurrency does not start new work after abort", async () => {
  const { mapWithConcurrency } = await import("../src/lib/council/concurrency.ts");
  const { ABORT_REASON_CANCELLED } = await import("../src/lib/council/execution-abort.ts");

  const controller = new AbortController();
  const started = [];

  const resultsPromise = mapWithConcurrency(
    [1, 2, 3, 4, 5],
    1,
    async (item) => {
      started.push(item);
      if (item === 1) {
        controller.abort(ABORT_REASON_CANCELLED);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return item * 10;
    },
    controller.signal,
  );

  const results = await resultsPromise;

  assert.equal(started.length, 1);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "rejected");
  assert.equal(results[4].status, "rejected");
});
