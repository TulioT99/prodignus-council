import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUxAccessibilityPrompts,
  UX_ACCESSIBILITY_PROMPT_MARKERS,
} from "../src/lib/council/advisors/ux-accessibility-prompt.ts";
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

test("buildUxAccessibilityPrompts includes shared Decision Context fields", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-UX-001" });
  const { userPrompt } = buildUxAccessibilityPrompts(context);

  assert.match(userPrompt, /Execution ID: EXEC-UX-001/);
  assert.match(userPrompt, /Should Prodignus implement image upload\?/);
  assert.match(userPrompt, /Language: en/);
  assert.match(userPrompt, /Citizens may need to submit supporting documents/);
  assert.match(userPrompt, /Faster document verification during guided journeys/);
});

test("buildUxAccessibilityPrompts defines UX mission and exclusions", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-UX-001" });
  const { systemPrompt } = buildUxAccessibilityPrompts(context);

  assert.match(systemPrompt, new RegExp(UX_ACCESSIBILITY_PROMPT_MARKERS.mission));

  for (const concern of UX_ACCESSIBILITY_PROMPT_MARKERS.excludedConcerns) {
    assert.match(systemPrompt, new RegExp(concern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("buildUxAccessibilityPrompts includes accessibility and journey reasoning", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-UX-001" });
  const { systemPrompt, userPrompt } = buildUxAccessibilityPrompts(context);

  for (const marker of UX_ACCESSIBILITY_PROMPT_MARKERS.reasoningMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const marker of UX_ACCESSIBILITY_PROMPT_MARKERS.accessibilityMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(systemPrompt, /cognitive load/i);
  assert.match(userPrompt, /accessibilityConcerns/);
  assert.match(userPrompt, /journeyBarriers/);
  assert.match(systemPrompt, /Do not name or expose this sequence/i);
});

test("buildUxAccessibilityPrompts follows Decision Context language", () => {
  const context = createDecisionContext(decisionA, {
    executionId: "EXEC-UX-001",
    language: "pt-BR",
  });
  const { systemPrompt, userPrompt } = buildUxAccessibilityPrompts(context);

  assert.match(systemPrompt, /pt-BR/);
  assert.match(userPrompt, /Language: pt-BR/);
});

test("buildUxAccessibilityPrompts includes decision-first calibration behavior", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-UX-001" });
  const { systemPrompt } = buildUxAccessibilityPrompts(context);

  for (const marker of UX_ACCESSIBILITY_PROMPT_MARKERS.calibrationMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(systemPrompt, /Never mix facts, assumptions, and unknowns/i);
});

test("different decisions produce different UX accessibility prompts", () => {
  const contextA = createDecisionContext(decisionA, { executionId: "EXEC-A" });
  const contextB = createDecisionContext(decisionB, { executionId: "EXEC-B" });

  const promptA = buildUxAccessibilityPrompts(contextA).userPrompt;
  const promptB = buildUxAccessibilityPrompts(contextB).userPrompt;

  assert.notEqual(promptA, promptB);
  assert.match(promptA, /image upload/i);
  assert.match(promptB, /push notifications/i);
});

test("UX accessibility prompt contains no static prototype narratives", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-UX-001" });
  const { systemPrompt, userPrompt } = buildUxAccessibilityPrompts(context);

  for (const marker of STATIC_NARRATIVE_MARKERS) {
    assert.equal(userPrompt.includes(marker), false);
    assert.equal(systemPrompt.includes(marker), false);
  }
});
