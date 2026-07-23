import type { DecisionContext } from "@/types/council";
import type { EvidencePackage } from "@/types/pkos";

export function formatCanonicalEvidenceSection(
  evidencePackage: EvidencePackage | undefined,
): string {
  if (!evidencePackage) {
    return "=== CANONICAL PKOS EVIDENCE ===\n(none retrieved)";
  }

  const header = [
    "=== CANONICAL PKOS EVIDENCE ===",
    `Retrieval status: ${evidencePackage.retrievalStatus}`,
    `Generated at: ${evidencePackage.generatedAt}`,
  ];

  if (evidencePackage.warnings.length > 0) {
    header.push("Retrieval warnings:");
    for (const warning of evidencePackage.warnings) {
      header.push(
        `- [${warning.code}] ${warning.message}${
          warning.artifactId ? ` (${warning.artifactId})` : ""
        }`,
      );
    }
  }

  if (evidencePackage.sources.length === 0) {
    header.push("(No canonical PKOS sources were selected.)");
    header.push(
      "Do not present intrinsic model knowledge as canonical PKOS evidence.",
    );
    return header.join("\n");
  }

  header.push("Selected canonical sources:");

  const sourceSections = evidencePackage.sources.map((source, index) => {
    return [
      `--- SOURCE ${index + 1}: ${source.artifactId} ---`,
      `Title: ${source.title}`,
      `Family: ${source.family}`,
      `Status: ${source.status ?? "unknown"}`,
      `Repository path: ${source.path}`,
      `Relevance score: ${source.relevanceScore}`,
      `Relevance reasons: ${source.relevanceReasons.join("; ")}`,
      "Excerpt:",
      source.excerpt,
    ].join("\n");
  });

  header.push(...sourceSections);
  header.push(
    "=== END CANONICAL PKOS EVIDENCE ===",
    "Use only the canonical evidence above for PKOS-backed claims. Treat advisor analysis separately.",
  );

  return header.join("\n\n");
}

export function formatUserDecisionContext(decisionContext: DecisionContext): string {
  return [
    "=== USER DECISION REQUEST ===",
    `Execution ID: ${decisionContext.executionId}`,
    `Language: ${decisionContext.language}`,
    `Decision ID: ${decisionContext.decisionId}`,
    `Title: ${decisionContext.title}`,
    `Question: ${decisionContext.question}`,
    `Context: ${decisionContext.context || "(none provided)"}`,
    `Objectives: ${decisionContext.objectives || "(none provided)"}`,
    `Constraints: ${decisionContext.constraints || "(none provided)"}`,
    `Status: ${decisionContext.status}`,
    "=== END USER DECISION REQUEST ===",
  ].join("\n");
}

export function formatAdvisorInstructionsSection(): string {
  return [
    "=== ADVISOR INSTRUCTIONS ===",
    "Analyze the user decision request using your assigned thinking lens.",
    "Treat canonical PKOS evidence as authoritative organizational knowledge.",
    "Do not invent canonical facts not present in the canonical evidence section.",
    "Distinguish canonical evidence from assumptions and model-generated analysis.",
    "=== END ADVISOR INSTRUCTIONS ===",
  ].join("\n");
}

export function buildCouncilPromptContext(decisionContext: DecisionContext): string {
  return [
    formatUserDecisionContext(decisionContext),
    formatCanonicalEvidenceSection(decisionContext.pkosEvidence),
    formatAdvisorInstructionsSection(),
  ].join("\n\n");
}
