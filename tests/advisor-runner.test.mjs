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

const validProductStrategyPayload = {
  summary: "Goiânia offers stronger learning value for the first pilot.",
  analysis: [
    {
      title: "Strategic fit",
      description: "Goiânia provides higher citizen reach for validation.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: ["Higher partner readiness in Goiânia."],
  assumptions: ["Pilot budget covers both options equally."],
  risks: ["Opportunity cost of delaying Palmas learnings."],
  unknowns: ["Actual citizen adoption rate is unknown."],
  confidence: 72,
};

const sampleDecision = {
  id: "DEC-20260722-001",
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

function createOpenRouterResponse(content, model, usageOverrides = {}) {
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
        ...usageOverrides,
      },
    }),
  };
}

function createAdvisorResponse(model) {
  if (model === "test/product-strategy") {
    return validProductStrategyPayload;
  }

  return validContrarianPayload;
}

let originalFetch;
let originalEnv;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalEnv = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_REQUEST_TIMEOUT_MS: process.env.OPENROUTER_REQUEST_TIMEOUT_MS,
    ...Object.fromEntries(
      Object.keys(advisorModels).map((key) => [key, process.env[key]]),
    ),
  };

  process.env.OPENROUTER_API_KEY = "test-key";
  delete process.env.OPENROUTER_REQUEST_TIMEOUT_MS;
  for (const [key, value] of Object.entries(advisorModels)) {
    process.env[key] = value;
  }
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.OPENROUTER_API_KEY = originalEnv.OPENROUTER_API_KEY;
  process.env.OPENROUTER_REQUEST_TIMEOUT_MS = originalEnv.OPENROUTER_REQUEST_TIMEOUT_MS;
  for (const key of Object.keys(advisorModels)) {
    process.env[key] = originalEnv[key];
  }
  mock.restoreAll();
});

test("runAdvisor selects model from advisor-specific environment variable", async () => {
  const capturedModels = [];

  globalThis.fetch = mock.fn(async (_url, options) => {
    const body = JSON.parse(options.body);
    capturedModels.push(body.model);
    return createOpenRouterResponse(createAdvisorResponse(body.model), body.model);
  });

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const context = createDecisionContext(sampleDecision, { executionId: "EXEC-MODEL-001" });
  const persona = getAdvisorPersonaById("ADV-002");
  const config = getAdvisorExecutionConfig("ADV-002");

  const result = await runAdvisor(context, persona, config);

  assert.equal(capturedModels.length, 1);
  assert.equal(capturedModels[0], "test/product-strategy");
  assert.equal(result.status, "success");
  assert.equal(result.persona.model, "test/product-strategy");
});

test("runAdvisor uses persona-specific system prompt", async () => {
  const capturedPrompts = [];

  globalThis.fetch = mock.fn(async (_url, options) => {
    const body = JSON.parse(options.body);
    capturedPrompts.push(body.messages.find((message) => message.role === "system").content);
    return createOpenRouterResponse(createAdvisorResponse(body.model), body.model);
  });

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const context = createDecisionContext(sampleDecision, { executionId: "EXEC-PROMPT-001" });

  await runAdvisor(context, getAdvisorPersonaById("ADV-001"), getAdvisorExecutionConfig("ADV-001"));
  await runAdvisor(context, getAdvisorPersonaById("ADV-002"), getAdvisorExecutionConfig("ADV-002"));

  assert.match(capturedPrompts[0], /Contrarian/);
  assert.match(capturedPrompts[1], /Product Strategy Advisor/);
  assert.notEqual(capturedPrompts[0], capturedPrompts[1]);
});

test("runAdvisor parses valid structured output and normalizes confidence to 0-1", async () => {
  globalThis.fetch = mock.fn(async (_url, options) => {
    const body = JSON.parse(options.body);
    return createOpenRouterResponse(createAdvisorResponse(body.model), body.model);
  });

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const context = createDecisionContext(sampleDecision, { executionId: "EXEC-PARSE-001" });
  const result = await runAdvisor(
    context,
    getAdvisorPersonaById("ADV-002"),
    getAdvisorExecutionConfig("ADV-002"),
  );

  assert.equal(result.status, "success");
  assert.equal(result.confidence, 0.72);
  assert.equal(result.summary, validProductStrategyPayload.summary);
  assert.equal(result.recommendation, "proceed_with_conditions");
  assert.ok(Array.isArray(result.assumptions));
  assert.ok(Array.isArray(result.risks));
});

