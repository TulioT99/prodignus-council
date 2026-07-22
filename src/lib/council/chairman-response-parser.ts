import "server-only";

import { InvalidModelOutputError } from "@/lib/council/errors";
import type {
  ChairmanDisagreement,
  ChairmanEvidenceRequirement,
  ChairmanMinorityView,
  ChairmanNextAction,
  ChairmanRecommendationType,
  ChairmanResponseContent,
  ChairmanTradeoff,
  CouncilDecision,
} from "@/types/council";

const EXECUTIVE_SUMMARY_MAX_LENGTH = 4_000;
const FINAL_RECOMMENDATION_MAX_LENGTH = 8_000;
const DECISION_STATEMENT_MAX_LENGTH = 500;
const LIST_ITEM_MAX_LENGTH = 1_000;
const MAX_LIST_ITEMS = 50;
const RECOMMENDATION_MAX_LENGTH = 100;

const VALID_RECOMMENDATION_TYPES: ChairmanRecommendationType[] = [
  "proceed",
  "proceed_with_conditions",
  "defer",
  "do_not_proceed",
  "run_bounded_experiment",
];

const VALID_DECISIONS: CouncilDecision[] = [
  "proceed",
  "proceed_with_conditions",
  "test_first",
  "do_not_proceed",
  "insufficient_information",
];

export class ChairmanModelOutputParseError extends InvalidModelOutputError {}

function assertPlainObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ChairmanModelOutputParseError(`${label} must be a JSON object.`);
  }

  return value as Record<string, unknown>;
}

function readNonEmptyString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new ChairmanModelOutputParseError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new ChairmanModelOutputParseError(`${fieldName} must not be empty.`);
  }

  if (trimmed.length > maxLength) {
    throw new ChairmanModelOutputParseError(`${fieldName} exceeds the allowed length.`);
  }

  return trimmed;
}

function readOptionalString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return readNonEmptyString(value, fieldName, maxLength);
}

function readStringArrayItem(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value === "string") {
    return readNonEmptyString(value, fieldName, LIST_ITEM_MAX_LENGTH);
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const description =
      typeof record.description === "string" ? record.description.trim() : "";
    const combined = [title, description].filter(Boolean).join(": ");
    return readNonEmptyString(combined, fieldName, LIST_ITEM_MAX_LENGTH);
  }

  throw new ChairmanModelOutputParseError(`${fieldName} must be a string.`);
}

function readFlexibleStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new ChairmanModelOutputParseError(`${fieldName} must be an array.`);
  }

  if (value.length > MAX_LIST_ITEMS) {
    throw new ChairmanModelOutputParseError(`${fieldName} contains too many items.`);
  }

  return value.map((item, index) =>
    readStringArrayItem(item, `${fieldName}[${index}]`),
  );
}

function readStringArray(value: unknown, fieldName: string): string[] {
  return readFlexibleStringArray(value, fieldName);
}

function readDisagreements(value: unknown): ChairmanDisagreement[] {
  if (!Array.isArray(value)) {
    throw new ChairmanModelOutputParseError("disagreements must be an array.");
  }

  if (value.length > MAX_LIST_ITEMS) {
    throw new ChairmanModelOutputParseError("disagreements contains too many items.");
  }

  return value.map((item, index) => {
    if (typeof item === "string") {
      const topic = readNonEmptyString(item, `disagreements[${index}]`, LIST_ITEM_MAX_LENGTH);
      return {
        topic,
        positions: [topic],
        resolution: "Unresolved in advisor deliberation.",
      };
    }

    const record = assertPlainObject(item, `disagreements[${index}]`);
    const topic = readNonEmptyString(
      record.topic,
      `disagreements[${index}].topic`,
      LIST_ITEM_MAX_LENGTH,
    );
    const positions = Array.isArray(record.positions)
      ? record.positions.map((position, positionIndex) =>
          readNonEmptyString(
            position,
            `disagreements[${index}].positions[${positionIndex}]`,
            LIST_ITEM_MAX_LENGTH,
          ),
        )
      : [];
    const resolution = readOptionalString(
      record.resolution,
      `disagreements[${index}].resolution`,
      LIST_ITEM_MAX_LENGTH,
    );

    return {
      topic,
      positions,
      resolution: resolution ?? "Unresolved in advisor deliberation.",
    };
  });
}

