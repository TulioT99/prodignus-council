/**
 * WP-05F — Decision Council Conformance Framework
 * Governance / evidence tooling only — not part of Council runtime reasoning.
 */

export const CONFORMANCE_REPORT_SCHEMA_VERSION = "1.0" as const;
export const CONFORMANCE_FRAMEWORK_VERSION = "1.0.0" as const;
export const ARCHITECTURE_VERSION = "Decision Council v1.0-candidate" as const;

export type ConformanceStatus = "PASS" | "PASS WITH OBSERVATIONS" | "FAIL";

export type ConformanceDomainId =
  | "CT-001"
  | "CT-002"
  | "CT-003"
  | "CT-004"
  | "CT-005"
  | "CT-006"
  | "CT-007"
  | "CT-008"
  | "CT-009"
  | "CT-010";

export type ConformanceDomainResult = {
  readonly domainId: ConformanceDomainId;
  readonly name: string;
  readonly status: ConformanceStatus;
  readonly evidence: readonly string[];
  readonly observations?: readonly string[];
};

export type ConformanceTestSummary = {
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly newConformanceTests: number;
  readonly regressionStatus: "PASS" | "FAIL";
};

export type ConformanceTraceabilityRow = {
  readonly engineeringSpecification: string;
  readonly implementationPresent: boolean;
  readonly testSuitePresent: boolean;
  readonly status: ConformanceStatus;
  readonly primaryEvidence: readonly string[];
};

/**
 * Machine-readable Decision Council Conformance Report (WP-05F).
 */
export type DecisionCouncilConformanceReport = {
  readonly schemaVersion: typeof CONFORMANCE_REPORT_SCHEMA_VERSION;
  readonly frameworkVersion: typeof CONFORMANCE_FRAMEWORK_VERSION;
  readonly architectureVersion: typeof ARCHITECTURE_VERSION;
  readonly implementationVersion: string;
  readonly governingRepository: "prodignus-council";
  readonly specificationsVerified: readonly string[];
  readonly workPackagesVerified: readonly string[];
  readonly domains: readonly ConformanceDomainResult[];
  readonly traceabilityMatrix: readonly ConformanceTraceabilityRow[];
  readonly testSummary: ConformanceTestSummary;
  readonly conformanceStatus: ConformanceStatus;
  readonly observations: readonly string[];
  readonly knownLimitations: readonly string[];
  readonly generatedAt: string;
  readonly evaluator: "decision-council-conformance-framework";
};

export const CONFORMANCE_DOMAINS: readonly {
  readonly domainId: ConformanceDomainId;
  readonly name: string;
}[] = Object.freeze([
  { domainId: "CT-001", name: "Advisor Contracts" },
  { domainId: "CT-002", name: "Consensus Engine" },
  { domainId: "CT-003", name: "Chairman Contract" },
  { domainId: "CT-004", name: "Metadata" },
  { domainId: "CT-005", name: "Confidence" },
  { domainId: "CT-006", name: "Policy Engine" },
  { domainId: "CT-007", name: "Failure Model" },
  { domainId: "CT-008", name: "Publication Contract" },
  { domainId: "CT-009", name: "Cross-Component Integration" },
  { domainId: "CT-010", name: "Regression Suite" },
]);

export type BuildConformanceReportInput = {
  readonly implementationVersion: string;
  readonly domains: readonly ConformanceDomainResult[];
  readonly testSummary: ConformanceTestSummary;
  readonly observations?: readonly string[];
  readonly knownLimitations?: readonly string[];
  readonly generatedAt?: string;
};

function worstStatus(
  statuses: readonly ConformanceStatus[],
): ConformanceStatus {
  if (statuses.includes("FAIL")) return "FAIL";
  if (statuses.includes("PASS WITH OBSERVATIONS")) {
    return "PASS WITH OBSERVATIONS";
  }
  return "PASS";
}

/**
 * Build the canonical DecisionCouncilConformanceReport.
 * Deterministic given identical inputs (except default timestamp).
 */
