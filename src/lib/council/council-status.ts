import type {
  AdvisorResult,
  ChairmanResult,
  CouncilSessionStatus,
} from "@/types/council";
import {
  CHAIRMAN_COMPLETE_ADVISOR_THRESHOLD,
  CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS,
  countSuccessfulAdvisors,
} from "@/lib/council/chairman-policy";

export function determineCouncilSessionStatus(
  advisors: AdvisorResult[],
  chairman: ChairmanResult | undefined,
  minimumSuccessfulAdvisors: number = CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS,
): CouncilSessionStatus {
  const successfulCount = countSuccessfulAdvisors(advisors);
  const chairmanSucceeded = chairman?.status === "success";
  const chairmanInsufficient = chairman?.insufficientCouncil === true;

  if (successfulCount < minimumSuccessfulAdvisors || chairmanInsufficient) {
    return "failed";
  }

  if (!chairman || !chairmanSucceeded) {
    return "failed";
  }

  if (successfulCount >= CHAIRMAN_COMPLETE_ADVISOR_THRESHOLD) {
    return "complete";
  }

  if (successfulCount === CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS) {
    return "partial";
  }

  return successfulCount >= minimumSuccessfulAdvisors ? "partial" : "failed";
}
