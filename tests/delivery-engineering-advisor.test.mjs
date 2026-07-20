import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdvisorPromptsForPersona,
  mapAdvisorResponseToResultFields,
  parseAdvisorResponseForPersona,
} from "../src/lib/council/advisor-response-router.ts";
import { buildDeliveryEngineeringPrompts } from "../src/lib/council/advisors/delivery-engineering-prompt.ts";
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

const validEngineeringPayload = {
  summary: "Image upload is feasible with bounded scope.",
  analysis: [
    {
      title: "Operational impact",
      description: "Upload monitoring and alerting must be in place before production rollout.",
    },
  ],
  recommendation: "test_first",
  keyArguments: ["Phased rollout reduces deployment and integration risk."],
  risks: ["Integration failure with storage backend — mitigation: contract tests in CI."],
  unknowns: ["Storage encryption requirements are not specified in the decision context."],
  engineeringConcerns: ["New upload API increases surface area for security review."],
  operationalConcerns: ["Failure recovery paths for interrupted uploads need runbooks."],
  technicalAlternatives: ["Reuse existing attachment upload capability with size limits."],
  confidence: 70,
};

test("ADV-004 routes to the dedicated delivery engineering prompt builder", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-DE-001" });
  const persona = getAdvisorPersonaById("ADV-004");
  const routed = buildAdvisorPromptsForPersona(context, persona);
  const direct = buildDeliveryEngineeringPrompts(context);

  assert.equal(routed.systemPrompt, direct.systemPrompt);
  assert.equal(routed.userPrompt, direct.userPrompt);
  assert.match(
    routed.systemPrompt,
    /Can this decision be implemented, deployed, operated and maintained successfully\?/,
  );
});

test("ADV-004 persona uses delivery-engineering thinking lens", () => {
  const persona = getAdvisorPersonaById("ADV-004");

  assert.equal(persona.thinkingLens, "delivery-engineering");
  assert.equal(persona.displayName, "The Delivery Engineering Advisor");
});

test("ADV-004 response routes through dedicated parser and mapper", () => {
  const parsed = parseAdvisorResponseForPersona("ADV-004", JSON.stringify(validEngineeringPayload));
  const mapped = mapAdvisorResponseToResultFields("ADV-004", parsed);

  assert.deepEqual(mapped.engineeringConcerns, validEngineeringPayload.engineeringConcerns);
  assert.deepEqual(mapped.operationalConcerns, validEngineeringPayload.operationalConcerns);
  assert.deepEqual(mapped.technicalAlternatives, validEngineeringPayload.technicalAlternatives);
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
    /Can this decision be implemented, deployed, operated and maintained successfully\?/,
  );
});
