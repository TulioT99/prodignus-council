import assert from "node:assert/strict";
import test from "node:test";

import { parseUxAccessibilityResponseContent } from "../src/lib/council/advisors/ux-accessibility-response-parser.ts";

const validPayload = {
  summary: "Citizens may struggle to complete upload without clear guidance and error recovery.",
  analysis: [
    {
      title: "Comprehension and cognitive load",
      description:
        "Upload terminology and file-size limits may exceed the reading level of stressed citizens.",
    },
    {
      title: "Simpler alternative",
      description:
        "Instead of requiring upload, allow manual entry or camera capture inside a guided step.",
    },
  ],
  recommendation: "proceed_with_conditions",
  keyArguments: [
    "Document evidence can help journey completion if capture stays inside one guided flow.",
  ],
  risks: ["Citizens may abandon the journey after repeated upload failures."],
  unknowns: ["Actual upload success rate on entry-level Android devices is unknown."],
  accessibilityConcerns: [
    "Small touch targets and color-only error states may exclude low-vision users.",
  ],
  journeyBarriers: [
    "Poor connectivity can interrupt uploads without offline recovery guidance.",
  ],
  confidence: 68,
};

test("parseUxAccessibilityResponseContent parses valid JSON", () => {
  const result = parseUxAccessibilityResponseContent(JSON.stringify(validPayload));

  assert.equal(result.summary, validPayload.summary);
  assert.equal(result.recommendation, "proceed_with_conditions");
  assert.deepEqual(result.keyArguments, validPayload.keyArguments);
  assert.deepEqual(result.unknowns, validPayload.unknowns);
  assert.deepEqual(result.accessibilityConcerns, validPayload.accessibilityConcerns);
  assert.deepEqual(result.journeyBarriers, validPayload.journeyBarriers);
  assert.equal(result.confidence, 68);
});

test("parseUxAccessibilityResponseContent accepts insufficient_information with unknowns", () => {
  const payload = {
    ...validPayload,
    recommendation: "insufficient_information",
    unknowns: [
      "Target citizen literacy level is missing.",
      "Unknown user assumptions: device capabilities and connectivity patterns.",
      "Question: what percentage of citizens abandon at document submission today?",
    ],
  };

  const result = parseUxAccessibilityResponseContent(JSON.stringify(payload));

  assert.equal(result.recommendation, "insufficient_information");
  assert.equal(result.unknowns.length, 3);
});

test("parseUxAccessibilityResponseContent rejects missing keyArguments", () => {
  assert.throws(
    () =>
      parseUxAccessibilityResponseContent(
        JSON.stringify({ ...validPayload, keyArguments: [] }),
      ),
    /keyArguments must not be empty/,
  );
});

test("parseUxAccessibilityResponseContent rejects malformed JSON", () => {
  assert.throws(
    () => parseUxAccessibilityResponseContent("{not-json"),
    /not valid JSON/,
  );
});

test("parseUxAccessibilityResponseContent strips markdown fences", () => {
  const fenced = `\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``;
  const result = parseUxAccessibilityResponseContent(fenced);

  assert.equal(result.summary, validPayload.summary);
});
