import "server-only";

import {
  CHAIRMAN_COMPLETE_ADVISOR_THRESHOLD,
  CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS,
  countSuccessfulAdvisors,
  getMissingAdvisorIds,
} from "@/lib/council/chairman-policy";
import type { ChairmanContext } from "@/lib/council/chairman-context.types";
import { councilConfig } from "@/config/council";
import type { AdvisorResult } from "@/types/council";

const CHAIRMAN_RESPONSE_SCHEMA = `{
  "executiveSummary": "string — concise synthesis and final decision in plain language",
  "decisionStatement": "string — explicit, concise council decision",
  "finalRecommendation": "string — narrative rationale explaining why this path follows from advisor evidence",
  "recommendationType": "one of: proceed | proceed_with_conditions | defer | do_not_proceed | run_bounded_experiment",
  "consensus": ["string — substantive points of agreement across advisors"],
  "disagreements": [
    {
      "topic": "string — the issue in conflict",
      "positions": ["string — distinct advisor positions"],
      "resolution": "string — how the Chairman resolves or manages the conflict"
    }
  ],
  "decisiveTradeoffs": [
    {
      "tradeoff": "string",
      "preferredSide": "string",
      "reason": "string"
    }
  ],
  "assumptions": ["string"],
  "conditions": ["string — safeguards, caveats, or prerequisites"],
  "risks": ["string"],
  "unknowns": ["string — missing evidence or unresolved questions"],
  "minorityView": {
    "advisorId": "string (optional)",
    "position": "string",
    "whyItMatters": "string"
  },
  "minimumAdditionalEvidence": [
    {
      "evidence": "string",
      "whyNeeded": "string",
      "owner": "string (optional)"
    }
  ],
  "nextActions": [
    {
      "action": "string",
      "owner": "string (optional)",
      "sequence": "number",
      "expectedOutcome": "string"
    }
  ],
  "reversalCriteria": ["string — evidence that would reverse this recommendation"],
  "keyArguments": ["string — strongest reasoning shaping the decision"],
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

function normalizeFailureCategory(errorMessage: string | undefined): string {
  if (!errorMessage) {
    return "ADVISOR_EXECUTION_FAILED";
  }

  if (/not configured/i.test(errorMessage)) {
    return "CONFIGURATION_ERROR";
  }

  if (/timeout|did not respond within/i.test(errorMessage)) {
    return "PROVIDER_TIMEOUT";
  }

  if (/validated/i.test(errorMessage)) {
    return "INVALID_MODEL_OUTPUT";
  }

  if (/rate limit|provider/i.test(errorMessage)) {
    return "PROVIDER_ERROR";
  }

  return "ADVISOR_EXECUTION_FAILED";
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
  const reasoningText = advisor.analysis
    .map((item) => `  - ${item.title}: ${item.description}`)
    .join("\n");

  const tradeoffHints = [
    ...(advisor.keyArguments ?? []),
    ...advisor.analysis.map((item) => `${item.title}: ${item.description}`),
  ]
    .slice(0, 5)
    .map((entry) => `  - ${entry}`)
    .join("\n");

  return `- ${advisor.persona.displayName} (${advisor.persona.id}, ${advisor.persona.thinkingLens})
  Execution ID: ${advisor.executionId}
  Recommendation: ${advisor.recommendation}
  Confidence: ${Math.round(advisor.confidence * 100)}% (advisor self-assessment, not objective probability)
  Summary: ${advisor.summary}
  Reasoning:
${reasoningText}
  Assumptions: ${formatStringArray(advisor.assumptions)}
  Risks: ${formatStringArray(advisor.risks)}
  Trade-offs and reasoning highlights:
