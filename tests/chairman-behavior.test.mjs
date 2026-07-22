import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

import {
  createOpenRouterChairmanResponse,
  validChairmanPayload,
} from "./chairman-fixtures.mjs";

const sampleDecision = {
  id: "DEC-20260722-001",
  title: "Territorial pilot selection",
  question:
    "Should Prodignus prioritize the first territorial pilot in Goiânia, Goiás, or Palmas, Tocantins?",
  context: "Consider citizen reach, implementation complexity, partner readiness, and operational risk.",
  constraints: "Pilot must launch within one quarter.",
  createdAt: "2026-07-22T10:00:00.000Z",
  status: "under_review",
};

function createAdvisor({
  id,
  name,
  status = "success",
  recommendation = "proceed_with_conditions",
  summary,
  confidence = 0.7,
  keyArguments = ["Evidence-based argument."],
  errorMessage,
}) {
  return {
    persona: {
      id,
      displayName: name,
      thinkingLens: id === "ADV-001" ? "contrarian" : "product-strategy",
      expertise: "Council advisor",
      background: "Advisor background",
      yearsExperience: 10,
      mission: "Provide perspective",
      decisionStyle: "Analytical",
      coreBeliefs: ["Evidence matters"],
      model: "test/model",
    },
    source: "live",
    status,
    executionId: "EXEC-BEHAVIOR-001",
    summary,
    analysis: [{ title: "Core issue", description: summary }],
    assumptions: ["Partner readiness is uncertain."],
    risks: ["Operational risk if rollout is rushed."],
    recommendation,
    confidence,
    keyArguments,
    durationMs: 100,
    totalTokens: 200,
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

test("Chairman prompt preserves failed advisors and instructs against vote counting", async () => {
  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { defaultChairmanContextBuilder } = await import(
    "../src/lib/council/chairman-context-builder.ts"
  );
  const { buildChairmanPrompts } = await import("../src/lib/council/chairman-prompt.ts");

  const advisors = [
    createAdvisor({
      id: "ADV-002",
      name: "Product Strategy",
      summary: "Prefer Goiânia for reach.",
    }),
    createAdvisor({
      id: "ADV-001",
      name: "The Contrarian",
      status: "failed",
      summary: "The advisor could not complete this review.",
      errorMessage: "Provider timeout",
    }),
  ];

  const context = defaultChairmanContextBuilder.build({
    decisionContext: createDecisionContext(sampleDecision, { executionId: "EXEC-BEHAVIOR-001" }),
    advisors,
  });
  const { systemPrompt, userPrompt } = buildChairmanPrompts(context);

  assert.match(systemPrompt, /vote counts/i);
  assert.match(userPrompt, /Failed advisors \(1\)/);
  assert.match(userPrompt, /Failure category: PROVIDER_TIMEOUT/);
  assert.match(userPrompt, /reversalCriteria/);
});

test("runChairman preserves minority Contrarian view fields from structured output", async () => {
  globalThis.fetch = mock.fn(async () => createOpenRouterChairmanResponse(validChairmanPayload));

  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const result = await runChairman(
    createDecisionContext(sampleDecision, { executionId: "EXEC-BEHAVIOR-001" }),
    [
      createAdvisor({
        id: "ADV-001",
        name: "The Contrarian",
        recommendation: "do_not_proceed",
        summary: "Hidden costs may exceed estimates.",
      }),
      createAdvisor({
        id: "ADV-002",
        name: "Product Strategy",
        summary: "Citizen value favors a bounded pilot.",
      }),
      createAdvisor({
        id: "ADV-003",
        name: "UX Advisor",
        summary: "Citizens need guided flows.",
      }),
    ],
  );

  assert.equal(result.status, "success");
  assert.equal(result.minorityView?.advisorId, "ADV-001");
  assert.match(result.recommendationType, /run_bounded_experiment|proceed_with_conditions|defer/);
});

test("runChairman marks reduced-confidence synthesis when exactly three advisors succeed", async () => {
  globalThis.fetch = mock.fn(async () => createOpenRouterChairmanResponse(validChairmanPayload));

  const { createDecisionContext } = await import("../src/lib/council/decision-context.ts");
  const { runChairman } = await import("../src/lib/council/chairman-runner.ts");
  const result = await runChairman(
    createDecisionContext(sampleDecision, { executionId: "EXEC-BEHAVIOR-001" }),
    [
      createAdvisor({ id: "ADV-002", name: "Product Strategy", summary: "Pilot first." }),
      createAdvisor({ id: "ADV-003", name: "UX Advisor", summary: "Reduce cognitive load." }),
      createAdvisor({ id: "ADV-004", name: "Engineering", summary: "Pilot is feasible." }),
      createAdvisor({
        id: "ADV-001",
        name: "The Contrarian",
        status: "failed",
        summary: "Failed",
        errorMessage: "Provider error",
      }),
      createAdvisor({
        id: "ADV-005",
        name: "Human Impact",
        status: "failed",
        summary: "Failed",
        errorMessage: "Provider error",
      }),
    ],
  );

  assert.equal(result.status, "success");
  assert.equal(result.reducedConfidenceSynthesis, true);
  assert.deepEqual(result.missingPerspectives, ["ADV-001", "ADV-005"]);
});
