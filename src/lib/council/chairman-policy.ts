import "server-only";

/** Minimum successful advisors required before Chairman may synthesize. */
export const CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS = 3;

/** Successful advisors at or above this count allow a complete council session. */
export const CHAIRMAN_COMPLETE_ADVISOR_THRESHOLD = 4;

export function countSuccessfulAdvisors(
  advisors: ReadonlyArray<{ status: string }>,
): number {
  return advisors.filter((advisor) => advisor.status === "success").length;
}

export function getMissingAdvisorIds(
  advisors: ReadonlyArray<{ persona: { id: string }; status: string }>,
  expectedIds: readonly string[],
): string[] {
  return expectedIds.filter((advisorId) => {
    const advisor = advisors.find((entry) => entry.persona.id === advisorId);
    return !advisor || advisor.status !== "success";
  });
}
