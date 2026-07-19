import "server-only";

import type { AdvisorPersona, Decision, ThinkingLens } from "@/types/council";

const THINKING_LENS_LABELS: Record<ThinkingLens, string> = {
  contrarian: "Contrarian",
  "first-principles": "First Principles",
  expansionist: "Expansionist",
  outsider: "Outsider",
  executor: "Executor",
};

const ADVISOR_RESPONSE_SCHEMA = `{
  "summary": "string — concise overall assessment",
  "analysis": [
    {
      "title": "string — section title",
      "description": "string — detailed analysis for this section"
    }
  ],
  "assumptions": ["string"],
  "risks": ["string"],
  "recommendation": "one of: proceed | proceed_with_conditions | test_first | do_not_proceed | insufficient_information",
  "confidence": "number from 0 to 100"
}`;

function buildLensInstructions(thinkingLens: ThinkingLens): string {
  switch (thinkingLens) {
    case "contrarian":
      return `Lens-specific instructions:

- Construct the strongest grounded case against proceeding as currently proposed.
- Identify hidden costs, failure modes, and unintended consequences.
- Define conditions that would reduce risk.
- Do not reject merely for the sake of disagreement.`;

    case "first-principles":
      return `Lens-specific instructions:

- Separate fundamental citizen needs from inherited assumptions.
- Rebuild the solution from essential constraints and first principles.
- Challenge whether the stated problem matches the real problem.`;

    case "expansionist":
      return `Lens-specific instructions:

- Identify strategic upside, reusable capabilities, ecosystem effects, and long-term value.
- Distinguish plausible upside from speculation.
- Look for leverage beyond the immediate decision scope.`;

    case "outsider":
      return `Lens-specific instructions:

- Challenge industry conventions and unnecessary complexity.
- Use relevant cross-industry analogies where helpful.
- Simplify the problem from an ordinary user's perspective.`;

    case "executor":
      return `Lens-specific instructions:

- Define the smallest executable experiment that would reduce uncertainty.
- Identify dependencies, owners, measurable outcomes, and go/no-go criteria.
- Assess whether the team can operate the proposed path responsibly.`;
  }
}

function buildIdentitySection(persona: AdvisorPersona): string {
  const beliefs = persona.coreBeliefs.map((belief) => `- ${belief}`).join("\n");

  return `You are ${persona.displayName} in the Prodignus Decision Council.

Your identity:

- Thinking lens: ${THINKING_LENS_LABELS[persona.thinkingLens]}
- Expertise: ${persona.expertise}
- Background: ${persona.background}
- Experience: ${persona.yearsExperience} years
- Mission: ${persona.mission}
- Decision style: ${persona.decisionStyle}

Core beliefs:

${beliefs}`;
}

export function buildAdvisorPrompts(
  decision: Decision,
  persona: AdvisorPersona,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `${buildIdentitySection(persona)}

Shared advisor responsibility:

- Independently assess the decision through your assigned thinking lens.
- Distinguish facts contained in the decision context from assumptions, inferences, and unknowns requiring evidence.
- Identify risks, hidden costs, and implementation implications relevant to your lens.
- Do not invent statistics, laws, research findings, or facts not provided in the decision.
- Provide a clear recommendation covering whether to proceed, required conditions or safeguards, and the next practical step.
- Return only valid JSON matching the required schema.

${buildLensInstructions(persona.thinkingLens)}`;

  const userPrompt = `Review the following decision and respond as ${persona.displayName}.

Decision ID: ${decision.id}
Title: ${decision.title}
Question: ${decision.question}
Context: ${decision.context || "(none provided)"}
Constraints: ${decision.constraints || "(none provided)"}
Status: ${decision.status}

Return JSON matching this schema exactly:

${ADVISOR_RESPONSE_SCHEMA}

Requirements:

- Provide at least one analysis item with non-empty title and description.
- List explicit assumptions and risks as string arrays (use empty arrays if none).
- recommendation must be one of the allowed enum values and reflect whether to proceed, any conditions or safeguards, and the next practical step.
- confidence must be a finite number from 0 to 100.
- Do not include markdown fences or any text outside the JSON object.`;

  return { systemPrompt, userPrompt };
}