function readTradeoffs(value: unknown): ChairmanTradeoff[] {
  if (!Array.isArray(value)) {
    throw new ChairmanModelOutputParseError("decisiveTradeoffs must be an array.");
  }

  return value.map((item, index) => {
    const record = assertPlainObject(item, `decisiveTradeoffs[${index}]`);
    return {
      tradeoff: readNonEmptyString(
        record.tradeoff,
        `decisiveTradeoffs[${index}].tradeoff`,
        LIST_ITEM_MAX_LENGTH,
      ),
      preferredSide: readNonEmptyString(
        record.preferredSide,
        `decisiveTradeoffs[${index}].preferredSide`,
        LIST_ITEM_MAX_LENGTH,
      ),
      reason: readNonEmptyString(
        record.reason,
        `decisiveTradeoffs[${index}].reason`,
        LIST_ITEM_MAX_LENGTH,
      ),
    };
  });
}

function readEvidenceRequirements(value: unknown): ChairmanEvidenceRequirement[] {
  if (!Array.isArray(value)) {
    throw new ChairmanModelOutputParseError(
      "minimumAdditionalEvidence must be an array.",
    );
  }

  return value.map((item, index) => {
    const record = assertPlainObject(item, `minimumAdditionalEvidence[${index}]`);
    return {
      evidence: readNonEmptyString(
        record.evidence,
        `minimumAdditionalEvidence[${index}].evidence`,
        LIST_ITEM_MAX_LENGTH,
      ),
      whyNeeded: readNonEmptyString(
        record.whyNeeded,
        `minimumAdditionalEvidence[${index}].whyNeeded`,
        LIST_ITEM_MAX_LENGTH,
      ),
      owner: readOptionalString(
        record.owner,
        `minimumAdditionalEvidence[${index}].owner`,
        LIST_ITEM_MAX_LENGTH,
      ),
    };
  });
}

function readNextActions(value: unknown): ChairmanNextAction[] {
  if (!Array.isArray(value)) {
    throw new ChairmanModelOutputParseError("nextActions must be an array.");
  }

  const actions = value.map((item, index) => {
    const record = assertPlainObject(item, `nextActions[${index}]`);
    const sequenceValue = record.sequence;
    const sequence =
      typeof sequenceValue === "number" && Number.isFinite(sequenceValue)
        ? sequenceValue
        : index + 1;

    return {
      action: readNonEmptyString(
        record.action,
        `nextActions[${index}].action`,
        LIST_ITEM_MAX_LENGTH,
      ),
      owner: readOptionalString(
        record.owner,
        `nextActions[${index}].owner`,
        LIST_ITEM_MAX_LENGTH,
      ),
      sequence,
      expectedOutcome: readNonEmptyString(
        record.expectedOutcome,
        `nextActions[${index}].expectedOutcome`,
        LIST_ITEM_MAX_LENGTH,
      ),
    };
  });

  return actions
    .sort((left, right) => left.sequence - right.sequence)
    .map((action, index) => ({
      ...action,
      sequence: index + 1,
    }));
}

function readMinorityView(value: unknown): ChairmanMinorityView | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const record = assertPlainObject(value, "minorityView");
  return {
    advisorId: readOptionalString(record.advisorId, "minorityView.advisorId", 100),
    position: readNonEmptyString(
      record.position,
      "minorityView.position",
      LIST_ITEM_MAX_LENGTH,
    ),
    whyItMatters: readNonEmptyString(
      record.whyItMatters,
      "minorityView.whyItMatters",
      LIST_ITEM_MAX_LENGTH,
    ),
  };
}

function readConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ChairmanModelOutputParseError("confidence must be a finite number.");
  }

  const normalized = value > 0 && value <= 1 ? Math.round(value * 100) : value;

  if (normalized < 0 || normalized > 100) {
    throw new ChairmanModelOutputParseError("confidence must be between 0 and 100.");
  }

  return normalized;
}

function mapRecommendationTypeToDecision(
  recommendationType: ChairmanRecommendationType,
): CouncilDecision {
  switch (recommendationType) {
    case "run_bounded_experiment":
      return "test_first";
    case "defer":
      return "insufficient_information";
    default:
      return recommendationType;
  }
}

function mapDecisionToRecommendationType(
  decision: CouncilDecision,
): ChairmanRecommendationType {
  switch (decision) {
    case "test_first":
      return "run_bounded_experiment";
    case "insufficient_information":
      return "defer";
    default:
      return decision;
  }
}

