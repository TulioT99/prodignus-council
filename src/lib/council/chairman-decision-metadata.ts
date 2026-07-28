import "server-only";

import type { ConsensusPackage } from "@/lib/council/consensus/types";
import type {
  ChairmanFailureTraceability,
  DecisionContext,
  DecisionMetadata,
} from "@/types/council";

/**
 * WP-05A published baseline — governing implementation lineage for WP-05B metadata.
 * Do not silently drift; update only when a new published baseline supersedes WP-05A.
 */
export const CHAIRMAN_IMPLEMENTATION_BASELINE =
  "9ae4974941bb253c8b7977a1fa18f63236e8cdb7" as const;

/** Chairman Decision Engine contract version applied for metadata (ENG-0007). */
export const CHAIRMAN_SPECIFICATION_VERSION = "1.0" as const;

/** Governing engineering specification identity. */
export const GOVERNING_ENGINEERING_SPECIFICATION = "ENG-0007" as const;

/** Approved ENG-0007 version recorded on published packages. */
export const GOVERNING_ENGINEERING_SPECIFICATION_VERSION = "1.0" as const;

export const DECISION_METADATA_SCHEMA_VERSION = "1.0" as const;

export type DecisionMetadataClock = {
  now(): string;
};

export const systemDecisionMetadataClock: DecisionMetadataClock = {
  now: () => new Date().toISOString(),
};

export type BuildDecisionMetadataInput = {
  readonly decisionContext: DecisionContext;
  readonly consensus: ConsensusPackage;
  readonly clock?: DecisionMetadataClock;
};

export type BuildFailureTraceabilityInput = {
  readonly executionId: string;
  readonly decisionContext?: DecisionContext | null;
  readonly consensus?: ConsensusPackage | null;
  readonly clock?: DecisionMetadataClock;
};

export type DecisionMetadataValidationSuccess = {
  readonly ok: true;
  readonly metadata: DecisionMetadata;
};

export type DecisionMetadataValidationFailure = {
  readonly ok: false;
  readonly message: string;
};

export type DecisionMetadataValidationResult =
  DecisionMetadataValidationSuccess | DecisionMetadataValidationFailure;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: string): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function buildConsensusPackageId(consensus: ConsensusPackage): string {
  return `cp:${consensus.executionId}:v${consensus.schemaVersion}`;
}

export function buildDecisionPackageId(executionId: string): string {
  return `decpkg:${executionId}`;
}

export function buildTraceabilityId(executionId: string): string {
  return `trace:${executionId}`;
}

export function buildFailureId(executionId: string): string {
  return `chfail:${executionId}`;
}

export function buildExecutionMetadataReference(
  consensus: ConsensusPackage,
): string {
  return `execmeta:${consensus.executionId}:cfg:${consensus.metadata.configIdentity}`;
}

/**
 * Build Decision Metadata for a successful Chairman publication (ENG-0007 §6.2).
 * Timestamp is generated exactly once per call.
 */
export function buildDecisionMetadata(
  input: BuildDecisionMetadataInput,
): DecisionMetadata {
  const clock = input.clock ?? systemDecisionMetadataClock;
  const decisionTimestamp = clock.now();
  const { decisionContext, consensus } = input;
  const consensusPackageId = buildConsensusPackageId(consensus);

  return Object.freeze({
    schemaVersion: DECISION_METADATA_SCHEMA_VERSION,
    decisionId: buildDecisionPackageId(decisionContext.executionId),
    decisionTimestamp,
    chairmanSpecificationVersion: CHAIRMAN_SPECIFICATION_VERSION,
    governingEngineeringSpecification: GOVERNING_ENGINEERING_SPECIFICATION,
    governingEngineeringSpecificationVersion:
      GOVERNING_ENGINEERING_SPECIFICATION_VERSION,
    implementationBaseline: CHAIRMAN_IMPLEMENTATION_BASELINE,
    consensusPackageId,
    consensusSchemaVersion: consensus.schemaVersion,
    executionId: decisionContext.executionId,
    requestId: decisionContext.decisionId,
    sessionId: decisionContext.executionId,
    traceabilityId: buildTraceabilityId(decisionContext.executionId),
    parentConsensusReference: consensusPackageId,
    executionMetadataReference: buildExecutionMetadataReference(consensus),
  });
}

/**
 * Build failure-path traceability (ENG-0007 §6.2.1).
 * Does not invent a completed decision package identity.
 */
