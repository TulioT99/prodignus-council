import "server-only";

import type { AdvisorResult, DecisionContext } from "@/types/council";

const CHAIRMAN_RESPONSE_SCHEMA = `{
  "executiveSummary": "string — concise synthesis of the council deliberation",
  "finalRecommendation": "string — narrative final recommendation with rationale",
  "decision": "one of: proceed | proceed_with_conditions | test_first | do_not_proceed | insufficient_information",
  "consensus": ["string — points of agreement across advisors"],
  "disagreements": ["string — substantive conflicts between advisor perspectives"],
  "keyArguments": ["string — most important arguments shaping the outcome"],
  "risks": ["string — principal risks the council must manage"],
  "conditions": ["string — conditions or safeguards required to proceed safely"],
  "nextSteps": ["string — concrete recommended next actions"],
  "confidence": "number from 0 to 100"
}`;

function formatSuccessfulAdvisor(advisor: AdvisorResult): string {
  const analysisText = advisor.analysis
    .map((item) => `  - ${item.title}: ${item.description}`)
    .join("\n");

  return `- ${advisor.persona.displayName} (${advisor.persona.id}, ${advisor.persona.thinkingLens})
  Execution ID: ${advisor.executionId}
  Recommendation: ${advisor.recommendation}
  Confidence: ${Math.round(advisor.confidence * 100)}%
  Summary: ${advisor.summary}
  Analysis:
${analysisText}
  Assumptions: ${advisor.assumptions.length > 0 ? advisor.assumptions.join("; ") : "(none)"}
  Risks: ${advisor.risks.length > 0 ? advisor.risks.join("; ") : "(none)"}`;
}

function formatFailedAdvisor(advisor: AdvisorResult): string {
  return `- ${advisor.persona.displayName} (${advisor.persona.id})
  Execution ID: ${advisor.executionId}
  Status: failed
  Error: ${advisor.errorMessage ?? "The advisor could not complete this review."}`;
}

function formatAttachments(decisionContext: DecisionContext): string {
  if (decisionContext.attachments.length === 0) {
    return "(none provided)";
  }

  return decisionContext.attachments
    .map((attachment) => `- ${attachment.name} (${attachment.mimeType})`)
    .join("\n");
}

export function buildChairmanPrompts(
  decisionContext: DecisionContext,
  advisors: AdvisorResult[],
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const successfulAdvisors = advisors.filter((advisor) => advisor.status === "success");
  const failedAdvisors = advisors.filter((advisor) => advisor.status === "failed");

  const successfulSection =
    successfulAdvisors.length > 0
      ? successfulAdvisors.map(formatSuccessfulAdvisor).join("\n\n")
      : "(No advisors completed successfully.)";

  const failedSection =
    failedAdvisors.length > 0
      ? failedAdvisors.map(formatFailedAdvisor).join("\n\n")
      : "(No advisor failures.)";

  const systemPrompt = `You are the Chairman of the Prodignus Decision Council.

Your role is to synthesize independent advisor perspectives into a single, actionable council recommendation.

Chairman responsibilities:

- Reason carefully over each advisor's analysis, not merely their recommendation labels.
- Identify where advisors agree in substance and where they genuinely conflict.
- Do not decide by counting votes or averaging recommendations.
- Weigh argument quality, risk exposure, and decision context when forming your synthesis.
- Account for advisor failures — note when missing perspectives increase uncertainty.
- Produce a clear decision classification and a narrative final recommendation.
- Return only valid JSON matching the required schema.`;

  const userPrompt = `Synthesize the following council deliberation into a Chairman recommendation.

Execution ID: ${decisionContext.executionId}
Language: ${decisionContext.language}
Decision ID: ${decisionContext.decisionId}
Title: ${decisionContext.title}
Question: ${decisionContext.question}
Context: ${decisionContext.context || "(none provided)"}
Objectives: ${decisionContext.objectives || "(none provided)"}
Constraints: ${decisionContext.constraints || "(none provided)"}
Attachments:
${formatAttachments(decisionContext)}
Status: ${decisionContext.status}

Successful advisor responses (${successfulAdvisors.length}):

${successfulSection}

Advisor failures (${failedAdvisors.length}):

${failedSection}

Return JSON matching this schema exactly:

${CHAIRMAN_RESPONSE_SCHEMA}

Requirements:

- executiveSummary must synthesize the deliberation in plain language.
- finalRecommendation must explain the chosen path and why it follows from the advisor inputs.
- decision must be one of the allowed enum values and reflect your synthesized recommendation.
- consensus and disagreements must reflect substantive alignment or conflict, not vote counts.
- keyArguments must cite the strongest reasoning from the advisor record.
- conditions and nextSteps must be actionable when recommending proceed, proceed_with_conditions, or test_first.
- confidence must be a finite number from 0 to 100 reflecting synthesis certainty given available advisor input.
- Do not include markdown fences or any text outside the JSON object.`;

  return { systemPrompt, userPrompt };
}
