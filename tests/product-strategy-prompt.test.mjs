import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProductStrategyPrompts,
  PRODUCT_STRATEGY_PROMPT_MARKERS,
} from "../src/lib/council/advisors/product-strategy-prompt.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";

const decisionA = {
  id: "DEC-A-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  expectedOutcome: "Faster document verification during guided journeys.",
  createdAt: "2026-07-20T10:00:00.000Z",
  status: "under_review",
};

const decisionB = {
  id: "DEC-B-001",
  title: "Push notification decision",
  question: "Should Prodignus implement push notifications?",
  context: "Citizens may miss important journey updates.",
  constraints: "Mobile platform support is limited.",
  createdAt: "2026-07-20T11:00:00.000Z",
  status: "under_review",
};

const STATIC_NARRATIVE_MARKERS = [
  "guided journeys and open AI conversation",
  "unbounded AI conversation",
  "Open AI conversation requires a separate safety",
];

test("buildProductStrategyPrompts includes shared Decision Context fields", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-PS-001" });
  const { userPrompt } = buildProductStrategyPrompts(context);

  assert.match(userPrompt, /Execution ID: EXEC-PS-001/);
  assert.match(userPrompt, /Should Prodignus implement image upload\?/);
  assert.match(userPrompt, /Language: en/);
  assert.match(userPrompt, /Citizens may need to submit supporting documents/);
  assert.match(userPrompt, /Faster document verification during guided journeys/);
});

test("buildProductStrategyPrompts defines product strategy mission and exclusions", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-PS-001" });
  const { systemPrompt } = buildProductStrategyPrompts(context);

  assert.match(systemPrompt, new RegExp(PRODUCT_STRATEGY_PROMPT_MARKERS.mission));

  for (const concern of PRODUCT_STRATEGY_PROMPT_MARKERS.excludedConcerns) {
    assert.match(systemPrompt, new RegExp(concern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("buildProductStrategyPrompts includes reasoning framework sections", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-PS-001" });
  const { systemPrompt } = buildProductStrategyPrompts(context);

  for (const marker of PRODUCT_STRATEGY_PROMPT_MARKERS.reasoningMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(systemPrompt, /Do not name or expose this sequence/i);
});

test("buildProductStrategyPrompts follows Decision Context language", () => {
  const context = createDecisionContext(decisionA, {
    executionId: "EXEC-PS-001",
    language: "pt-BR",
  });
  const { systemPrompt, userPrompt } = buildProductStrategyPrompts(context);

  assert.match(systemPrompt, /pt-BR/);
  assert.match(userPrompt, /Language: pt-BR/);
});

test("buildProductStrategyPrompts includes decision-first calibration behavior", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-PS-001" });
  const { systemPrompt } = buildProductStrategyPrompts(context);

  for (const marker of PRODUCT_STRATEGY_PROMPT_MARKERS.calibrationMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(systemPrompt, /Do NOT stop thinking or refuse to recommend by default/i);
});

test("different decisions produce different product strategy prompts", () => {
  const contextA = createDecisionContext(decisionA, { executionId: "EXEC-A" });
  const contextB = createDecisionContext(decisionB, { executionId: "EXEC-B" });

  const promptA = buildProductStrategyPrompts(contextA).userPrompt;
  const promptB = buildProductStrategyPrompts(contextB).userPrompt;

  assert.notEqual(promptA, promptB);
  assert.match(promptA, /image upload/i);
  assert.match(promptB, /push notifications/i);
});

test("product strategy prompt contains no static prototype narratives", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-PS-001" });
  const { systemPrompt, userPrompt } = buildProductStrategyPrompts(context);

  for (const marker of STATIC_NARRATIVE_MARKERS) {
    assert.equal(userPrompt.includes(marker), false);
    assert.equal(systemPrompt.includes(marker), false);
  }
});
