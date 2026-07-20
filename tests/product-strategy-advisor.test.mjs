import assert from "node:assert/strict";
import test from "node:test";

import { buildAdvisorPromptsForPersona } from "../src/lib/council/advisor-response-router.ts";
import { buildProductStrategyPrompts } from "../src/lib/council/advisors/product-strategy-prompt.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";
import { getAdvisorPersonaById } from "../src/data/advisor-personas.ts";

const decision = {
  id: "DEC-A-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  createdAt: "2026-07-20T10:00:00.000Z",
  status: "under_review",
};

test("ADV-002 routes to the dedicated product strategy prompt builder", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-PS-001" });
  const persona = getAdvisorPersonaById("ADV-002");
  const routed = buildAdvisorPromptsForPersona(context, persona);
  const direct = buildProductStrategyPrompts(context);

  assert.equal(routed.systemPrompt, direct.systemPrompt);
  assert.equal(routed.userPrompt, direct.userPrompt);
  assert.match(routed.systemPrompt, /Is this decision the right product decision\?/);
});

test("ADV-001 continues using the generic advisor prompt builder", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-001" });
  const persona = getAdvisorPersonaById("ADV-001");
  const routed = buildAdvisorPromptsForPersona(context, persona);

  assert.match(routed.systemPrompt, /The Contrarian/);
  assert.doesNotMatch(routed.systemPrompt, /Is this decision the right product decision\?/);
});
