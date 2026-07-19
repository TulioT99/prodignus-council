export const councilConfig = {
  applicationName: "Prodignus Decision Council",
  version: "0.2.0",
  prototypeMode: false,
  liveAdvisorIds: ["ADV-001"] as const,
  minimumSuccessfulAdvisors: 3,
  chairmanEnabled: true,
  mockAdvisorDelayMs: 800,
  disclaimer:
    "The Council supports human judgment. Its outputs may contain errors and do not constitute evidence that a decision is correct.",
} as const;