export function buildChairmanFailureTraceability(
  input: BuildFailureTraceabilityInput,
): ChairmanFailureTraceability {
  const clock = input.clock ?? systemDecisionMetadataClock;
  const failureTimestamp = clock.now();
  const executionId = input.executionId.trim() || "unknown";
  const consensus = input.consensus ?? undefined;
  const consensusPackageId = consensus
    ? buildConsensusPackageId(consensus)
    : undefined;

  return Object.freeze({
    schemaVersion: DECISION_METADATA_SCHEMA_VERSION,
    failureId: buildFailureId(executionId),
    failureTimestamp,
    decisionAbsent: true as const,
    chairmanSpecificationVersion: CHAIRMAN_SPECIFICATION_VERSION,
    governingEngineeringSpecification: GOVERNING_ENGINEERING_SPECIFICATION,
    governingEngineeringSpecificationVersion:
      GOVERNING_ENGINEERING_SPECIFICATION_VERSION,
    implementationBaseline: CHAIRMAN_IMPLEMENTATION_BASELINE,
    executionId,
    requestId: input.decisionContext?.decisionId,
    sessionId: executionId !== "unknown" ? executionId : undefined,
    consensusPackageId,
    consensusSchemaVersion: consensus?.schemaVersion,
    traceabilityId: buildTraceabilityId(executionId),
    parentConsensusReference: consensusPackageId,
    executionMetadataReference: consensus
      ? buildExecutionMetadataReference(consensus)
      : undefined,
  });
}

/**
 * Validate Decision Metadata before successful Chairman publication.
 * Invalid metadata must block success-path publication.
 */
export function validateDecisionMetadata(
  metadata: DecisionMetadata | null | undefined,
  expected: {
    readonly executionId: string;
    readonly requestId: string;
    readonly consensusPackageId: string;
  },
): DecisionMetadataValidationResult {
  if (!metadata || typeof metadata !== "object") {
    return {
      ok: false,
      message:
        "Decision Metadata is required for successful Chairman publication.",
    };
  }

  if (metadata.schemaVersion !== DECISION_METADATA_SCHEMA_VERSION) {
    return {
      ok: false,
      message: 'Decision Metadata schemaVersion must be "1.0".',
    };
  }

  const requiredStrings: Array<keyof DecisionMetadata> = [
    "decisionId",
    "decisionTimestamp",
    "chairmanSpecificationVersion",
    "governingEngineeringSpecification",
    "governingEngineeringSpecificationVersion",
    "implementationBaseline",
    "consensusPackageId",
    "consensusSchemaVersion",
    "executionId",
    "requestId",
    "traceabilityId",
    "parentConsensusReference",
    "executionMetadataReference",
  ];

  for (const key of requiredStrings) {
    if (!isNonEmptyString(metadata[key])) {
      return {
        ok: false,
        message: `Decision Metadata is missing required field: ${key}.`,
      };
    }
  }

  if (!isIsoTimestamp(metadata.decisionTimestamp)) {
    return {
      ok: false,
      message:
        "Decision Metadata decisionTimestamp must be a valid ISO-8601 timestamp.",
    };
  }

  if (metadata.governingEngineeringSpecification !== "ENG-0007") {
    return {
      ok: false,
      message:
        'Decision Metadata governingEngineeringSpecification must be "ENG-0007".',
    };
  }

  if (metadata.executionId !== expected.executionId) {
    return {
      ok: false,
      message:
        "Decision Metadata executionId does not match the Chairman execution identity.",
    };
  }

  if (metadata.requestId !== expected.requestId) {
    return {
      ok: false,
      message:
        "Decision Metadata requestId does not match the decision request identity.",
    };
  }

  if (metadata.consensusPackageId !== expected.consensusPackageId) {
    return {
      ok: false,
      message:
        "Decision Metadata consensusPackageId does not match the consumed Consensus Package.",
    };
  }

  if (metadata.parentConsensusReference !== metadata.consensusPackageId) {
    return {
      ok: false,
      message:
        "Decision Metadata parentConsensusReference must equal consensusPackageId.",
    };
  }

  if (metadata.implementationBaseline !== CHAIRMAN_IMPLEMENTATION_BASELINE) {
    return {
      ok: false,
      message:
        "Decision Metadata implementationBaseline does not match the published WP-05A baseline.",
    };
  }

  return { ok: true, metadata };
}
