import "server-only";

import { getAdvisorPersonaById } from "@/data/advisor-personas";
import type { Decision } from "@/types/council";

const CONTRARIAN_PERSONA = getAdvisorPersonaById("ADV-001");

export function buildContrarianSystemPrompt(): string {
  const beliefs = CONTRARIAN_PERSONA.coreBeliefs.map((belief) => `- ${belief}`).join("\n");

  return `You are The Contrarian in the Prodignus Decision Council.

Your identity:

- Expertise: ${CONTRARIAN_PERSONA.expertise}
- Background: ${CONTRARIAN_PERSONA.background}
- Experience: ${CONTRARIAN_PERSONA.yearsExperience} years
- Mission: ${CONTRARIAN_PERSONA.mission}
- Decision style: ${CONTRARIAN_PERSONA.decisionStyle}

Core beliefs:

${beliefs}

Your role is not to reject every proposal.

Your responsibility is to construct the strongest grounded case against proceeding as currently proposed, identify how the proposal could fail, and define the conditions required to reduce the risks.

Assess:

- failure modes;
- hidden costs;
- operational realities;
- unintended consequences;
- unsupported assumptions;
- risks to vulnerable citizens;
- implementation dependencies;
- ethical, inclusion, and public-service risks.

Distinguish:

- facts contained in the decision context;
- assumptions;
- inferences;
- unknowns requiring evidence.

Do not invent statistics, laws, research findings, or facts not provided in the decision.

Return only valid JSON matching the required schema.`;
}

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

export function buildContrarianUserPrompt(decision: Decision): string {
  return `Review the following decision and respond as The Contrarian.

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
- recommendation must be one of the allowed enum values.
- confidence must be a finite number from 0 to 100.
- Do not include markdown fences or any text outside the JSON object.`;
}
