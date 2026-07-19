export const councilConfig = {
  applicationName: "Prodignus Decision Council",
  version: "0.1.0",
  prototypeMode: true,
  minimumSuccessfulAdvisors: 3,
  chairmanEnabled: true,
  loadingDelayMs: 1500,
  disclaimer:
    "The Council supports human judgment. Its outputs may contain errors and do not constitute evidence that a decision is correct.",
} as const;
