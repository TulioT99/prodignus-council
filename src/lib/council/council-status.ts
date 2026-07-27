import type {
  AdvisorResult,
  ChairmanResult,
  CouncilSessionStatus,
} from "@/types/council";
import {
  countSuccessfulAdvisors,
  getChairmanCompleteAdvisorThreshold,
  getChairmanMinimumAdvisorsForSynthesis,
} from "@/lib/council/chairman-policy";

export function determineCouncilSessionStatus(
  advisors: AdvisorResult[],
  chairman: ChairmanResult | undefined,
  minimumSuccessfulAdvisors: number = getChairmanMinimumAdvisorsForSynthesis(),
): CouncilSessionStatus {
  const successfulCount = countSuccessfulAdvisors(advisors);
  const chairmanSucceeded = chairman?.status === "success";
  const chairmanInsufficient = chairman?.insufficientCouncil === true;
  const completeThreshold = getChairmanCompleteAdvisorThreshold();
  const synthesisMinimum = getChairmanMinimumAdvisorsForSynthesis();

  if (successfulCount < minimumSuccessfulAdvisors || chairmanInsufficient) {
    return "failed";
  }

  if (!chairman || !chairmanSucceeded) {
    return "failed";
  }

  if (successfulCount >= completeThreshold) {
    return "complete";
  }

  if (successfulCount === synthesisMinimum) {
    return "partial";
  }

  return successfulCount >= minimumSuccessfulAdvisors ? "partial" : "failed";
}
