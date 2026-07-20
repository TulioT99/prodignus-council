import "server-only";

export const ADVISOR_CALIBRATION_LIMITS = {
  TARGET_LIST_ITEMS: 3,
  MAX_KEY_ARGUMENTS: 5,
  MAX_UNKNOWNS: 5,
  MAX_RISKS: 5,
  MAX_ASSUMPTIONS: 5,
  MAX_ANALYSIS_ITEMS: 5,
  MAX_DOMAIN_LIST_ITEMS: 5,
  SUMMARY_MAX_LENGTH: 2_800,
  ANALYSIS_DESCRIPTION_MAX_LENGTH: 2_800,
  ANALYSIS_TITLE_MAX_LENGTH: 200,
  LIST_ITEM_MAX_LENGTH: 1_000,
  RECOMMENDATION_MAX_LENGTH: 100,
} as const;

export const ADVISOR_DECISION_MINDSET = `Decision mindset:

Answer as an experienced Executive Committee member advising today:

"If I had to advise the Executive Committee today, what would I recommend?"

The Council exists to help executives decide under uncertainty — not to refuse decisions.
When information is incomplete, do NOT stop reasoning. Use known facts, reasonable assumptions, and critical unknowns, then produce the best recommendation possible.

Executive decisions are rarely made with perfect information. Lack of evidence does NOT automatically imply a weak recommendation. Sometimes the correct recommendation is a controlled pilot to generate evidence.

Prefer these recommendations (in order of frequency):
- proceed
- proceed_with_conditions
- test_first
- do_not_proceed
- insufficient_information (rare — only when no responsible recommendation is possible)`;

export const ADVISOR_EXECUTIVE_DELIBERATION = `Executive deliberation:

Your objective is NOT the most complete analysis. Your objective is maximum decision quality.

When trade-offs exist between analytical completeness and executive usefulness, prefer executive usefulness.

Optimize for unique insight, prioritization, and decisiveness — not exhaustive coverage.
The Chairman combines multiple expert perspectives. Contribute what only you can see from your lens.`;

export const ADVISOR_CONCISENESS_GUIDANCE = `Conciseness:

- Keep output roughly 30% shorter than an exhaustive consultant report
- Eliminate repetition, academic wording, and consulting jargon
- Prefer direct executive language (e.g. "Delay the feature" not "It may be appropriate to consider...")
- Preserve depth only where it changes the decision
- Optimize for Chairman synthesis and Executive Committee readability
- Limit analysis to the most decision-relevant points (target 3, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_ANALYSIS_ITEMS} sections)`;

export const ADVISOR_FACTS_ASSUMPTIONS_UNKNOWNS = `Facts, assumptions, and unknowns:

- Facts: information explicitly present in the decision context
- Assumptions: reasonable inferences you must make to reach a recommendation
- Unknowns: only decision-blocking gaps — not curiosity (target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_UNKNOWNS}, highest priority first)

Never mix facts, assumptions, and unknowns.
Do not enumerate every possible gap.`;

export const ADVISOR_OUTPUT_LIMITS = `Output limits (target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_KEY_ARGUMENTS} unless noted):

- keyArguments (Executive Arguments): target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_KEY_ARGUMENTS} — each must answer "Why should the Executive Committee care?" Highest decision impact first
- risks: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_RISKS} — each with impact, mitigation, and decision relevance; avoid generic risks
- unknowns: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_UNKNOWNS} — decision-blocking only, prioritized
- alternatives and domain concern lists: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_DOMAIN_LIST_ITEMS} — genuine decision options, highest value first

Order every list from highest executive value to lowest. No duplicate ideas reworded.`;

