import type {
  AdvisorResult,
  ChairmanRecommendationType,
  ChairmanResult,
  CouncilDecision,
  CouncilRequest,
  CouncilResult,
  CouncilSessionStatus,
} from "@/types/council";

export const ADVISOR_DISPLAY_ORDER = [
  "ADV-002",
  "ADV-003",
  "ADV-004",
  "ADV-005",
  "ADV-001",
] as const;

export const ADVISOR_USER_FACING_NAMES: Record<(typeof ADVISOR_DISPLAY_ORDER)[number], string> = {
  "ADV-002": "Product Strategy",
  "ADV-003": "UX & Accessibility",
  "ADV-004": "Delivery Engineering",
  "ADV-005": "Human Impact",
  "ADV-001": "Contrarian",
};

export const CHAIRMAN_RECOMMENDATION_LABELS: Record<ChairmanRecommendationType, string> = {
  proceed: "Proceed",
  proceed_with_conditions: "Proceed with conditions",
  defer: "Defer the decision",
  do_not_proceed: "Do not proceed",
  run_bounded_experiment: "Run a bounded experiment",
};

export const ADVISOR_RECOMMENDATION_LABELS: Record<CouncilDecision, string> = {
  proceed: "Proceed",
  proceed_with_conditions: "Proceed with conditions",
  test_first: "Run a bounded experiment",
  do_not_proceed: "Do not proceed",
  insufficient_information: "Defer the decision",
};

export const SESSION_STATUS_LABELS: Record<CouncilSessionStatus, string> = {
  complete: "Complete",
  partial: "Partial",
  failed: "Failed",
};

export const SESSION_STATUS_DESCRIPTIONS: Record<CouncilSessionStatus, string> = {
  complete:
    "The Council produced a usable decision with sufficient advisor participation.",
  partial:
    "The Council produced a usable decision, but one or more perspectives were unavailable or confidence was reduced.",
  failed: "The Council could not produce a usable final decision.",
};

export function sortAdvisorsForDisplay(advisors: AdvisorResult[]): AdvisorResult[] {
  const order = new Map(ADVISOR_DISPLAY_ORDER.map((id, index) => [id, index]));

  return [...advisors].sort((left, right) => {
    const leftIndex = order.get(left.persona.id as (typeof ADVISOR_DISPLAY_ORDER)[number]) ?? 999;
    const rightIndex =
      order.get(right.persona.id as (typeof ADVISOR_DISPLAY_ORDER)[number]) ?? 999;

    return leftIndex - rightIndex;
  });
}

export function getAdvisorDisplayName(advisor: AdvisorResult): string {
  const mapped =
    ADVISOR_USER_FACING_NAMES[
      advisor.persona.id as (typeof ADVISOR_DISPLAY_ORDER)[number]
    ];

  return mapped ?? advisor.persona.displayName;
}

export function formatDurationReadable(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "0 s";
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }

  const totalSeconds = durationMs / 1000;

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)} s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`;
}

export function formatCostUsd(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "Not provided";
  }

  return `$${value.toFixed(4)}`;
}

export function aggregateCouncilMetrics(result: CouncilResult) {
  const advisorTokens = result.advisors.reduce(
    (total, advisor) => total + (advisor.totalTokens ?? 0),
    0,
  );
  const chairmanTokens = result.chairman?.totalTokens ?? 0;
  const advisorCost = result.advisors.reduce(
    (total, advisor) => total + (advisor.estimatedCostUsd ?? 0),
    0,
  );
  const chairmanCost = result.chairman?.estimatedCostUsd;
  const hasAnyCost =
    result.advisors.some((advisor) => advisor.estimatedCostUsd !== undefined) ||
    chairmanCost !== undefined;
  const totalCost = hasAnyCost ? advisorCost + (chairmanCost ?? 0) : undefined;

  return {
    advisorTokens,
    chairmanTokens,
    totalTokens: advisorTokens + chairmanTokens,
    totalCost,
    models: [
      ...new Set(
        [
          ...result.advisors.map((advisor) => advisor.persona.model),
          result.chairman?.model,
        ].filter(Boolean),
      ),
    ],
  };
}

export function getUnavailableAdvisorNames(result: CouncilResult): string[] {
  return sortAdvisorsForDisplay(result.advisors)
    .filter((advisor) => advisor.status === "failed")
    .map((advisor) => getAdvisorDisplayName(advisor));
}

export function buildDecisionFromRequest(
  request: CouncilRequest,
  sequence: number,
): import("@/types/council").Decision {
  const createdAt = new Date();
  const datePart = createdAt.toISOString().slice(0, 10).replace(/-/g, "");
  const contextParts = [request.context.trim()];

  if (request.alternatives?.trim()) {
    contextParts.push(`Alternatives under consideration:\n${request.alternatives.trim()}`);
  }

  return {
    id: `DEC-${datePart}-${String(sequence).padStart(3, "0")}`,
    title: request.title.trim(),
    question: request.question.trim(),
    context: contextParts.filter(Boolean).join("\n\n"),
    constraints: request.constraints.trim(),
    expectedOutcome: request.expectedOutcome?.trim() || undefined,
    createdAt: createdAt.toISOString(),
    status: "under_review",
  };
}

export function isContrarianAdvisor(advisor: AdvisorResult): boolean {
  return advisor.persona.thinkingLens === "contrarian";
}

export function shouldShowBoundedExperimentClarity(chairman: ChairmanResult): boolean {
  return (
    chairman.status === "success" &&
    chairman.recommendationType === "run_bounded_experiment"
  );
}
