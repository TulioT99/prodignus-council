import assert from "node:assert/strict";
import test from "node:test";

import { determineCouncilSessionStatus } from "../src/lib/council/council-status.ts";

function createAdvisor(status, id) {
  return {
    persona: { id },
    status,
  };
}

test("determineCouncilSessionStatus returns complete when live advisor succeeds", () => {
  const advisors = [
    createAdvisor("success", "ADV-001"),
    createAdvisor("success", "ADV-002"),
    createAdvisor("success", "ADV-003"),
    createAdvisor("success", "ADV-004"),
    createAdvisor("success", "ADV-005"),
  ];

  assert.equal(
    determineCouncilSessionStatus(advisors, ["ADV-001"], 3),
    "complete",
  );
});

test("determineCouncilSessionStatus returns partial when live advisor fails but enough mocks succeed", () => {
  const advisors = [
    createAdvisor("failed", "ADV-001"),
    createAdvisor("success", "ADV-002"),
    createAdvisor("success", "ADV-003"),
    createAdvisor("success", "ADV-004"),
    createAdvisor("success", "ADV-005"),
  ];

  assert.equal(
    determineCouncilSessionStatus(advisors, ["ADV-001"], 3),
    "partial",
  );
});

test("determineCouncilSessionStatus returns failed when too few advisors succeed", () => {
  const advisors = [
    createAdvisor("failed", "ADV-001"),
    createAdvisor("success", "ADV-002"),
    createAdvisor("failed", "ADV-003"),
    createAdvisor("failed", "ADV-004"),
    createAdvisor("failed", "ADV-005"),
  ];

  assert.equal(
    determineCouncilSessionStatus(advisors, ["ADV-001"], 3),
    "failed",
  );
});
