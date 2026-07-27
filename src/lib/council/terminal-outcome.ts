import {
  CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS,
  countSuccessfulAdvisors,
} from "@/lib/council/chairman-policy";
import type {
  AdvisorResult,
  ChairmanResult,
  CouncilResult,
  CouncilSessionSeverity,
  CouncilTerminalOutcome,
  CouncilTerminalReasonCode,
} from "@/types/council";

function deriveFailedReasonCode(
  advisors: AdvisorResult[],
  chairman: ChairmanResult | undefined,
  minimumSuccessfulAdvisors: number,
): CouncilTerminalReasonCode {
  const successfulCount = countSuccessfulAdvisors(advisors);
  const chairmanInsufficient = chairman?.insufficientCouncil === true;

  if (successfulCount < minimumSuccessfulAdvisors || chairmanInsufficient) {
    return "INSUFFICIENT_ADVISOR_PARTICIPATION";
  }

  if (!chairman || chairman.status === "failed") {
    return "CHAIRMAN_SYNTHESIS_FAILURE";
  }

  return "INTERNAL_ORCHESTRATION_FAILURE";
}

export function severityForSessionStatus(
  status: CouncilResult["status"],
): CouncilSessionSeverity {
  switch (status) {
    case "complete":
      return "success";
    case "partial":
      return "warning";
    case "failed":
      return "error";
  }
}

export function deriveCouncilTerminalOutcome(
  result: Pick<CouncilResult, "status" | "advisors" | "chairman">,
  minimumSuccessfulAdvisors: number = CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS,
): CouncilTerminalOutcome {
  const sessionStatus = result.status;
  const sessionSeverity = severityForSessionStatus(sessionStatus);

  let terminalReasonCode: CouncilTerminalReasonCode;

  switch (sessionStatus) {
    case "complete":
      terminalReasonCode = "SESSION_COMPLETE";
      break;
    case "partial":
      terminalReasonCode = "PARTIAL_ADVISOR_FAILURE";
      break;
    case "failed":
      terminalReasonCode = deriveFailedReasonCode(
        result.advisors,
        result.chairman,
        minimumSuccessfulAdvisors,
      );
      break;
  }

  return {
    sessionStatus,
    sessionSeverity,
    terminalReasonCode,
  };
}
