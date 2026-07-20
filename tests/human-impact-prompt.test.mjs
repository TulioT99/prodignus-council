import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHumanImpactPrompts,
  HUMAN_IMPACT_PROMPT_MARKERS,
} from "../src/lib/council/advisors/human-impact-prompt.ts";
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

test("buildHumanImpactPrompts includes shared Decision Context fields", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-HI-001" });
  const { userPrompt } = buildHumanImpactPrompts(context);

  assert.match(userPrompt, /Execution ID: EXEC-HI-001/);
  assert.match(userPrompt, /Should Prodignus implement image upload\?/);
  assert.match(userPrompt, /Language: en/);
  assert.match(userPrompt, /Citizens may need to submit supporting documents/);
  assert.match(userPrompt, /Faster document verification during guided journeys/);
});

test("buildHumanImpactPrompts defines human impact mission and exclusions", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-HI-001" });
  const { systemPrompt } = buildHumanImpactPrompts(context);

  assert.match(systemPrompt, new RegExp(HUMAN_IMPACT_PROMPT_MARKERS.mission));

  for (const concern of HUMAN_IMPACT_PROMPT_MARKERS.excludedConcerns) {
    assert.match(systemPrompt, new RegExp(concern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("buildHumanImpactPrompts includes autonomy dignity and ethical reasoning", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-HI-001" });
  const { systemPrompt, userPrompt } = buildHumanImpactPrompts(context);

  for (const marker of HUMAN_IMPACT_PROMPT_MARKERS.reasoningMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const marker of HUMAN_IMPACT_PROMPT_MARKERS.humanCenteredMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const marker of HUMAN_IMPACT_PROMPT_MARKERS.ethicalMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(userPrompt, /humanImpact/);
  assert.match(userPrompt, /ethicalConcerns/);
  assert.match(userPrompt, /inclusionConcerns/);
  assert.match(userPrompt, /longTermEffects/);
  assert.match(systemPrompt, /Do not name or expose this sequence/i);
});

test("buildHumanImpactPrompts requires human outcome alternatives", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-HI-001" });
  const { systemPrompt, userPrompt } = buildHumanImpactPrompts(context);

  assert.match(systemPrompt, /humanImpact JSON array field/i);
  assert.match(userPrompt, /humanImpact must include at least one expected human outcome/i);
});

test("buildHumanImpactPrompts follows Decision Context language", () => {
  const context = createDecisionContext(decisionA, {
    executionId: "EXEC-HI-001",
    language: "pt-BR",
  });
  const { systemPrompt, userPrompt } = buildHumanImpactPrompts(context);

  assert.match(systemPrompt, /pt-BR/);
  assert.match(userPrompt, /Language: pt-BR/);
});

test("buildHumanImpactPrompts includes decision-first calibration behavior", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-HI-001" });
  const { systemPrompt } = buildHumanImpactPrompts(context);

  for (const marker of HUMAN_IMPACT_PROMPT_MARKERS.calibrationMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(systemPrompt, /Never mix facts, assumptions, and unknowns/i);
});

test("different decisions produce different human impact prompts", () => {
  const contextA = createDecisionContext(decisionA, { executionId: "EXEC-A" });
  const contextB = createDecisionContext(decisionB, { executionId: "EXEC-B" });

  const promptA = buildHumanImpactPrompts(contextA).userPrompt;
  const promptB = buildHumanImpactPrompts(contextB).userPrompt;

  assert.notEqual(promptA, promptB);
  assert.match(promptA, /image upload/i);
  assert.match(promptB, /push notifications/i);
});

test("human impact prompt contains no static prototype narratives", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-HI-001" });
  const { systemPrompt, userPrompt } = buildHumanImpactPrompts(context);

  for (const marker of STATIC_NARRATIVE_MARKERS) {
    assert.equal(userPrompt.includes(marker), false);
    assert.equal(systemPrompt.includes(marker), false);
  }
});
