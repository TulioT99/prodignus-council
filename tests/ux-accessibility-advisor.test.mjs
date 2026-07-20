import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdvisorPromptsForPersona,
  mapAdvisorResponseToResultFields,
  parseAdvisorResponseForPersona,
} from "../src/lib/council/advisor-response-router.ts";
import { buildUxAccessibilityPrompts } from "../src/lib/council/advisors/ux-accessibility-prompt.ts";
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

const validUxPayload = {
  summary: "Citizens may struggle to complete upload without clear guidance.",
  analysis: [
    {
      title: "Cognitive load",
      description: "Upload steps add decision fatigue for citizens under stress.",
    },
  ],
  recommendation: "test_first",
  keyArguments: ["Guided capture can reduce abandonment if kept to one task at a time."],
  risks: ["Repeated failures may erode trust."],
  unknowns: ["Citizen device profile is not specified in the decision context."],
  accessibilityConcerns: ["Screen reader labels for upload controls must be explicit."],
  journeyBarriers: ["Limited mobile data may prevent large file retries."],
  confidence: 65,
};

test("ADV-003 routes to the dedicated UX accessibility prompt builder", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-UX-001" });
  const persona = getAdvisorPersonaById("ADV-003");
  const routed = buildAdvisorPromptsForPersona(context, persona);
  const direct = buildUxAccessibilityPrompts(context);

  assert.equal(routed.systemPrompt, direct.systemPrompt);
  assert.equal(routed.userPrompt, direct.userPrompt);
  assert.match(
    routed.systemPrompt,
    /Can the intended citizen successfully understand, trust, and complete this experience\?/,
  );
});

test("ADV-003 persona uses ux-accessibility thinking lens", () => {
  const persona = getAdvisorPersonaById("ADV-003");

  assert.equal(persona.thinkingLens, "ux-accessibility");
  assert.equal(persona.displayName, "The UX & Accessibility Advisor");
});

test("ADV-003 response routes through dedicated parser and mapper", () => {
  const parsed = parseAdvisorResponseForPersona("ADV-003", JSON.stringify(validUxPayload));
  const mapped = mapAdvisorResponseToResultFields("ADV-003", parsed);

  assert.deepEqual(mapped.accessibilityConcerns, validUxPayload.accessibilityConcerns);
  assert.deepEqual(mapped.journeyBarriers, validUxPayload.journeyBarriers);
  assert.deepEqual(mapped.assumptions, []);
  assert.equal(mapped.recommendation, "test_first");
});

test("ADV-001 continues using the generic advisor prompt builder", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-001" });
  const persona = getAdvisorPersonaById("ADV-001");
  const routed = buildAdvisorPromptsForPersona(context, persona);

  assert.match(routed.systemPrompt, /The Contrarian/);
  assert.doesNotMatch(
    routed.systemPrompt,
    /Can the intended citizen successfully understand, trust, and complete this experience\?/,
  );
});
