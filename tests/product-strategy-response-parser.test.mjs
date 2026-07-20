import assert from "node:assert/strict";
import test from "node:test";

import { parseProductStrategyResponseContent } from "../src/lib/council/advisors/product-strategy-response-parser.ts";

const validPayload = {
  summary: "Image upload may deliver citizen value, but scope must stay tightly bounded.",
  analysis: [
    {
      title: "User problem",
      description: "Citizens need to submit evidence without abandoning guided journeys.",
    },
    {
      title: "Alternative",
      description:
        "Instead of full image upload, start with camera capture inside one high-value journey.",
    },
  ],
  recommendation: "test_first",
  keyArguments: [
    "Document evidence can reduce caseworker clarification loops if scoped to required fields.",
  ],
  risks: ["Privacy exposure if uploads are retained beyond need."],
  assumptions: ["Citizens can complete capture on low-end devices."],
  unknowns: ["Actual upload failure rate across target municipalities is unknown."],
  confidence: 72,
};

test("parseProductStrategyResponseContent parses valid JSON", () => {
  const result = parseProductStrategyResponseContent(JSON.stringify(validPayload));

  assert.equal(result.summary, validPayload.summary);
  assert.equal(result.recommendation, "test_first");
  assert.deepEqual(result.keyArguments, validPayload.keyArguments);
  assert.deepEqual(result.unknowns, validPayload.unknowns);
  assert.equal(result.confidence, 72);
});

test("parseProductStrategyResponseContent accepts insufficient_information with unknowns", () => {
  const payload = {
    ...validPayload,
    recommendation: "insufficient_information",
    unknowns: [
      "Expected citizen upload success rate is missing.",
      "Impact: cannot size storage, support, or rollout scope responsibly.",
      "Question: what percentage of journeys require document evidence today?",
    ],
  };

  const result = parseProductStrategyResponseContent(JSON.stringify(payload));

  assert.equal(result.recommendation, "insufficient_information");
  assert.equal(result.unknowns.length, 3);
});

test("parseProductStrategyResponseContent rejects missing keyArguments", () => {
  assert.throws(
    () =>
      parseProductStrategyResponseContent(
        JSON.stringify({ ...validPayload, keyArguments: [] }),
      ),
    /keyArguments must not be empty/,
  );
});

test("parseProductStrategyResponseContent rejects malformed JSON", () => {
  assert.throws(
    () => parseProductStrategyResponseContent("{not-json"),
    /not valid JSON/,
  );
});