${tradeoffHints || "  - (none)"}${formatOptionalStringArrayFields(advisor)}${formatExtensionFields(advisor)}`;
}

function formatFailedAdvisor(advisor: AdvisorResult): string {
  return `- ${advisor.persona.displayName} (${advisor.persona.id})
  Execution ID: ${advisor.executionId}
  Status: failed
  Failure category: ${normalizeFailureCategory(advisor.errorMessage)}
  Safe error: ${advisor.errorMessage ?? "The advisor could not complete this review."}`;
}

function formatAttachments(chairmanContext: ChairmanContext): string {
  if (chairmanContext.request.attachments.length === 0) {
    return "(none provided)";
  }

  return chairmanContext.request.attachments
    .map((attachment) => `- ${attachment.name} (${attachment.mimeType})`)
    .join("\n");
}

function buildPartialFailureGuidance(
  successfulCount: number,
  missingAdvisorIds: string[],
): string {
  if (successfulCount >= CHAIRMAN_COMPLETE_ADVISOR_THRESHOLD) {
    return "All required perspectives are available. Perform a normal synthesis.";
  }

  if (successfulCount === CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS) {
    return `Only ${successfulCount} advisors succeeded. Synthesize with reduced confidence, explicitly warn that the council lacked full perspective coverage, and identify missing perspectives: ${missingAdvisorIds.join(", ")}.`;
  }

  return `This council should not produce a substantive final decision because fewer than ${CHAIRMAN_MINIMUM_ADVISORS_FOR_SYNTHESIS} advisors succeeded.`;
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
  const successfulCount = countSuccessfulAdvisors(
    chairmanContext.advisors.map((entry) => entry.result),
  );
  const missingAdvisorIds = getMissingAdvisorIds(
    chairmanContext.advisors.map((entry) => entry.result),
    councilConfig.liveAdvisorIds,
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

You are the final synthesis and decision authority for the Council.
You are NOT a sixth domain advisor.

Your responsibilities:

- Evaluate the original decision question using the normalized decision context below.
- Consider every successful advisor output as evidence, not as a vote.
- Recognize failed or unavailable advisors and disclose missing perspectives.
- Identify material consensus and substantive disagreement.
- Weigh reasoning quality, risk exposure, and decision context — not vote counts or averaged confidence scores.
- Preserve the strongest minority or Contrarian argument when it materially affects the decision.
- Make a clear recommendation rather than merely summarizing advisor text.
- Convert uncertainty into conditions, evidence requests, bounded experiments, or an explicit deferral.
- Identify immediate next actions and evidence that would reverse your recommendation.

Decision policy:

- Insufficient certainty does not automatically mean no recommendation.
- Prefer proceed_with_conditions or run_bounded_experiment when a reversible, low-risk next step exists.
- Defer only when missing evidence could materially reverse the decision, no safe provisional choice exists, a bounded experiment would not reduce uncertainty, or proceeding would create disproportionate risk.
- Do not invent facts or external evidence.

Prohibitions:

- Do not behave as another domain advisor.
- Do not claim unanimity when disagreement exists.
- Do not suppress the Contrarian merely because it is a minority.
- Do not average confidence scores mechanically.
- Do not return vague language such as "consider both options" without choosing a path.
- Do not repeat entire advisor outputs verbatim.
- Do not output anything outside the required JSON schema.

Return only valid JSON matching the required schema.`;

  const userPrompt = `=== SYSTEM BOUNDARY: NORMALIZED DECISION CONTEXT ===

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

=== SYSTEM BOUNDARY: ADVISOR EVIDENCE ===

Successful advisor responses (${successfulCount}):

${successfulSection}

Failed advisors (${failedAdvisors.length}):

${failedSection}

Partial-failure guidance:

${buildPartialFailureGuidance(successfulCount, missingAdvisorIds)}

=== SYSTEM BOUNDARY: REQUIRED OUTPUT ===

Return JSON matching this schema exactly:

${CHAIRMAN_RESPONSE_SCHEMA}

Requirements:

- decisionStatement must state the council decision explicitly and concisely.
- finalRecommendation must explain why the chosen path follows from advisor evidence.
- recommendationType must reflect your synthesized decision path.
- consensus and disagreements must reflect substantive alignment or conflict, not vote counts.
- Preserve a meaningful Contrarian or minority view in minorityView when applicable.
- nextActions must contain at least one concrete action with sequence and expectedOutcome.
- reversalCriteria must contain at least one item describing evidence that would reverse the recommendation.
- minimumAdditionalEvidence should identify missing evidence when uncertainty remains.
- confidence must be a finite number from 0 to 100 reflecting synthesis certainty given available advisor input.
- Do not include markdown fences or any text outside the JSON object.`;

  return { systemPrompt, userPrompt };
}
