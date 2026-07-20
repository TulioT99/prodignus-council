import assert from "node:assert/strict";
import test from "node:test";

import { parseDeliveryEngineeringResponseContent } from "../src/lib/council/advisors/delivery-engineering-response-parser.ts";

const validPayload = {
  summary: "Image upload is feasible with bounded scope but requires careful operational planning.",
  analysis: [
    {
      title: "Implementation complexity",
      description:
        "Upload pipeline needs storage, virus scanning, and retry logic for poor connectivity.",
    },
    {
      title: "Deployment readiness",
      description:
        "Phased rollout behind a feature flag reduces deployment risk during initial pilot.",
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

test("parseDeliveryEngineeringResponseContent parses valid JSON", () => {
  const result = parseDeliveryEngineeringResponseContent(JSON.stringify(validPayload));

  assert.equal(result.summary, validPayload.summary);
  assert.equal(result.recommendation, "proceed_with_conditions");
  assert.deepEqual(result.keyArguments, validPayload.keyArguments);
  assert.deepEqual(result.unknowns, validPayload.unknowns);
  assert.deepEqual(result.engineeringConcerns, validPayload.engineeringConcerns);
  assert.deepEqual(result.operationalConcerns, validPayload.operationalConcerns);
  assert.deepEqual(result.technicalAlternatives, validPayload.technicalAlternatives);
  assert.equal(result.confidence, 74);
});

test("parseDeliveryEngineeringResponseContent accepts insufficient_information with unknowns", () => {
  const payload = {
    ...validPayload,
    recommendation: "insufficient_information",
    unknowns: [
      "Target infrastructure environment is missing.",
      "Unknown dependencies: external document verification API availability.",
      "Question: what is the expected upload volume per day?",
    ],
  };

  const result = parseDeliveryEngineeringResponseContent(JSON.stringify(payload));

  assert.equal(result.recommendation, "insufficient_information");
  assert.equal(result.unknowns.length, 3);
});

test("parseDeliveryEngineeringResponseContent rejects missing keyArguments", () => {
  assert.throws(
    () =>
      parseDeliveryEngineeringResponseContent(
        JSON.stringify({ ...validPayload, keyArguments: [] }),
      ),
    /keyArguments must not be empty/,
  );
});

test("parseDeliveryEngineeringResponseContent rejects missing technicalAlternatives", () => {
  assert.throws(
    () =>
      parseDeliveryEngineeringResponseContent(
        JSON.stringify({ ...validPayload, technicalAlternatives: [] }),
      ),
    /technicalAlternatives must not be empty/,
  );
});

test("parseDeliveryEngineeringResponseContent rejects malformed JSON", () => {
  assert.throws(
    () => parseDeliveryEngineeringResponseContent("{not-json"),
    /not valid JSON/,
  );
});

test("parseDeliveryEngineeringResponseContent strips markdown fences", () => {
  const fenced = `\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``;
  const result = parseDeliveryEngineeringResponseContent(fenced);

  assert.equal(result.summary, validPayload.summary);
});
