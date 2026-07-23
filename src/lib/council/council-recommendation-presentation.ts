import type { ChairmanNextAction, ChairmanResult } from "@/types/council";
import type { CouncilRecommendationBriefing } from "@/lib/council/council-display";
import { buildCouncilRecommendationBriefing } from "@/lib/council/council-display";

export const RATIONALE_COLLAPSE_THRESHOLD = 850;
export const PRIORITY_RISK_COUNT = 3;

export type RationalePresentation = {
  fullText: string;
  collapsedIntro: string;
  keyReasoningPoints: string[];
  isExpandable: boolean;
};

export type RiskPresentation = {
  priorityRisks: string[];
  additionalRisks: string[];
  showExpander: boolean;
};

export type ConditionGroupLabel =
  | "Controlled scope"
  | "Operational readiness"
  | "Citizen inclusion and safety"
  | "Evidence before scaling"
  | "Additional conditions";

export type ConditionGroupPresentation = {
  label: ConditionGroupLabel;
  items: string[];
};

export type ConditionPresentation = {
  groups: ConditionGroupPresentation[];
};

export type NextStepPresentation = {
  sequence: number;
  action: string;
  owner?: string;
  expectedOutcome?: string;
};

export type ExecutiveCouncilRecommendationPresentation = {
  briefing: CouncilRecommendationBriefing;
  rationale: RationalePresentation | null;
  risks: RiskPresentation;
  conditions: ConditionPresentation;
  nextSteps: NextStepPresentation[];
};

export type CouncilRecommendationRenderSnapshot = {
  rationaleTexts: string[];
  riskItems: string[];
  conditionItems: string[];
  nextStepKeys: string[];
};

const CONDITION_GROUP_DEFINITIONS: Array<{
  label: ConditionGroupLabel;
  keywords: string[];
}> = [
  {
    label: "Controlled scope",
    keywords: [
      "pilot",
      "one journey",
      "limited scope",
      "initial rollout",
      "feature flag",
      "controlled rollout",
    ],
  },
  {
    label: "Operational readiness",
    keywords: [
      "staff",
      "training",
      "sla",
      "processing",
      "workflow",
      "escalation",
      "queue",
      "monitoring",
      "capacity",
    ],
  },
  {
    label: "Citizen inclusion and safety",
    keywords: [
      "offline",
      "accessibility",
      "assisted",
      "vulnerable",
      "security",
      "encryption",
      "virus",
      "audit",
      "privacy",
      "access control",
    ],
  },
  {
    label: "Evidence before scaling",
    keywords: [
      "metrics",
      "success criteria",
      "30 days",
      "satisfaction",
      "completion rate",
      "processing time",
      "expansion",
      "production data",
      "validate before scaling",
    ],
  },
];

function normalizeComparableText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function excerptAtSentenceBoundary(text: string, maxLength: number): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const slice = trimmed.slice(0, maxLength);
  const sentenceBoundary = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
  );

  if (sentenceBoundary >= Math.floor(maxLength * 0.5)) {
    return trimmed.slice(0, sentenceBoundary + 1).trim();
  }

  const wordBoundary = slice.lastIndexOf(" ");

  if (wordBoundary > 0) {
    return trimmed.slice(0, wordBoundary).trim();
  }

  return slice.trim();
}

export function buildRationalePresentation(
  fullText: string,
  keyArguments: readonly string[],
  threshold = RATIONALE_COLLAPSE_THRESHOLD,
): RationalePresentation {
  const normalizedFullText = fullText.trim();
  const paragraphs = splitIntoParagraphs(normalizedFullText);
  const openingParagraph = paragraphs[0] ?? normalizedFullText;
  const collapsedIntro =
    normalizedFullText.length > threshold
      ? excerptAtSentenceBoundary(openingParagraph, threshold)
      : normalizedFullText;

  const isExpandable =
    normalizeComparableText(collapsedIntro) !== normalizeComparableText(normalizedFullText);

  return {
    fullText: normalizedFullText,
    collapsedIntro,
    keyReasoningPoints: keyArguments.map((point) => point.trim()).filter(Boolean),
    isExpandable,
  };
}

export function buildRiskPresentation(
  risks: readonly string[],
  priorityCount = PRIORITY_RISK_COUNT,
): RiskPresentation {
  const normalizedRisks = risks.map((risk) => risk.trim()).filter(Boolean);

  return {
    priorityRisks: normalizedRisks.slice(0, priorityCount),
    additionalRisks: normalizedRisks.slice(priorityCount),
    showExpander: normalizedRisks.length > priorityCount,
  };
}

function classifyCondition(condition: string): ConditionGroupLabel {
  const lower = condition.toLowerCase();

  for (const group of CONDITION_GROUP_DEFINITIONS) {
    if (group.keywords.some((keyword) => lower.includes(keyword))) {
      return group.label;
    }
  }

  return "Additional conditions";
}

