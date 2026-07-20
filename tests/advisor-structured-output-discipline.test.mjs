import assert from "node:assert/strict";
import test from "node:test";

import { buildAdvisorPrompts, ADVISOR_PROMPT_MARKERS } from "../src/lib/council/advisor-prompt.ts";
import {
  buildDeliveryEngineeringPrompts,
  DELIVERY_ENGINEERING_PROMPT_MARKERS,
} from "../src/lib/council/advisors/delivery-engineering-prompt.ts";
import { buildHumanImpactPrompts } from "../src/lib/council/advisors/human-impact-prompt.ts";
import { buildProductStrategyPrompts } from "../src/lib/council/advisors/product-strategy-prompt.ts";
import { buildUxAccessibilityPrompts } from "../src/lib/council/advisors/ux-accessibility-prompt.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";
import { getAdvisorPersonaById } from "../src/data/advisor-personas.ts";

const decision = {
  id: "DEC-DISC-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  expectedOutcome: "Faster document verification during guided journeys.",
  createdAt: "2026-07-20T10:00:00.000Z",
  status: "under_review",
};

const JSON_DISCIPLINE_MARKERS = [
  "Every array field in the schema must appear",
  "confidence value must be a JSON number",
  "All schema array fields must be present",
];

const advisors = [
  {
    id: "ADV-001",
    build: () =>
      buildAdvisorPrompts(
        createDecisionContext(decision, { executionId: "EXEC-DISC-001" }),
        getAdvisorPersonaById("ADV-001"),
      ),
  },
  {
    id: "ADV-002",
    build: () =>
      buildProductStrategyPrompts(
        createDecisionContext(decision, { executionId: "EXEC-DISC-002" }),
      ),
  },
  {
    id: "ADV-003",
    build: () =>
      buildUxAccessibilityPrompts(
        createDecisionContext(decision, { executionId: "EXEC-DISC-003" }),
      ),
  },
  {
    id: "ADV-004",
    build: () =>
      buildDeliveryEngineeringPrompts(
        createDecisionContext(decision, { executionId: "EXEC-DISC-004" }),
      ),
  },
  {
    id: "ADV-005",
    build: () =>
      buildHumanImpactPrompts(
        createDecisionContext(decision, { executionId: "EXEC-DISC-005" }),
      ),
  },
];

for (const advisor of advisors) {
  test(`${advisor.id} prompt includes structured JSON output discipline`, () => {
    const { systemPrompt, userPrompt } = advisor.build();
    const combined = `${systemPrompt}\n${userPrompt}`;

    for (const marker of JSON_DISCIPLINE_MARKERS) {
      assert.match(combined, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });
}

test("ADV-001 Contrarian prompt excludes dedicated-advisor keyArguments requirements", () => {
  const { userPrompt } = buildAdvisorPrompts(
    createDecisionContext(decision, { executionId: "EXEC-DISC-001" }),
    getAdvisorPersonaById("ADV-001"),
  );

  assert.doesNotMatch(userPrompt, /- keyArguments: target/i);
  assert.doesNotMatch(userPrompt, /- unknowns: target/i);
});

test("ADV-004 Delivery Engineering retains technicalAlternatives field discipline", () => {
  const { systemPrompt, userPrompt } = buildDeliveryEngineeringPrompts(
    createDecisionContext(decision, { executionId: "EXEC-DISC-004" }),
  );
  const combined = `${systemPrompt}\n${userPrompt}`;

  for (const marker of DELIVERY_ENGINEERING_PROMPT_MARKERS.jsonFieldDisciplineMarkers) {
    assert.match(combined, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("ADV-001 Contrarian retains schema mapping discipline", () => {
  const { systemPrompt } = buildAdvisorPrompts(
    createDecisionContext(decision, { executionId: "EXEC-DISC-001" }),
    getAdvisorPersonaById("ADV-001"),
  );

  for (const marker of ADVISOR_PROMPT_MARKERS.schemaMappingMarkers) {
    assert.match(systemPrompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
