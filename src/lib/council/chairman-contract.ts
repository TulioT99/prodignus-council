import "server-only";

import type { ConsensusPackage } from "@/lib/council/consensus/types";
import type {
  AdvisorResult,
  ChairmanFailureReasonCode,
  DecisionContext,
} from "@/types/council";
import type { EvidencePackage } from "@/types/pkos";

/**
 * Engineering-defined Chairman input contract (ENG-0007 §5 / WP-05A).
 * Consensus Package is the mandatory architectural boundary from ENG-0006.
 */
export type ChairmanInputContract = {
  readonly consensus: ConsensusPackage;
  readonly requestContext: DecisionContext;
  /** PKOS evidence reference when attached upstream; absence is not invented here. */
  readonly pkosContextRef: EvidencePackage | undefined;
  readonly executionMetadata: {
    readonly executionId: string;
    readonly decisionId: string;
    readonly advisorCount: number;
  };
  readonly confidenceMetadata: ConsensusPackage["confidence"];
};

export type ChairmanContractValidationSuccess = {
  readonly ok: true;
  readonly contract: ChairmanInputContract;
};

export type ChairmanContractValidationFailure = {
  readonly ok: false;
  readonly code: ChairmanFailureReasonCode;
  readonly message: string;
};

export type ChairmanContractValidationResult =
  ChairmanContractValidationSuccess | ChairmanContractValidationFailure;

export type ChairmanContractValidationInput = {
  readonly decisionContext: DecisionContext | null | undefined;
  readonly advisors: readonly AdvisorResult[] | null | undefined;
  readonly consensus: ConsensusPackage | null | undefined;
};

