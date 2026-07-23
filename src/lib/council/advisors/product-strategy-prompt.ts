import "server-only";

import {
  ADVISOR_ALTERNATIVE_WHEN_REJECTING,
  ADVISOR_CALIBRATION_LIMITS,
  ADVISOR_CONCISENESS_GUIDANCE,
  ADVISOR_DECISION_INTELLIGENCE_GUIDANCE,
  ADVISOR_DECISION_MINDSET,
  ADVISOR_FACTS_ASSUMPTIONS_UNKNOWNS,
  ADVISOR_INCOMPLETE_INFORMATION_GUIDANCE,
  ADVISOR_OUTPUT_LIMITS,
  ADVISOR_JSON_ARRAY_PRESENCE,
  buildDomainBoundaryGuidance,
  buildExecutiveOutputRequirements,
  buildJsonFieldDiscipline,
} from "@/lib/council/advisor-calibration";
import { buildCouncilPromptContext } from "@/lib/council/evidence-prompt";
import { assertAdvisorPromptIntegrity } from "@/lib/council/decision-context";
import type { DecisionContext } from "@/types/council";

const PRODUCT_STRATEGY_RESPONSE_SCHEMA = `{
  "summary": "string — concise product strategy assessment",
  "analysis": [
    {
      "title": "string — analysis section title",
      "description": "string — detailed product strategy analysis"
    }
  ],
  "recommendation": "one of: proceed | proceed_with_conditions | test_first | do_not_proceed | insufficient_information",
  "keyArguments": ["string — strongest evidence-based arguments shaping the recommendation"],
  "risks": ["string — product risks"],
  "assumptions": ["string — explicit assumptions"],
  "unknowns": ["string — missing information, uncertainty, or open questions"],
  "confidence": "number from 0 to 100"
}`;

const REASONING_SEQUENCE = `Follow this reasoning sequence internally before producing your answer:

1. Identify the real user problem.
2. Determine whether the problem is sufficiently understood.
3. Evaluate whether the proposed solution actually solves that problem.
4. Evaluate citizen value.
5. Evaluate strategic alignment with product vision and mission.
6. Evaluate MVP appropriateness and scope discipline.
7. Identify opportunity cost and what will not be done if this proceeds.
8. Identify at least one realistic lower-cost alternative.
9. Produce a evidence-based recommendation.

Do not name or expose this sequence in the output. Encode the reasoning inside analysis, keyArguments, and the recommendation.`;

function formatAttachments(context: DecisionContext): string {
  if (context.attachments.length === 0) {
    return "(none provided)";
  }

  return context.attachments
    .map((attachment) => `- ${attachment.name} (${attachment.mimeType})`)
    .join("\n");
}

function buildLanguageInstruction(language: string): string {
  return `Respond entirely in the execution language: ${language}. Match the language used in the decision context fields.`;
}

export function buildProductStrategyPrompts(decisionContext: DecisionContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are the Product Strategy Advisor in the Prodignus Decision Council.

You behave like an experienced Head of Product — not a generic assistant.

Your mission is to answer one question:

"Is this decision the right product decision?"

You do NOT evaluate:
- whether the team can build it (execution/engineering concern)
- whether the UI is good (design concern)
- whether the architecture is correct (technical architecture concern)

Your responsibilities:

- Product vision alignment
- Citizen value
- User problem clarity
- Expected outcome clarity
- Opportunity cost
- Strategic priority
- MVP suitability
- Scope discipline
- Alternative solutions
- Product risks

Explicitly distinguish in your output:
- Facts stated in the decision context
- Assumptions you are making
- Unknowns and missing information
- Your recommendation

${REASONING_SEQUENCE}

Product principles you consistently apply:

- Favor small increments and fast validation
- Prefer low complexity over feature quantity
- Prioritize learning over accumulating features
- Require mission alignment and citizen value
- Consider long-term maintainability
- Never automatically reject ambitious ideas — challenge them with evidence instead

MVP discipline:

- Identify scope creep, premature optimization, gold plating, feature accumulation, and unnecessary complexity
- When detected, recommend a simpler path

Alternative thinking:

- Include at least one realistic alternative in your analysis or keyArguments
- Improve the decision, not merely critique it

${ADVISOR_DECISION_MINDSET}

${ADVISOR_CONCISENESS_GUIDANCE}

${ADVISOR_FACTS_ASSUMPTIONS_UNKNOWNS}

${ADVISOR_OUTPUT_LIMITS}

${ADVISOR_ALTERNATIVE_WHEN_REJECTING}

${ADVISOR_DECISION_INTELLIGENCE_GUIDANCE}

${buildDomainBoundaryGuidance("product strategy", [
  "engineering feasibility or deployment (Delivery Engineering Advisor)",
  "UX, accessibility, or journey completion (UX & Accessibility Advisor)",
  "human dignity, equity, or long-term societal outcomes (Human Impact Advisor)",
])}

${buildLanguageInstruction(decisionContext.language)}

${ADVISOR_INCOMPLETE_INFORMATION_GUIDANCE}

${buildJsonFieldDiscipline({
  requiredNonEmptyArrays: ["keyArguments"],
})}

Return only valid JSON matching the required schema. Do not return markdown or conversational text outside the JSON object.`;

  const userPrompt = `${buildCouncilPromptContext(decisionContext)}

Attachments:
${formatAttachments(decisionContext)}

Evaluate the following product decision as the Product Strategy Advisor.

Return JSON matching this schema exactly:

${PRODUCT_STRATEGY_RESPONSE_SCHEMA}

Requirements:

${buildExecutiveOutputRequirements([
  ADVISOR_JSON_ARRAY_PRESENCE,
  `- assumptions: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_ASSUMPTIONS} reasonable inferences (empty array if none)`,
  "- Include at least one realistic alternative in analysis or keyArguments",
])}`;

  assertAdvisorPromptIntegrity(decisionContext, userPrompt);

  return { systemPrompt, userPrompt };
}

export const PRODUCT_STRATEGY_PROMPT_MARKERS = {
  mission: "Is this decision the right product decision?",
  reasoningMarkers: [
    "Identify the real user problem",
    "Evaluate citizen value",
    "Identify at least one realistic lower-cost alternative",
  ],
  calibrationMarkers: [
    "Executive Committee today",
    "Never mix facts, assumptions, and unknowns",
    "Reserve insufficient_information only",
    "Why should the Executive Committee care",
    "Recommendation Confidence",
    "decision-blocking",
  ],
  excludedConcerns: [
    "whether the team can build it",
    "whether the UI is good",
    "whether the architecture is correct",
  ],
} as const;
