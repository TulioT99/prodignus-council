import assert from "node:assert/strict";
import test from "node:test";

import { buildChairmanPrompts } from "../src/lib/council/chairman-prompt.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";

const decision = {
  id: "DEC-20260720-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  createdAt: "2026-07-20T10:00:00.000Z",
  status: "under_review",
};

const successfulAdvisor = {
  persona: {
    id: "ADV-002",
    displayName: "The First Principles Thinker",
    thinkingLens: "first-principles",
  },
  source: "live",
  status: "success",
  executionId: "EXEC-SHARED-001",
  summary: "Image upload should be scoped to document evidence needs.",
  analysis: [
    {
      title: "Citizen need",
      description: "Upload support must map to document verification, not general media sharing.",
    },
  ],
  assumptions: ["Storage can be bounded per journey."],
  risks: ["Privacy exposure if uploads are not scoped."],
  recommendation: "proceed_with_conditions",
  confidence: 0.81,
  durationMs: 100,
  totalTokens: 200,
};

const failedAdvisor = {
  persona: {
    id: "ADV-001",
    displayName: "The Contrarian",
    thinkingLens: "contrarian",
  },
  source: "live",
  status: "failed",
  executionId: "EXEC-SHARED-001",
  summary: "The advisor could not complete this review.",
  analysis: [],
  assumptions: [],
  risks: [],
  recommendation: "insufficient_information",
  confidence: 0,
  durationMs: 0,
  totalTokens: 0,
  errorMessage: "The model provider did not respond within the allowed time.",
};

test("buildChairmanPrompts includes shared decision context", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-SHARED-001" });
  const { userPrompt } = buildChairmanPrompts(context, [successfulAdvisor]);

  assert.match(userPrompt, /Execution ID: EXEC-SHARED-001/);
  assert.match(userPrompt, /Should Prodignus implement image upload\?/);
  assert.match(userPrompt, /Language: en/);
});

test("buildChairmanPrompts includes successful advisor outputs with shared execution ID", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-SHARED-001" });
  const { userPrompt } = buildChairmanPrompts(context, [successfulAdvisor]);

  assert.match(userPrompt, /Image upload should be scoped to document evidence needs/);
  assert.match(userPrompt, /Execution ID: EXEC-SHARED-001/);
});

test("buildChairmanPrompts includes advisor failures", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-SHARED-001" });
  const { userPrompt } = buildChairmanPrompts(context, [failedAdvisor]);

  assert.match(userPrompt, /Advisor failures \(1\)/);
  assert.match(userPrompt, /The Contrarian/);
  assert.match(userPrompt, /did not respond within the allowed time/);
});

test("buildChairmanPrompts instructs against vote counting", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-SHARED-001" });
  const { systemPrompt } = buildChairmanPrompts(context, [successfulAdvisor]);

  assert.match(systemPrompt, /not decide by counting votes/i);
});
