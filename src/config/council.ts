import { DEFAULT_RUNTIME_CONFIG } from "@/config/defaults";

/**
 * Application metadata (not operational knobs).
 * Runtime operational configuration lives in `src/config` via getRuntimeConfig().
 * Deprecated operational mirrors are derived from DEFAULT_RUNTIME_CONFIG only.
 */
export const councilConfig = {
  applicationName: "Prodignus Decision Council",
  version: "0.3.5",
  defaultLanguage: "en",
  executionMode: "live" as const,
  prototypeMode: false,
  liveAdvisorIds: DEFAULT_RUNTIME_CONFIG.advisors.enabledAdvisorIds,
  prototypeAdvisorIds: [] as const,
  prototypeChairman: false,
  /** @deprecated Prefer getRuntimeConfig().chairman.minimumSuccessfulAdvisors */
  minimumSuccessfulAdvisors:
    DEFAULT_RUNTIME_CONFIG.chairman.minimumSuccessfulAdvisors,
  /** @deprecated Prefer getRuntimeConfig().chairman.enabled */
  chairmanEnabled: DEFAULT_RUNTIME_CONFIG.chairman.enabled,
  disclaimer:
    "The Council supports human judgment. Its outputs may contain errors and do not constitute evidence that a decision is correct.",
} as const;