test("runAdvisor returns failed result for malformed JSON without throwing", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "test/contrarian",
      choices: [{ message: { role: "assistant", content: "not-json" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }),
  }));

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const result = await runAdvisor(
    createDecisionContext(sampleDecision, { executionId: "EXEC-MALFORMED-001" }),
    getAdvisorPersonaById("ADV-001"),
    getAdvisorExecutionConfig("ADV-001"),
  );

  assert.equal(result.status, "failed");
  assert.ok(result.errorMessage);
  assert.equal(result.confidence, 0);
});

test("runAdvisor returns failed result for schema validation failure", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterResponse(
      {
        summary: "Missing required fields.",
      },
      "test/contrarian",
    ),
  );

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const result = await runAdvisor(
    createDecisionContext(sampleDecision, { executionId: "EXEC-SCHEMA-001" }),
    getAdvisorPersonaById("ADV-001"),
    getAdvisorExecutionConfig("ADV-001"),
  );

  assert.equal(result.status, "failed");
  assert.match(result.errorMessage, /validated/i);
});

test("runAdvisor normalizes OpenRouter provider errors into safe failed results", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: false,
    status: 429,
    json: async () => ({
      error: { message: "Rate limit exceeded" },
    }),
  }));

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const result = await runAdvisor(
    createDecisionContext(sampleDecision, { executionId: "EXEC-429-001" }),
    getAdvisorPersonaById("ADV-001"),
    getAdvisorExecutionConfig("ADV-001"),
  );

  assert.equal(result.status, "failed");
  assert.match(result.errorMessage, /Rate limit exceeded/);
});

test("runAdvisor returns failed result when model environment variable is missing", async () => {
  delete process.env.OPENROUTER_MODEL_CONTRARIAN;

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const result = await runAdvisor(
    createDecisionContext(sampleDecision, { executionId: "EXEC-MISSING-001" }),
    getAdvisorPersonaById("ADV-001"),
    getAdvisorExecutionConfig("ADV-001"),
  );

  assert.equal(result.status, "failed");
  assert.match(result.errorMessage, /not configured/i);
  assert.equal(globalThis.fetch, originalFetch);
});

test("runAdvisor extracts token usage from provider response", async () => {
  globalThis.fetch = mock.fn(async (_url, options) => {
    const body = JSON.parse(options.body);
    return createOpenRouterResponse(createAdvisorResponse(body.model), body.model, {
      prompt_tokens: 111,
      completion_tokens: 222,
      total_tokens: 333,
      cost: 0.0042,
    });
  });

  const { runAdvisor } = await import("../src/lib/council/advisor-runner.ts");
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { getAdvisorExecutionConfig } = await import(
    "../src/lib/council/advisor-execution-config.ts"
  );
  const { getAdvisorPersonaById } = await import("../src/data/advisor-personas.ts");

  const result = await runAdvisor(
    createDecisionContext(sampleDecision, { executionId: "EXEC-TOKENS-001" }),
    getAdvisorPersonaById("ADV-002"),
    getAdvisorExecutionConfig("ADV-002"),
  );

  assert.equal(result.status, "success");
  assert.equal(result.promptTokens, 111);
  assert.equal(result.completionTokens, 222);
  assert.equal(result.totalTokens, 333);
  assert.equal(result.estimatedCostUsd, 0.0042);
});

test("callOpenRouter retries transient provider failures", async () => {
  let attempts = 0;

  globalThis.fetch = mock.fn(async () => {
    attempts += 1;

    if (attempts < 3) {
      return {
        ok: false,
        status: 503,
        json: async () => ({
          error: { message: "Service unavailable" },
        }),
      };
    }

    return createOpenRouterResponse(validContrarianPayload, "test/contrarian");
  });

  const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");
  const result = await callOpenRouter({
    model: "test/contrarian",
    systemPrompt: "system",
    userPrompt: "user",
  });

  assert.equal(attempts, 3);
  assert.equal(result.retryCount, 2);
  assert.match(result.content, /Pilot scope should be narrowed/);
});

test("resolveOpenRouterTimeoutMs uses configured timeout value", async () => {
  process.env.OPENROUTER_REQUEST_TIMEOUT_MS = "1500";

  const { resolveOpenRouterTimeoutMs } = await import("../src/lib/openrouter/client.ts");
  assert.equal(resolveOpenRouterTimeoutMs(), 1500);
});