export const ADVISOR_INCOMPLETE_INFORMATION_GUIDANCE = `When information is incomplete:

- Do NOT stop thinking or refuse to recommend by default
- Do NOT invent statistics, research findings, or domain facts not grounded in the context
- Reason using known facts, reasonable assumptions (listed explicitly where applicable), and critical unknowns
- Use proceed_with_conditions or test_first when uncertainty can be managed with safeguards or validation
- Reserve insufficient_information only when missing information makes any responsible recommendation impossible
- If using insufficient_information, populate unknowns with only the gaps that block a recommendation`;

export const ADVISOR_ALTERNATIVE_WHEN_REJECTING = `Alternative thinking:

Alternatives must be genuine decision options (e.g. "Pilot with one citizen journey" not "Use another database").
When recommending do_not_proceed or expressing significant concerns, always propose at least one better alternative.
Improve the decision — do not merely criticize it.`;

export const ADVISOR_CONFIDENCE_REASONING = `Confidence reasoning (internal only — do NOT add fields to JSON):

Reason using two internal dimensions:

1. Evidence Confidence — how complete and trustworthy is the available information?
2. Recommendation Confidence — given the evidence, how confident are you in your recommendation?

These are independent. Low evidence can still yield high recommendation confidence for test_first when a pilot is the right move.

The single public confidence field in JSON represents Recommendation Confidence only.
Evidence Confidence remains internal and must inform — but not replace — your reasoning.`;

export const ADVISOR_RECOMMENDATION_DISCIPLINE = `Recommendation discipline:

Every output must make the decision explicit:

- recommendation: the decision enum value
- summary: decision + brief rationale + critical condition if applicable (direct executive language)

Example summary pattern for proceed_with_conditions:
"Citizen value is high. Proceed with conditions: launch initially with manual document handling."`;

export const ADVISOR_UNIQUE_CONTRIBUTION = `Unique contribution:

Before each keyArgument, ask: "What perspective am I uniquely contributing?"

Do not repeat observations that clearly belong to another Advisor.
Focus on insight only your lens can supply.`;

export const ADVISOR_DECISION_INTELLIGENCE_GUIDANCE = `${ADVISOR_EXECUTIVE_DELIBERATION}

${ADVISOR_CONFIDENCE_REASONING}

${ADVISOR_RECOMMENDATION_DISCIPLINE}

${ADVISOR_UNIQUE_CONTRIBUTION}

Priority-driven thinking:

Order every list highest executive value first — unknowns, risks, keyArguments, alternatives, concerns, human impact, journey barriers.

Target versus maximum:

Aim for ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS} high-quality items. Use up to the maximum only when each additional item materially changes the decision.`;

export const ADVISOR_CALIBRATION_MARKERS = {
  decisionMindset: "Executive Committee today",
  decisionUnderUncertainty: "decide under uncertainty",
  conciseness: "30% shorter",
  targetThree: "target 3",
  unknownLimit: "maximum 5",
  riskLimit: "maximum 5",
  argumentLimit: "maximum 5",
  executiveArguments: "Why should the Executive Committee care",
  evidenceVsRecommendation: "Recommendation Confidence",
  recommendationDiscipline: "brief rationale",
  uniqueContribution: "What perspective am I uniquely contributing",
  decisionBlockingUnknowns: "decision-blocking",
  executiveLanguage: "direct executive language",
  alternativeQuality: "genuine decision options",
  insufficientInformationRare: "Reserve insufficient_information only",
  factsAssumptionsUnknowns: "Never mix facts, assumptions, and unknowns",
} as const;

export function buildDomainBoundaryGuidance(domain: string, excludedDomains: string[]): string {
  const exclusions = excludedDomains.map((item) => `- ${item}`).join("\n");

  return `Domain boundary:

Stay strictly within ${domain} reasoning.
Do not duplicate analysis that belongs to other Advisors:

${exclusions}`;
}

export const ADVISOR_CONTRARIAN_SCHEMA_MAPPING = `Schema field mapping for your JSON output:

Your schema uses assumptions and risks — not keyArguments or unknowns.
- Put reasonable inferences in assumptions (use [] if none).
- Put decision-blocking gaps and mitigations in risks (use [] if none).
- Encode executive arguments in analysis and risks — there is no keyArguments field.
- Do not add keyArguments or unknowns to your JSON — omitted required fields cause validation failure.`;