export function buildConditionPresentation(
  conditions: readonly string[],
): ConditionPresentation {
  const groupMap = new Map<ConditionGroupLabel, string[]>();

  for (const condition of conditions) {
    const trimmed = condition.trim();

    if (!trimmed) {
      continue;
    }

    const label = classifyCondition(trimmed);
    const existing = groupMap.get(label) ?? [];
    existing.push(trimmed);
    groupMap.set(label, existing);
  }

  const orderedLabels: ConditionGroupLabel[] = [
    "Controlled scope",
    "Operational readiness",
    "Citizen inclusion and safety",
    "Evidence before scaling",
    "Additional conditions",
  ];

  return {
    groups: orderedLabels
      .map((label) => ({
        label,
        items: groupMap.get(label) ?? [],
      }))
      .filter((group) => group.items.length > 0),
  };
}

export function buildNextStepPresentation(
  nextActions: readonly ChairmanNextAction[],
): NextStepPresentation[] {
  return [...nextActions]
    .sort((left, right) => left.sequence - right.sequence)
    .map((action) => ({
      sequence: action.sequence,
      action: action.action.trim(),
      owner: action.owner?.trim() || undefined,
      expectedOutcome: action.expectedOutcome.trim() || undefined,
    }));
}

export function buildExecutiveCouncilRecommendationPresentation(
  chairman: ChairmanResult,
): ExecutiveCouncilRecommendationPresentation {
  const briefing = buildCouncilRecommendationBriefing(chairman);

  return {
    briefing,
    rationale: briefing.whyRecommendation
      ? buildRationalePresentation(briefing.whyRecommendation, chairman.keyArguments)
      : null,
    risks: buildRiskPresentation(briefing.keyRisks),
    conditions: buildConditionPresentation(briefing.conditions),
    nextSteps: buildNextStepPresentation(briefing.nextSteps),
  };
}

function nextStepKey(action: ChairmanNextAction): string {
  return `${action.sequence}:${action.action.trim()}`;
}

export function buildCouncilRecommendationRenderSnapshot(
  presentation: ExecutiveCouncilRecommendationPresentation,
): CouncilRecommendationRenderSnapshot {
  const rationaleTexts: string[] = [];

  if (presentation.rationale) {
    rationaleTexts.push(presentation.rationale.fullText);
  }

  return {
    rationaleTexts,
    riskItems: [
      ...presentation.risks.priorityRisks,
      ...presentation.risks.additionalRisks,
    ],
    conditionItems: presentation.conditions.groups.flatMap((group) => group.items),
    nextStepKeys: presentation.nextSteps.map(
      (step) => `${step.sequence}:${step.action}`,
    ),
  };
}

export function validateCouncilRecommendationContentPreservation(
  chairman: ChairmanResult,
  snapshot: CouncilRecommendationRenderSnapshot,
): {
  ok: boolean;
  missingRisks: string[];
  duplicateRisks: string[];
  missingConditions: string[];
  duplicateConditions: string[];
  missingNextSteps: string[];
  duplicateNextSteps: string[];
} {
  const expectedRisks = chairman.risks.map((risk) => risk.trim()).filter(Boolean);
  const expectedConditions = chairman.conditions.map((item) => item.trim()).filter(Boolean);
  const expectedNextSteps = chairman.nextActions.map((action) => nextStepKey(action));

  function findMissing(expected: string[], rendered: string[]): string[] {
    const renderedCounts = new Map<string, number>();

    for (const item of rendered) {
      renderedCounts.set(item, (renderedCounts.get(item) ?? 0) + 1);
    }

    return expected.filter((item) => (renderedCounts.get(item) ?? 0) === 0);
  }

  function findDuplicates(rendered: string[]): string[] {
    const renderedCounts = new Map<string, number>();

    for (const item of rendered) {
      renderedCounts.set(item, (renderedCounts.get(item) ?? 0) + 1);
    }

    return [...renderedCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([item]) => item);
  }

  const missingRisks = findMissing(expectedRisks, snapshot.riskItems);
  const missingConditions = findMissing(expectedConditions, snapshot.conditionItems);
  const missingNextSteps = findMissing(expectedNextSteps, snapshot.nextStepKeys);

  return {
    ok:
      missingRisks.length === 0 &&
      missingConditions.length === 0 &&
      missingNextSteps.length === 0 &&
      findDuplicates(snapshot.riskItems).length === 0 &&
      findDuplicates(snapshot.conditionItems).length === 0 &&
      findDuplicates(snapshot.nextStepKeys).length === 0,
    missingRisks,
    duplicateRisks: findDuplicates(snapshot.riskItems),
    missingConditions,
    duplicateConditions: findDuplicates(snapshot.conditionItems),
    missingNextSteps,
    duplicateNextSteps: findDuplicates(snapshot.nextStepKeys),
  };
}

export function extractVisibleRationaleSentences(text: string): string[] {
  return splitIntoSentences(text);
}
