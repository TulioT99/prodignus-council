export const validChairmanPayload = {
  executiveSummary:
    "The council supports a bounded pilot with safeguards while preserving the Contrarian concern about hidden operational risk.",
  decisionStatement:
    "Run a bounded experiment in one journey before any platform-wide rollout.",
  finalRecommendation:
    "Proceed through a tightly scoped test-first pilot embedded within guided journeys, with mandatory human escalation and explicit reversal criteria if citizen harm signals appear.",
  recommendationType: "run_bounded_experiment",
  consensus: ["Guided journeys remain the primary interaction model."],
  disagreements: [
    {
      topic: "Whether any open-ended AI entry point should exist",
      positions: [
        "Product strategy supports scoped rollout.",
        "Contrarian warns against hidden operational costs.",
      ],
      resolution:
        "Proceed only inside bounded journeys with explicit safeguards and reversal criteria.",
    },
  ],
  decisiveTradeoffs: [
    {
      tradeoff: "Speed to rollout versus citizen safety",
      preferredSide: "Citizen safety through bounded experiment",
      reason: "Irreversible harm risk outweighs short-term delivery speed.",
    },
  ],
  assumptions: ["Pilot instrumentation can detect failure early."],
  conditions: ["Human escalation must be mandatory for eligibility decisions."],
  risks: ["Pilot results may not generalize across municipalities."],
  unknowns: ["Peak upload volume on low-end devices remains unknown."],
  minorityView: {
    advisorId: "ADV-001",
    position: "Hidden operational costs may exceed pilot estimates.",
    whyItMatters:
      "If the Contrarian concern is ignored, vulnerable citizens may bear avoidable failure costs.",
  },
  minimumAdditionalEvidence: [
    {
      evidence: "Citizen completion rates during the pilot",
      whyNeeded: "Confirms whether the bounded experiment reduces uncertainty enough to scale.",
      owner: "Product",
    },
  ],
  nextActions: [
    {
      action: "Run a 12-week pilot in two high-volume journeys.",
      owner: "Delivery",
      sequence: 1,
      expectedOutcome: "Measured citizen completion and failure rates.",
    },
  ],
  reversalCriteria: [
    "Pilot shows sustained upload failure rates above the agreed threshold.",
  ],
  keyArguments: [
    "Vulnerable citizens need verifiable, bounded assistance rather than open chat.",
  ],
  confidence: 78,
};

export function createOpenRouterChairmanResponse(content, model = "test/chairman") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      model,
      choices: [{ message: { role: "assistant", content: JSON.stringify(content) } }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
        cost: 0.0025,
      },
    }),
  };
}
