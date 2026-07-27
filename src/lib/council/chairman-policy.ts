import "server-only";

import { DEFAULT_RUNTIME_CONFIG } from "@/config/defaults";
import { getRuntimeConfig } from "@/config/runtime";

/**
 * Default minimum successful advisors.
 * Derived from DEFAULT_RUNTIME_CONFIG — prefer getters at runtime.
 */
export const CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS =
  DEFAULT_RUNTIME_CONFIG.chairman.minimumSuccessfulAdvisors;

/**
 * Default complete-session threshold.
 * Derived from DEFAULT_RUNTIME_CONFIG — prefer getters at runtime.
 */
export const CHAIRMAN_COMPLETE_ADVISOR_THRESHOLD =
  DEFAULT_RUNTIME_CONFIG.chairman.completeAdvisorThreshold;

/** Runtime minimum successful advisors required before Chairman may synthesize. */
export function getChairmanMinimumAdvisorsForSynthesis(): number {
  return getRuntimeConfig().chairman.minimumSuccessfulAdvisors;
}

/** Runtime successful-advisor count at or above which a session may be complete. */
export function getChairmanCompleteAdvisorThreshold(): number {
  return getRuntimeConfig().chairman.completeAdvisorThreshold;
}

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
