import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeliveryEngineeringPrompts,
  DELIVERY_ENGINEERING_PROMPT_MARKERS,
} from "../src/lib/council/advisors/delivery-engineering-prompt.ts";
import { parseDeliveryEngineeringResponseContent } from "../src/lib/council/advisors/delivery-engineering-response-parser.ts";
import { createDecisionContext } from "../src/lib/council/decision-context.ts";

const decision = {
  id: "DEC-REL-001",
  title: "Image upload decision",
  question: "Should Prodignus implement image upload?",
  context: "Citizens may need to submit supporting documents.",
  constraints: "Storage and privacy requirements apply.",
  expectedOutcome: "Faster document verification during guided journeys.",
  createdAt: "2026-07-20T10:00:00.000Z",
  status: "under_review",
};

const validPayload = {
  summary: "Image upload is feasible with bounded scope but requires careful operational planning.",
  analysis: [
    {
      title: "Implementation complexity",
      description:
        "Upload pipeline needs storage, virus scanning, and retry logic for poor connectivity.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: [
    "Existing object storage patterns can be reused with minimal new infrastructure.",
  ],
  risks: [
    "Storage cost overrun — mitigation: enforce per-journey retention limits and lifecycle policies.",
  ],
  unknowns: ["Current platform storage quota and encryption standards are not specified."],
  engineeringConcerns: [
    "Upload service must integrate with existing authentication and authorization layers.",
  ],
  operationalConcerns: [
    "Observability for upload failures and retry rates must be instrumented before rollout.",
  ],
  technicalAlternatives: [
    "Pilot with feature flag in one journey before platform-wide enablement.",
  ],
  confidence: 74,
};

test("ENG-0009: valid Delivery Engineering response passes parser validation", () => {
  const result = parseDeliveryEngineeringResponseContent(JSON.stringify(validPayload));

  assert.equal(result.recommendation, "proceed_with_conditions");
  assert.equal(result.technicalAlternatives.length, 1);
  assert.equal(result.confidence, 74);
});

test("ENG-0009: prompt requires technicalAlternatives JSON field discipline", () => {
  const context = createDecisionContext(decision, { executionId: "EXEC-REL-001" });
  const { systemPrompt, userPrompt } = buildDeliveryEngineeringPrompts(context);

  for (const marker of DELIVERY_ENGINEERING_PROMPT_MARKERS.jsonFieldDisciplineMarkers) {
    assert.match(
      `${systemPrompt}\n${userPrompt}`,
      new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }

  assert.match(
    userPrompt,
    /alternatives in analysis or keyArguments do not replace it/i,
  );
  assert.match(userPrompt, /All schema array fields must be present/i);
});

test("ENG-0009: parser rejects omitted technicalAlternatives field", () => {
  const payloadWithoutField = { ...validPayload };
  delete payloadWithoutField.technicalAlternatives;

  assert.throws(
    () => parseDeliveryEngineeringResponseContent(JSON.stringify(payloadWithoutField)),
    /technicalAlternatives must be an array/,
  );
});

test("ENG-0009: parser rejects empty technicalAlternatives array", () => {
  assert.throws(
    () =>
      parseDeliveryEngineeringResponseContent(
        JSON.stringify({ ...validPayload, technicalAlternatives: [] }),
      ),
    /technicalAlternatives must not be empty/,
  );
});

test("ENG-0009: parser rejects alternative only in keyArguments (prompt/parser misalignment)", () => {
  assert.throws(
    () =>
      parseDeliveryEngineeringResponseContent(
        JSON.stringify({
          ...validPayload,
          technicalAlternatives: [],
          keyArguments: [
            "Pilot with feature flag in one journey before platform-wide enablement.",
          ],
        }),
      ),
    /technicalAlternatives must not be empty/,
  );
});

test("ENG-0009: parser rejects omitted engineeringConcerns field", () => {
  const payloadWithoutField = { ...validPayload };
  delete payloadWithoutField.engineeringConcerns;

  assert.throws(
    () => parseDeliveryEngineeringResponseContent(JSON.stringify(payloadWithoutField)),
    /engineeringConcerns must be an array/,
  );
});

test("ENG-0009: parser rejects invalid recommendation enum", () => {
  assert.throws(
    () =>
      parseDeliveryEngineeringResponseContent(
        JSON.stringify({ ...validPayload, recommendation: "Proceed with Conditions" }),
      ),
    /recommendation must be a valid council decision/,
  );
});

test("ENG-0009: parser rejects string confidence", () => {
  assert.throws(
    () =>
      parseDeliveryEngineeringResponseContent(
        JSON.stringify({ ...validPayload, confidence: "74" }),
      ),
    /confidence must be a finite number/,
  );
});

test("ENG-0009: parser rejects malformed JSON", () => {
  assert.throws(
    () => parseDeliveryEngineeringResponseContent("{not-json"),
    /not valid JSON/,
  );
});

test("ENG-0009: parser rejects missing keyArguments", () => {
  assert.throws(
    () =>
      parseDeliveryEngineeringResponseContent(
        JSON.stringify({ ...validPayload, keyArguments: [] }),
      ),
    /keyArguments must not be empty/,
  );
});
