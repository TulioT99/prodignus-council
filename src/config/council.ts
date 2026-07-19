export const councilConfig = {
  applicationName: "Prodignus Decision Council",
  version: "0.3.0",
  executionMode: "hybrid" as const,
  prototypeMode: false,
  liveAdvisorIds: ["ADV-001"] as const,
  prototypeAdvisorIds: ["ADV-002", "ADV-003", "ADV-004", "ADV-005"] as const,
  prototypeChairman: true,
  minimumSuccessfulAdvisors: 3,
  chairmanEnabled: true,
  disclaimer:
    "The Council supports human judgment. Its outputs may contain errors and do not constitute evidence that a decision is correct.",
} as const;
