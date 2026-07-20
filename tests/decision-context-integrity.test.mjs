import assert from "node:assert/strict";
import test from "node:test";

import { buildAdvisorPromptsForPersona } from "../src/lib/council/advisor-response-router.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";
import { getAdvisorPersonaById } from "../src/data/advisor-personas.ts";

const decisionA = {
  id: "DEC-A-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
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

test("every advisor receives the same question from the shared Decision Context", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-SHARED-001" });

  for (const advisorId of ["ADV-001", "ADV-002", "ADV-003", "ADV-004", "ADV-005"]) {
    const { userPrompt } = buildAdvisorPromptsForPersona(
      context,
      getAdvisorPersonaById(advisorId),
    );
    assert.match(userPrompt, /Should Prodignus implement image upload\?/);
  }
});

test("every advisor receives the same execution ID", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-SHARED-001" });

  for (const advisorId of ["ADV-001", "ADV-002", "ADV-003", "ADV-004", "ADV-005"]) {
    const { userPrompt } = buildAdvisorPromptsForPersona(
      context,
      getAdvisorPersonaById(advisorId),
    );
    assert.match(userPrompt, /Execution ID: EXEC-SHARED-001/);
  }
});

test("every advisor receives the same language", () => {
  const context = createDecisionContext(decisionA, {
    executionId: "EXEC-SHARED-001",
    language: "en",
  });

  for (const advisorId of ["ADV-001", "ADV-002", "ADV-003", "ADV-004", "ADV-005"]) {
    const { userPrompt } = buildAdvisorPromptsForPersona(
      context,
      getAdvisorPersonaById(advisorId),
    );
    assert.match(userPrompt, /Language: en/);
  }
});

test("every advisor receives equivalent decision context fields", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-SHARED-001" });

  const prompts = ["ADV-001", "ADV-002", "ADV-003", "ADV-004", "ADV-005"].map((advisorId) =>
    buildAdvisorPromptsForPersona(context, getAdvisorPersonaById(advisorId)).userPrompt,
  );

  for (const prompt of prompts) {
    assert.match(prompt, /Citizens may need to submit supporting documents/);
    assert.match(prompt, /Storage and privacy requirements apply/);
  }
});

test("no advisor prompt contains static prototype narratives", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-SHARED-001" });

  for (const advisorId of ["ADV-001", "ADV-002", "ADV-003", "ADV-004", "ADV-005"]) {
    const { systemPrompt, userPrompt } = buildAdvisorPromptsForPersona(
      context,
      getAdvisorPersonaById(advisorId),
    );

    for (const marker of STATIC_NARRATIVE_MARKERS) {
      assert.equal(
        userPrompt.includes(marker),
        false,
        `Advisor ${advisorId} user prompt must not include static narrative: ${marker}`,
      );
      assert.equal(
        systemPrompt.includes(marker),
        false,
        `Advisor ${advisorId} system prompt must not include static narrative: ${marker}`,
      );
    }
  }
});

test("different user questions produce different advisor prompts", () => {
  const contextA = createDecisionContext(decisionA, { executionId: "EXEC-A" });
  const contextB = createDecisionContext(decisionB, { executionId: "EXEC-B" });
  const persona = getAdvisorPersonaById("ADV-002");

  const promptA = buildAdvisorPromptsForPersona(contextA, persona).userPrompt;
  const promptB = buildAdvisorPromptsForPersona(contextB, persona).userPrompt;

  assert.notEqual(promptA, promptB);
  assert.match(promptA, /image upload/i);
  assert.match(promptB, /push notifications/i);
});

test("createDecisionContext returns an immutable object", () => {
  const context = createDecisionContext(decisionA, { executionId: "EXEC-IMMUTABLE" });

  assert.throws(() => {
    context.question = "changed";
  });
});
