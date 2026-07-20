export const councilConfig = {
  applicationName: "Prodignus Decision Council",
  version: "0.3.5",
  defaultLanguage: "en",
  executionMode: "live" as const,
  prototypeMode: false,
  liveAdvisorIds: ["ADV-001", "ADV-002", "ADV-003", "ADV-004", "ADV-005"] as const,
  prototypeAdvisorIds: [] as const,
  prototypeChairman: false,
  minimumSuccessfulAdvisors: 3,
  chairmanEnabled: true,
  disclaimer:
    "The Council supports human judgment. Its outputs may contain errors and do not constitute evidence that a decision is correct.",
} as const;