function readRecommendationType(value: unknown): ChairmanRecommendationType {
  const recommendationType = readNonEmptyString(
    value,
    "recommendationType",
    RECOMMENDATION_MAX_LENGTH,
  );

  if (
    !VALID_RECOMMENDATION_TYPES.includes(
      recommendationType as ChairmanRecommendationType,
    )
  ) {
    throw new ChairmanModelOutputParseError(
      "recommendationType must be a valid chairman recommendation type.",
    );
  }

  return recommendationType as ChairmanRecommendationType;
}

function readLegacyDecision(value: unknown): CouncilDecision {
  const decision = readNonEmptyString(value, "decision", RECOMMENDATION_MAX_LENGTH);

  if (!VALID_DECISIONS.includes(decision as CouncilDecision)) {
    throw new ChairmanModelOutputParseError("decision must be a valid council decision.");
  }

  return decision as CouncilDecision;
}

function stripMarkdownJsonFence(text: string): string {
  const trimmed = text.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const lines = trimmed.split("\n");

  if (lines.length < 2 || !lines[0].startsWith("```")) {
    return trimmed;
  }

  const closingFenceIndex = lines.lastIndexOf("```");

  if (closingFenceIndex <= 0) {
    return trimmed;
  }

  return lines.slice(1, closingFenceIndex).join("\n").trim();
}

function readNextActionsFromLegacySteps(steps: string[]): ChairmanNextAction[] {
  return steps.map((action, index) => ({
    action,
    sequence: index + 1,
    expectedOutcome: "Advance the council decision with measurable progress.",
  }));
}

export function flattenDisagreements(
  disagreements: ChairmanDisagreement[],
): string[] {
  return disagreements.map((entry) => {
    if (entry.positions.length === 0) {
      return entry.topic;
    }

    return `${entry.topic}: ${entry.positions.join(" | ")}`;
  });
}

export function parseChairmanResponseContent(text: string): ChairmanResponseContent {
  const normalizedText = stripMarkdownJsonFence(text);

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalizedText);
  } catch {
    throw new ChairmanModelOutputParseError("Model output is not valid JSON.");
  }

  const record = assertPlainObject(parsed, "model output");

  const recommendationType = record.recommendationType
    ? readRecommendationType(record.recommendationType)
    : mapDecisionToRecommendationType(readLegacyDecision(record.decision));

  const decision = record.decision
    ? readLegacyDecision(record.decision)
    : mapRecommendationTypeToDecision(recommendationType);

  const disagreements = readDisagreements(record.disagreements ?? []);
  const nextActions = record.nextActions
    ? readNextActions(record.nextActions)
    : record.nextSteps
      ? readNextActionsFromLegacySteps(readStringArray(record.nextSteps, "nextSteps"))
      : [];

  if (nextActions.length === 0) {
    throw new ChairmanModelOutputParseError(
      "nextActions must contain at least one action.",
    );
  }

  const reversalCriteria = readFlexibleStringArray(
    record.reversalCriteria ?? [],
    "reversalCriteria",
  );

  if (reversalCriteria.length === 0) {
    throw new ChairmanModelOutputParseError(
      "reversalCriteria must contain at least one item.",
    );
  }

  const finalRecommendation = readNonEmptyString(
    record.finalRecommendation ?? record.rationale,
    "finalRecommendation",
    FINAL_RECOMMENDATION_MAX_LENGTH,
  );

  return {
    executiveSummary: readNonEmptyString(
      record.executiveSummary,
      "executiveSummary",
      EXECUTIVE_SUMMARY_MAX_LENGTH,
    ),
    finalRecommendation,
    decisionStatement: readNonEmptyString(
      record.decisionStatement ?? record.decision,
      "decisionStatement",
      DECISION_STATEMENT_MAX_LENGTH,
    ),
    decision,
    recommendationType,
    consensus: readStringArray(record.consensus ?? [], "consensus"),
    disagreements,
    decisiveTradeoffs: readTradeoffs(record.decisiveTradeoffs ?? []),
    assumptions: readFlexibleStringArray(record.assumptions ?? [], "assumptions"),
    conditions: readFlexibleStringArray(record.conditions ?? [], "conditions"),
    risks: readFlexibleStringArray(record.risks ?? [], "risks"),
    unknowns: readFlexibleStringArray(record.unknowns ?? [], "unknowns"),
    minorityView: readMinorityView(record.minorityView),
    minimumAdditionalEvidence: readEvidenceRequirements(
      record.minimumAdditionalEvidence ?? [],
    ),
    nextActions,
    reversalCriteria,
    keyArguments: readStringArray(record.keyArguments ?? [], "keyArguments"),
    confidence: readConfidence(record.confidence),
  };
}
