import "server-only";

import type { ChairmanContext } from "@/lib/council/chairman-context.types";
import type { AdvisorResult } from "@/types/council";

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

const OPTIONAL_STRING_ARRAY_FIELDS: Array<{
  key: keyof AdvisorResult;
  label: string;
}> = [
  { key: "keyArguments", label: "Key Arguments" },
  { key: "unknowns", label: "Unknowns" },
  { key: "accessibilityConcerns", label: "Accessibility Concerns" },
  { key: "journeyBarriers", label: "Journey Barriers" },
  { key: "engineeringConcerns", label: "Engineering Concerns" },
  { key: "operationalConcerns", label: "Operational Concerns" },
  { key: "technicalAlternatives", label: "Technical Alternatives" },
  { key: "humanImpact", label: "Human Impact" },
  { key: "ethicalConcerns", label: "Ethical Concerns" },
  { key: "inclusionConcerns", label: "Inclusion Concerns" },
  { key: "longTermEffects", label: "Long-Term Effects" },
];

const BASE_RENDERED_ADVISOR_KEYS = new Set<string>([
  "persona",
  "source",
  "status",
  "executionId",
  "summary",
  "analysis",
  "assumptions",
  "risks",
  "recommendation",
  "confidence",
  "durationMs",
  "totalTokens",
  "errorMessage",
  ...OPTIONAL_STRING_ARRAY_FIELDS.map(({ key }) => key as string),
]);

function formatStringArray(values: readonly string[] | undefined): string {
  return values && values.length > 0 ? values.join("; ") : "(none)";
}

function formatExtensionFields(advisor: AdvisorResult): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(advisor)) {
    if (BASE_RENDERED_ADVISOR_KEYS.has(key) || value === undefined) {
      continue;
    }

    lines.push(`  ${key}: ${JSON.stringify(value)}`);
  }

  return lines.length > 0 ? `\n  Extension Fields:\n${lines.join("\n")}` : "";
}

function formatOptionalStringArrayFields(advisor: AdvisorResult): string {
  const lines: string[] = [];

  for (const { key, label } of OPTIONAL_STRING_ARRAY_FIELDS) {
    const values = advisor[key] as readonly string[] | undefined;

    if (Array.isArray(values) && values.length > 0) {
      lines.push(`  ${label}: ${formatStringArray(values)}`);
    }
  }

  return lines.length > 0 ? `\n${lines.join("\n")}` : "";
}

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
  Assumptions: ${formatStringArray(advisor.assumptions)}
  Risks: ${formatStringArray(advisor.risks)}${formatOptionalStringArrayFields(advisor)}${formatExtensionFields(advisor)}`;
}

function formatFailedAdvisor(advisor: AdvisorResult): string {
  return `- ${advisor.persona.displayName} (${advisor.persona.id})
  Execution ID: ${advisor.executionId}
  Status: failed
  Error: ${advisor.errorMessage ?? "The advisor could not complete this review."}`;
}

function formatAttachments(chairmanContext: ChairmanContext): string {
  if (chairmanContext.request.attachments.length === 0) {
    return "(none provided)";
  }

  return chairmanContext.request.attachments
    .map((attachment) => `- ${attachment.name} (${attachment.mimeType})`)
    .join("\n");
}

export function buildChairmanPrompts(chairmanContext: ChairmanContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const successfulAdvisors = chairmanContext.advisors.filter(
    (entry) => entry.result.status === "success",
  );
  const failedAdvisors = chairmanContext.advisors.filter(
    (entry) => entry.result.status === "failed",
  );

  const successfulSection =
    successfulAdvisors.length > 0
      ? successfulAdvisors.map((entry) => formatSuccessfulAdvisor(entry.result)).join("\n\n")
      : "(No advisors completed successfully.)";

  const failedSection =
    failedAdvisors.length > 0
      ? failedAdvisors.map((entry) => formatFailedAdvisor(entry.result)).join("\n\n")
      : "(No advisor failures.)";

  const { request } = chairmanContext;

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

Execution ID: ${request.executionId}
Language: ${request.language}
Decision ID: ${request.decisionId}
Title: ${request.title}
Question: ${request.question}
Context: ${request.context || "(none provided)"}
Objectives: ${request.objectives || "(none provided)"}
Constraints: ${request.constraints || "(none provided)"}
Attachments:
${formatAttachments(chairmanContext)}
Status: ${request.status}

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
