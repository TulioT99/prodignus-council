import assert from "node:assert/strict";
import test from "node:test";

import { deriveCouncilTerminalOutcome } from "../src/lib/council/terminal-outcome.ts";

function createAdvisor(status, id = "ADV-001") {
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

test("complete result → success severity and SESSION_COMPLETE", () => {
  const outcome = deriveCouncilTerminalOutcome({
    status: "complete",
    advisors: [
      createAdvisor("success", "ADV-001"),
      createAdvisor("success", "ADV-002"),
      createAdvisor("success", "ADV-003"),
      createAdvisor("success", "ADV-004"),
      createAdvisor("failed", "ADV-005"),
    ],
    chairman: createChairman("success"),
  });

  assert.deepEqual(outcome, {
    sessionStatus: "complete",
    sessionSeverity: "success",
    terminalReasonCode: "SESSION_COMPLETE",
  });
});

test("partial result → warning severity and PARTIAL_ADVISOR_FAILURE", () => {
  const outcome = deriveCouncilTerminalOutcome({
    status: "partial",
    advisors: [
      createAdvisor("failed", "ADV-001"),
      createAdvisor("failed", "ADV-002"),
      createAdvisor("success", "ADV-003"),
      createAdvisor("success", "ADV-004"),
      createAdvisor("success", "ADV-005"),
    ],
    chairman: createChairman("success"),
  });

  assert.deepEqual(outcome, {
    sessionStatus: "partial",
    sessionSeverity: "warning",
    terminalReasonCode: "PARTIAL_ADVISOR_FAILURE",
  });
});

test("failed chairman → error severity and CHAIRMAN_SYNTHESIS_FAILURE", () => {
  const outcome = deriveCouncilTerminalOutcome({
    status: "failed",
    advisors: [
      createAdvisor("success", "ADV-001"),
      createAdvisor("success", "ADV-002"),
      createAdvisor("success", "ADV-003"),
      createAdvisor("success", "ADV-004"),
      createAdvisor("success", "ADV-005"),
    ],
    chairman: createChairman("failed"),
  });

  assert.deepEqual(outcome, {
    sessionStatus: "failed",
    sessionSeverity: "error",
    terminalReasonCode: "CHAIRMAN_SYNTHESIS_FAILURE",
  });
});

test("insufficient advisors → INSUFFICIENT_ADVISOR_PARTICIPATION", () => {
  const outcome = deriveCouncilTerminalOutcome({
    status: "failed",
    advisors: [
      createAdvisor("success", "ADV-001"),
      createAdvisor("failed", "ADV-002"),
      createAdvisor("failed", "ADV-003"),
      createAdvisor("failed", "ADV-004"),
      createAdvisor("failed", "ADV-005"),
    ],
    chairman: createChairman("failed", { insufficientCouncil: true }),
  });

  assert.deepEqual(outcome, {
    sessionStatus: "failed",
    sessionSeverity: "error",
    terminalReasonCode: "INSUFFICIENT_ADVISOR_PARTICIPATION",
  });
});

test("terminal reason codes never embed raw provider text", () => {
  const outcome = deriveCouncilTerminalOutcome({
    status: "failed",
    advisors: [createAdvisor("success"), createAdvisor("success"), createAdvisor("success")],
    chairman: {
      status: "failed",
      errorMessage: "Authorization: Bearer sk-secret-provider-token",
    },
  });

  assert.equal(outcome.terminalReasonCode, "CHAIRMAN_SYNTHESIS_FAILURE");
  assert.doesNotMatch(outcome.terminalReasonCode, /Bearer|sk-secret|Authorization/i);
});
