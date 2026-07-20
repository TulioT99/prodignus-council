import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdvisorPromptsForPersona,
  mapAdvisorResponseToResultFields,
  parseAdvisorResponseForPersona,
} from "../src/lib/council/advisor-response-router.ts";
import { buildHumanImpactPrompts } from "../src/lib/council/advisors/human-impact-prompt.ts";
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

const validHumanImpactPayload = {
  summary: "Image upload may empower some citizens but exclude others.",
  analysis: [
    {
      title: "Inclusion and autonomy",
      description: "Mandatory upload may reduce autonomy for citizens without digital access.",
    },
  ],
  recommendation: "test_first",
  keyArguments: ["Progressive eligibility guidance preserves dignity better than immediate denial."],
  risks: ["Repeated failures may erode trust in institutions."],
  unknowns: ["Vulnerable group profiles are not specified in the decision context."],
  humanImpact: ["Short-term anxiety for citizens fearing upload mistakes."],
  ethicalConcerns: ["Mandatory digital submission may widen equity gaps."],
  inclusionConcerns: ["Citizens without smartphones may be excluded."],
  longTermEffects: ["May shift support burden to digital channels permanently."],
  confidence: 62,
};

test("ADV-005 routes to the dedicated human impact prompt builder", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-HI-001" });
  const persona = getAdvisorPersonaById("ADV-005");
  const routed = buildAdvisorPromptsForPersona(context, persona);
  const direct = buildHumanImpactPrompts(context);

  assert.equal(routed.systemPrompt, direct.systemPrompt);
  assert.equal(routed.userPrompt, direct.userPrompt);
  assert.match(routed.systemPrompt, /What human outcomes will this decision create\?/);
});

test("ADV-005 persona uses human-impact thinking lens", () => {
  const persona = getAdvisorPersonaById("ADV-005");

  assert.equal(persona.thinkingLens, "human-impact");
  assert.equal(persona.displayName, "The Human Impact Advisor");
});

test("ADV-005 response routes through dedicated parser and mapper", () => {
  const parsed = parseAdvisorResponseForPersona("ADV-005", JSON.stringify(validHumanImpactPayload));
  const mapped = mapAdvisorResponseToResultFields("ADV-005", parsed);

  assert.deepEqual(mapped.humanImpact, validHumanImpactPayload.humanImpact);
  assert.deepEqual(mapped.ethicalConcerns, validHumanImpactPayload.ethicalConcerns);
  assert.deepEqual(mapped.inclusionConcerns, validHumanImpactPayload.inclusionConcerns);
  assert.deepEqual(mapped.longTermEffects, validHumanImpactPayload.longTermEffects);
  assert.deepEqual(mapped.assumptions, []);
  assert.equal(mapped.recommendation, "test_first");
});

test("ADV-001 continues using the generic advisor prompt builder", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-001" });
  const persona = getAdvisorPersonaById("ADV-001");
  const routed = buildAdvisorPromptsForPersona(context, persona);

  assert.match(routed.systemPrompt, /The Contrarian/);
  assert.doesNotMatch(routed.systemPrompt, /What human outcomes will this decision create\?/);
});
