import type { AdvisorResult, CouncilSessionStatus } from "@/types/council";

export function determineCouncilSessionStatus(
  advisors: AdvisorResult[],
  liveAdvisorIds: readonly string[],
  minimumSuccessfulAdvisors: number,
): CouncilSessionStatus {
  const liveAdvisors = advisors.filter((advisor) =>
    liveAdvisorIds.includes(advisor.persona.id),
  );
  const successfulCount = advisors.filter((advisor) => advisor.status === "success").length;
  const anyLiveFailed = liveAdvisors.some((advisor) => advisor.status === "failed");

  if (!anyLiveFailed) {
    return "complete";
  }

  return successfulCount >= minimumSuccessfulAdvisors ? "partial" : "failed";
}
