import assert from "node:assert/strict";
import test from "node:test";

import { determineCouncilSessionStatus } from "../src/lib/council/council-status.ts";

function createAdvisor(status, id) {
  return {
    persona: { id },
    status,
  };
}

function createChairman(status, options = {}) {
  return {
    status,
    insufficientCouncil: options.insufficientCouncil ?? false,
  };
}

test("determineCouncilSessionStatus returns complete when four or more advisors and Chairman succeed", () => {
  const advisors = [
    createAdvisor("success", "ADV-001"),
    createAdvisor("success", "ADV-002"),
    createAdvisor("success", "ADV-003"),
    createAdvisor("success", "ADV-004"),
    createAdvisor("failed", "ADV-005"),
  ];

  assert.equal(
    determineCouncilSessionStatus(advisors, createChairman("success"), 3),
    "complete",
  );
});

test("determineCouncilSessionStatus returns partial when exactly three advisors succeed and Chairman succeeds", () => {
  const advisors = [
    createAdvisor("failed", "ADV-001"),
    createAdvisor("failed", "ADV-002"),
    createAdvisor("success", "ADV-003"),
    createAdvisor("success", "ADV-004"),
    createAdvisor("success", "ADV-005"),
  ];

  assert.equal(
    determineCouncilSessionStatus(advisors, createChairman("success"), 3),
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
    determineCouncilSessionStatus(advisors, createChairman("success"), 3),
    "failed",
  );
});

test("determineCouncilSessionStatus returns failed when Chairman fails", () => {
  const advisors = [
    createAdvisor("success", "ADV-001"),
    createAdvisor("success", "ADV-002"),
    createAdvisor("success", "ADV-003"),
    createAdvisor("success", "ADV-004"),
    createAdvisor("success", "ADV-005"),
  ];

  assert.equal(
    determineCouncilSessionStatus(advisors, createChairman("failed"), 3),
    "failed",
  );
});

test("determineCouncilSessionStatus returns failed when Chairman reports insufficient council", () => {
  const advisors = [
    createAdvisor("success", "ADV-001"),
    createAdvisor("success", "ADV-002"),
    createAdvisor("failed", "ADV-003"),
    createAdvisor("failed", "ADV-004"),
    createAdvisor("failed", "ADV-005"),
  ];

  assert.equal(
    determineCouncilSessionStatus(
      advisors,
      createChairman("failed", { insufficientCouncil: true }),
      3,
    ),
    "failed",
  );
});
