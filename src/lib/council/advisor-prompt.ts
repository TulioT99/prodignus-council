import "server-only";

import {
  ADVISOR_ALTERNATIVE_WHEN_REJECTING,
  ADVISOR_CONCISENESS_GUIDANCE,
  ADVISOR_CONTRARIAN_OUTPUT_LIMITS,
  ADVISOR_CONTRARIAN_SCHEMA_MAPPING,
  ADVISOR_DECISION_INTELLIGENCE_GUIDANCE,
  ADVISOR_DECISION_MINDSET,
  ADVISOR_FACTS_ASSUMPTIONS_UNKNOWNS,
  ADVISOR_INCOMPLETE_INFORMATION_GUIDANCE,
  buildContrarianOutputRequirements,
  buildDomainBoundaryGuidance,
  buildJsonFieldDiscipline,
} from "@/lib/council/advisor-calibration";
import { buildCouncilPromptContext } from "@/lib/council/evidence-prompt";
import { assertAdvisorPromptIntegrity } from "@/lib/council/decision-context";
import type { AdvisorPersona, DecisionContext, ThinkingLens } from "@/types/council";

const THINKING_LENS_LABELS: Record<ThinkingLens, string> = {
  contrarian: "Contrarian",
  "product-strategy": "Product Strategy",
  "ux-accessibility": "UX & Accessibility",
  "delivery-engineering": "Delivery Engineering",
  "human-impact": "Human Impact",
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
- Do not reject merely for the sake of disagreement.
- Stay independent: do not duplicate product, UX, engineering, or human impact analysis from other Advisors.`;

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

    case "product-strategy":
      throw new Error("Product strategy prompts are handled by the dedicated advisor module.");

    case "ux-accessibility":
      throw new Error(
        "UX and accessibility prompts are handled by the dedicated advisor module.",
      );

    case "delivery-engineering":
      throw new Error(
        "Delivery engineering prompts are handled by the dedicated advisor module.",
      );

    case "human-impact":
      throw new Error("Human impact prompts are handled by the dedicated advisor module.");
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

function formatAttachments(context: DecisionContext): string {
  if (context.attachments.length === 0) {
    return "(none provided)";
  }

  return context.attachments
    .map((attachment) => `- ${attachment.name} (${attachment.mimeType})`)
    .join("\n");
}

export function buildAdvisorPrompts(
  decisionContext: DecisionContext,
  persona: AdvisorPersona,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `${buildIdentitySection(persona)}

Shared advisor responsibility:

- Independently assess the decision through your assigned thinking lens.
- Analyze only the decision context provided below. Do not substitute unrelated examples or prior cases.
- Distinguish facts contained in the decision context from assumptions, inferences, and unknowns requiring evidence.
- Identify risks, hidden costs, and implementation implications relevant to your lens.
- Do not invent statistics, laws, research findings, or facts not provided in the decision context.
- Provide a clear, explicit recommendation for the Executive Committee.
- Return only valid JSON matching the required schema.

${ADVISOR_DECISION_MINDSET}

${ADVISOR_CONCISENESS_GUIDANCE}

${ADVISOR_FACTS_ASSUMPTIONS_UNKNOWNS}

${ADVISOR_CONTRARIAN_OUTPUT_LIMITS}

${ADVISOR_CONTRARIAN_SCHEMA_MAPPING}

${buildJsonFieldDiscipline({
  requiredNonEmptyArrays: ["analysis"],
})}

${ADVISOR_ALTERNATIVE_WHEN_REJECTING}

${ADVISOR_DECISION_INTELLIGENCE_GUIDANCE}

${buildDomainBoundaryGuidance("your assigned thinking lens", [
  "detailed product strategy (Product Strategy Advisor)",
  "UX and accessibility journeys (UX & Accessibility Advisor)",
  "engineering delivery (Delivery Engineering Advisor)",
  "human outcomes and equity (Human Impact Advisor)",
])}

${ADVISOR_INCOMPLETE_INFORMATION_GUIDANCE}

${buildLensInstructions(persona.thinkingLens)}`;

  const userPrompt = `${buildCouncilPromptContext(decisionContext)}

Attachments:
${formatAttachments(decisionContext)}

Review the following decision and respond as ${persona.displayName}.

Return JSON matching this schema exactly:

${ADVISOR_RESPONSE_SCHEMA}

Requirements:

${buildContrarianOutputRequirements()}`;

  assertAdvisorPromptIntegrity(decisionContext, userPrompt);

  return { systemPrompt, userPrompt };
}

export const ADVISOR_PROMPT_MARKERS = {
  schemaMappingMarkers: [
    "not keyArguments or unknowns",
    "Do not add keyArguments or unknowns",
  ],
  jsonFieldDisciplineMarkers: [
    "Every array field in the schema must appear",
    "confidence value must be a JSON number",
  ],
} as const;