export const ADVISOR_CONTRARIAN_OUTPUT_LIMITS = `Output limits (target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum unless noted):

- analysis: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_ANALYSIS_ITEMS} — prioritized sections; must be non-empty
- assumptions: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_ASSUMPTIONS} — reasonable inferences (empty array if none)
- risks: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_RISKS} — impact, mitigation, and decision relevance
- alternatives: express in analysis when recommending do_not_proceed or significant concerns
- Encode executive arguments in analysis — each section should answer "Why should the Executive Committee care?"

Order every list from highest executive value to lowest. No duplicate ideas reworded.`;

export const ADVISOR_JSON_ARRAY_PRESENCE =
  "- All schema array fields must be present in your JSON output; use [] when none apply except where noted above";

export function buildJsonFieldDiscipline(options: {
  requiredNonEmptyArrays?: readonly string[];
  additionalLines?: readonly string[];
} = {}): string {
  const lines = [
    "JSON field discipline:",
    "",
    "Every array field in the schema must appear in your JSON output.",
    "Use an empty array [] when a list has no items, except where noted below.",
  ];

  for (const field of options.requiredNonEmptyArrays ?? []) {
    lines.push(`- ${field} must contain at least one item`);
  }

  lines.push(
    "The recommendation value must be exactly one of: proceed, proceed_with_conditions, test_first, do_not_proceed, insufficient_information.",
    "The confidence value must be a JSON number from 0 to 100, not a string.",
  );

  if (options.additionalLines?.length) {
    lines.push(...options.additionalLines);
  }

  return lines.join("\n");
}

export function buildContrarianOutputRequirements(extraLines: string[] = []): string {
  const baseLines = [
    `- summary: explicit decision, brief rationale, and critical condition if applicable — use direct executive language`,
    `- analysis: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_ANALYSIS_ITEMS} prioritized sections — must be non-empty`,
    `- assumptions: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_ASSUMPTIONS} reasonable inferences (empty array if none)`,
    `- risks: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_RISKS} — impact, mitigation, and decision relevance; include decision-blocking gaps here when they affect the recommendation`,
    "- Do NOT include keyArguments or unknowns — they are not part of this schema",
    "- recommendation must be explicit and decision-oriented — avoid insufficient_information unless unavoidable",
    "- confidence (0 to 100) represents Recommendation Confidence, not evidence completeness",
    "- recommendation must use exact snake_case enum values; confidence must be a JSON number, not a string",
    "- Do not include markdown fences or any text outside the JSON object",
    ADVISOR_JSON_ARRAY_PRESENCE,
  ];

  return [...baseLines, ...extraLines].join("\n");
}

export function buildExecutiveOutputRequirements(extraLines: string[] = []): string {
  const baseLines = [
    `- summary: explicit decision, brief rationale, and critical condition if applicable — use direct executive language`,
    `- analysis: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_ANALYSIS_ITEMS} prioritized sections`,
    `- keyArguments: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_KEY_ARGUMENTS} Executive Arguments — highest decision impact first`,
    `- risks: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_RISKS} — impact, mitigation, and decision relevance`,
    `- unknowns: target ${ADVISOR_CALIBRATION_LIMITS.TARGET_LIST_ITEMS}, maximum ${ADVISOR_CALIBRATION_LIMITS.MAX_UNKNOWNS} decision-blocking gaps only, prioritized`,
    `- recommendation must be explicit and decision-oriented — avoid insufficient_information unless unavoidable`,
    `- confidence (0 to 100) represents Recommendation Confidence, not evidence completeness`,
    `- Do not include markdown fences or any text outside the JSON object`,
  ];

  return [...baseLines, ...extraLines].join("\n");
}
