import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeliveryEngineeringPrompts,
  DELIVERY_ENGINEERING_PROMPT_MARKERS,
} from "../src/lib/council/advisors/delivery-engineering-prompt.ts";
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

test("buildDeliveryEngineeringPrompts includes shared Decision Context fields", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-DE-001" });
  const { userPrompt } = buildDeliveryEngineeringPrompts(context);

  assert.match(userPrompt, /Execution ID: EXEC-DE-001/);
  assert.match(userPrompt, /Should Prodignus implement image upload\?/);
  assert.match(userPrompt, /Language: en/);
  assert.match(userPrompt, /Citizens may need to submit supporting documents/);
  assert.match(userPrompt, /Faster document verification during guided journeys/);
});

test("buildDeliveryEngineeringPrompts defines engineering mission and exclusions", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-DE-001" });
  const { systemPrompt } = buildDeliveryEngineeringPrompts(context);

  assert.match(systemPrompt, new RegExp(DELIVERY_ENGINEERING_PROMPT_MARKERS.mission));

  for (const concern of DELIVERY_ENGINEERING_PROMPT_MARKERS.excludedConcerns) {
    assert.match(systemPrompt, new RegExp(concern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("buildDeliveryEngineeringPrompts includes engineering and operational reasoning", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-DE-001" });
  const { systemPrompt, userPrompt } = buildDeliveryEngineeringPrompts(context);

  for (const marker of DELIVERY_ENGINEERING_PROMPT_MARKERS.reasoningMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const marker of DELIVERY_ENGINEERING_PROMPT_MARKERS.engineeringMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const marker of DELIVERY_ENGINEERING_PROMPT_MARKERS.operationalMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(userPrompt, /engineeringConcerns/);
  assert.match(userPrompt, /operationalConcerns/);
  assert.match(userPrompt, /technicalAlternatives/);
  assert.match(systemPrompt, /Do not name or expose this sequence/i);
});

test("buildDeliveryEngineeringPrompts requires technical alternatives", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-DE-001" });
  const { systemPrompt, userPrompt } = buildDeliveryEngineeringPrompts(context);

  assert.match(systemPrompt, /at least one lower-risk implementation alternative/i);
  assert.match(userPrompt, /technicalAlternatives must include at least one lower-risk genuine decision option/i);
  assert.match(userPrompt, /alternatives in analysis or keyArguments do not replace it/i);
});

test("buildDeliveryEngineeringPrompts includes JSON field discipline", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-DE-001" });
  const { systemPrompt, userPrompt } = buildDeliveryEngineeringPrompts(context);

  for (const marker of DELIVERY_ENGINEERING_PROMPT_MARKERS.jsonFieldDisciplineMarkers) {
    assert.match(
      `${systemPrompt}\n${userPrompt}`,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("buildDeliveryEngineeringPrompts follows Decision Context language", () => {
  const context = createDecisionContext(decisionA, {
    executionId: "EXEC-DE-001",
    language: "pt-BR",
  });
  const { systemPrompt, userPrompt } = buildDeliveryEngineeringPrompts(context);

  assert.match(systemPrompt, /pt-BR/);
  assert.match(userPrompt, /Language: pt-BR/);
});

test("buildDeliveryEngineeringPrompts includes decision-first calibration behavior", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-DE-001" });
  const { systemPrompt } = buildDeliveryEngineeringPrompts(context);

  for (const marker of DELIVERY_ENGINEERING_PROMPT_MARKERS.calibrationMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(systemPrompt, /Never mix facts, assumptions, and unknowns/i);
});

test("different decisions produce different delivery engineering prompts", () => {
  const contextA = createDecisionContext(decisionA, { executionId: "EXEC-A" });
  const contextB = createDecisionContext(decisionB, { executionId: "EXEC-B" });

  const promptA = buildDeliveryEngineeringPrompts(contextA).userPrompt;
  const promptB = buildDeliveryEngineeringPrompts(contextB).userPrompt;

  assert.notEqual(promptA, promptB);
  assert.match(promptA, /image upload/i);
  assert.match(promptB, /push notifications/i);
});

test("delivery engineering prompt contains no static prototype narratives", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-DE-001" });
  const { systemPrompt, userPrompt } = buildDeliveryEngineeringPrompts(context);

  for (const marker of STATIC_NARRATIVE_MARKERS) {
    assert.equal(userPrompt.includes(marker), false);
    assert.equal(systemPrompt.includes(marker), false);
  }
});