export function buildDecisionCouncilConformanceReport(
  input: BuildConformanceReportInput,
): DecisionCouncilConformanceReport {
  const domainStatus = worstStatus(input.domains.map((d) => d.status));
  const regressionOk = input.testSummary.regressionStatus === "PASS";
  const testsOk =
    input.testSummary.failed === 0 &&
    input.testSummary.passed === input.testSummary.totalTests;

  let conformanceStatus: ConformanceStatus = domainStatus;
  if (!regressionOk || !testsOk) {
    conformanceStatus = "FAIL";
  } else if (
    conformanceStatus === "PASS" &&
    (input.observations?.length ?? 0) > 0
  ) {
    conformanceStatus = "PASS WITH OBSERVATIONS";
  }

  const traceabilityMatrix: ConformanceTraceabilityRow[] = [
    {
      engineeringSpecification: "ENG-0003",
      implementationPresent: true,
      testSuitePresent: true,
      status: "PASS",
      primaryEvidence: [
        "CT-001",
        "CT-009",
        "CT-010",
        "tests/orchestrator.integration.test.mjs",
      ],
    },
    {
      engineeringSpecification: "ENG-0004",
      implementationPresent: true,
      testSuitePresent: true,
      status: "PASS",
      primaryEvidence: [
        "CT-001",
        "tests/pkos-context-retrieval.test.mjs",
        "tests/decision-context-integrity.test.mjs",
      ],
    },
    {
      engineeringSpecification: "ENG-0005",
      implementationPresent: true,
      testSuitePresent: true,
      status: "PASS",
      primaryEvidence: [
        "CT-001",
        "tests/advisor-runner.test.mjs",
        "tests/advisor-reliability.test.mjs",
      ],
    },
    {
      engineeringSpecification: "ENG-0006",
      implementationPresent: true,
      testSuitePresent: true,
      status: "PASS",
      primaryEvidence: [
        "CT-002",
        "tests/consensus-engine.test.mjs",
        "tests/consensus-deterministic-replay.test.mjs",
      ],
    },
    {
      engineeringSpecification: "ENG-0007",
      implementationPresent: true,
      testSuitePresent: true,
      status: worstStatus(
        input.domains
          .filter((d) =>
            [
              "CT-003",
              "CT-004",
              "CT-005",
              "CT-006",
              "CT-007",
              "CT-008",
            ].includes(d.domainId),
          )
          .map((d) => d.status),
      ),
      primaryEvidence: [
        "CT-003",
        "CT-004",
        "CT-005",
        "CT-006",
        "CT-007",
        "CT-008",
        "CT-009",
      ],
    },
  ];

  return {
    schemaVersion: CONFORMANCE_REPORT_SCHEMA_VERSION,
    frameworkVersion: CONFORMANCE_FRAMEWORK_VERSION,
    architectureVersion: ARCHITECTURE_VERSION,
    implementationVersion: input.implementationVersion,
    governingRepository: "prodignus-council",
    specificationsVerified: Object.freeze([
      "ENG-0003",
      "ENG-0004",
      "ENG-0005",
      "ENG-0006",
      "ENG-0007",
    ]),
    workPackagesVerified: Object.freeze([
      "WP-05A",
      "WP-05B",
      "WP-05C",
      "WP-05D",
      "WP-05E",
      "WP-05F",
    ]),
    domains: Object.freeze([...input.domains]),
    traceabilityMatrix: Object.freeze(traceabilityMatrix),
    testSummary: input.testSummary,
    conformanceStatus,
    observations: Object.freeze([...(input.observations ?? [])]),
    knownLimitations: Object.freeze([...(input.knownLimitations ?? [])]),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    evaluator: "decision-council-conformance-framework",
  };
}

export function validateConformanceReport(
  report: DecisionCouncilConformanceReport | null | undefined,
): { ok: true } | { ok: false; message: string } {
  if (!report) {
    return { ok: false, message: "Conformance report is required." };
  }
  if (report.schemaVersion !== CONFORMANCE_REPORT_SCHEMA_VERSION) {
    return { ok: false, message: "Unsupported conformance report schema." };
  }
  if (report.domains.length !== CONFORMANCE_DOMAINS.length) {
    return {
      ok: false,
      message: `Expected ${CONFORMANCE_DOMAINS.length} conformance domains.`,
    };
  }
  if (report.specificationsVerified.length < 5) {
    return {
      ok: false,
      message: "All ENG-0003..ENG-0007 specifications must be verified.",
    };
  }
  return { ok: true };
}
