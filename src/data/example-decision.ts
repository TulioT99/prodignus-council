import type { CouncilRequest } from "@/types/council";

export const demoDecisionRequest: CouncilRequest = {
  title: "Territorial pilot selection",
  question:
    "Should Prodignus prioritize the first territorial pilot in Goiânia, Goiás, or Palmas, Tocantins?",
  context:
    "Consider citizen reach, implementation complexity, partner readiness, learning value, cost, accessibility, human impact, and operational risk.\n\nWhen evidence is insufficient for an irreversible selection, determine whether Prodignus should choose a provisional location, conduct a bounded pilot, or defer the decision. State the conditions and evidence needed.",
  constraints: "Pilot must launch within one quarter.",
  expectedOutcome:
    "Select the first territorial pilot with enough evidence to reduce uncertainty before committing to a full rollout.",
  alternatives: "Goiânia, Goiás or Palmas, Tocantins",
};

/** @deprecated Use demoDecisionRequest */
export const exampleDecisionRequest = demoDecisionRequest;