const CONSENSUS_STATUSES = new Set([
  "complete",
  "degraded",
  "insufficient",
  "no_consensus",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReadonlyArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function validateConsensusPackageSchema(
  consensus: unknown,
): ChairmanContractValidationFailure | null {
  if (!isObject(consensus)) {
    return {
      ok: false,
      code: "INVALID_CONSENSUS_PACKAGE_SCHEMA",
      message:
        "Consensus Package schema is invalid: package must be a structured object.",
    };
  }

  if (consensus.schemaVersion !== "1.0") {
    return {
      ok: false,
      code: "INVALID_CONSENSUS_PACKAGE_SCHEMA",
      message:
        'Consensus Package schema is invalid: schemaVersion must be "1.0".',
    };
  }

  if (!isNonEmptyString(consensus.executionId)) {
    return {
      ok: false,
      code: "INVALID_IDENTIFIERS",
      message: "Consensus Package is missing a mandatory execution identifier.",
    };
  }

  if (
    typeof consensus.status !== "string" ||
    !CONSENSUS_STATUSES.has(consensus.status)
  ) {
    return {
      ok: false,
      code: "INVALID_CONSENSUS_PACKAGE_SCHEMA",
      message:
        "Consensus Package schema is invalid: status is missing or unknown.",
    };
  }

  const requiredArrays = [
    "participatingAdvisors",
    "excludedAdvisors",
    "agreementMap",
    "disagreementMap",
    "minorityPositions",
    "unresolvedConflicts",
    "openQuestions",
    "consensusRationale",
  ] as const;

  for (const key of requiredArrays) {
    if (!isReadonlyArray(consensus[key])) {
      return {
        ok: false,
        code: "INVALID_CONSENSUS_PACKAGE_SCHEMA",
        message: `Consensus Package schema is invalid: ${key} must be an array.`,
      };
    }
  }

  if (!isObject(consensus.evidenceCoverage)) {
    return {
      ok: false,
      code: "INVALID_CONSENSUS_PACKAGE_SCHEMA",
      message:
        "Consensus Package schema is invalid: evidenceCoverage is required.",
    };
  }

  if (!isObject(consensus.confidence)) {
    return {
      ok: false,
      code: "INVALID_CONSENSUS_PACKAGE_SCHEMA",
      message:
        "Consensus Package schema is invalid: confidence metadata is required.",
    };
  }

  const confidence = consensus.confidence;
  if (
    typeof confidence.overall !== "number" ||
    !Number.isFinite(confidence.overall) ||
    typeof confidence.advisorConfidenceMean !== "number" ||
    typeof confidence.method !== "string"
  ) {
    return {
      ok: false,
      code: "INVALID_CONSENSUS_PACKAGE_SCHEMA",
      message:
        "Consensus Package schema is invalid: confidence metadata fields are incomplete.",
    };
  }

  if (!isObject(consensus.metadata)) {
    return {
      ok: false,
      code: "MISSING_EXECUTION_METADATA",
      message: "Consensus Package is missing required execution metadata.",
    };
  }

  const metadata = consensus.metadata;
  if (metadata.schemaVersion !== "1.0") {
    return {
      ok: false,
      code: "INVALID_CONSENSUS_PACKAGE_SCHEMA",
      message:
        'Consensus Package schema is invalid: metadata.schemaVersion must be "1.0".',
    };
  }

  if (!isNonEmptyString(metadata.executionId)) {
    return {
      ok: false,
      code: "INVALID_IDENTIFIERS",
      message:
        "Consensus Package metadata is missing a mandatory execution identifier.",
    };
  }

  if (
    typeof metadata.eligibleCount !== "number" ||
    typeof metadata.excludedCount !== "number" ||
    typeof metadata.expectedAdvisorCount !== "number" ||
    typeof metadata.minimumEligibleAdvisors !== "number" ||
    !isReadonlyArray(metadata.degradationFlags) ||
    !isNonEmptyString(metadata.configIdentity)
  ) {
    return {
      ok: false,
      code: "MISSING_EXECUTION_METADATA",
      message: "Consensus Package execution metadata is incomplete.",
    };
  }

  return null;
}

/**
 * Validate the Chairman execution contract before any LLM invocation.
 * Failures are operational contract rejections — never recommendation outcomes.
 */
export function validateChairmanExecutionContract(
  input: ChairmanContractValidationInput,
): ChairmanContractValidationResult {
  if (!input.decisionContext) {
    return {
      ok: false,
      code: "INVALID_CHAIRMAN_CONTRACT",
      message: "Decision context is required for Chairman execution.",
    };
  }

  if (!input.advisors) {
    return {
      ok: false,
      code: "INVALID_CHAIRMAN_CONTRACT",
      message: "Advisor results are required for Chairman execution.",
    };
  }

  if (input.consensus == null) {
    return {
      ok: false,
      code: "MISSING_CONSENSUS_PACKAGE",
      message:
        "A published Consensus Package is required before Chairman execution.",
    };
  }

  const schemaFailure = validateConsensusPackageSchema(input.consensus);
  if (schemaFailure) {
    return schemaFailure;
  }

  const consensus = input.consensus;
  const decisionContext = input.decisionContext;

  if (!isNonEmptyString(decisionContext.executionId)) {
    return {
      ok: false,
      code: "INVALID_IDENTIFIERS",
      message: "Decision context is missing a mandatory execution identifier.",
    };
  }

  if (!isNonEmptyString(decisionContext.decisionId)) {
    return {
      ok: false,
      code: "INVALID_IDENTIFIERS",
      message: "Decision context is missing a mandatory decision identifier.",
    };
  }

  if (!isNonEmptyString(decisionContext.question)) {
    return {
      ok: false,
      code: "INVALID_CHAIRMAN_CONTRACT",
      message: "The decision question is required for Chairman execution.",
    };
  }

  if (consensus.executionId !== decisionContext.executionId) {
    return {
      ok: false,
      code: "INVALID_IDENTIFIERS",
      message:
        "Consensus Package execution identifier does not match the decision context.",
    };
  }

  if (consensus.metadata.executionId !== decisionContext.executionId) {
    return {
      ok: false,
      code: "INVALID_IDENTIFIERS",
      message:
        "Consensus Package metadata execution identifier does not match the decision context.",
    };
  }

  return {
    ok: true,
    contract: {
      consensus,
      requestContext: decisionContext,
      pkosContextRef: decisionContext.pkosEvidence,
      executionMetadata: {
        executionId: decisionContext.executionId,
        decisionId: decisionContext.decisionId,
        advisorCount: input.advisors.length,
      },
      confidenceMetadata: consensus.confidence,
    },
  };
}
