import {
  DOCUMENT_ID_PATTERN,
  FAMILY_KEYWORDS,
  STOP_WORDS,
} from "@/lib/pkos/constants";
import type { DecisionContext } from "@/types/council";
import type { RequestAnalysis } from "@/types/pkos";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalizeWhitespace(value.toLowerCase())
    .split(/[^a-z0-9à-ú]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function extractDocumentIds(text: string): string[] {
  const matches = text.match(DOCUMENT_ID_PATTERN) ?? [];
  const normalized = matches.map((match) => match.toUpperCase());
  return [...new Set(normalized)].sort();
}

function inferFamilies(text: string, documentIds: readonly string[]): string[] {
  const families = new Set<string>();
  const normalized = text.toLowerCase();

  for (const documentId of documentIds) {
    const prefix = documentId.split("-")[0];

    if (prefix === "ADR") families.add("ADR");
    if (prefix === "ENG") families.add("ENG");
    if (prefix === "PK") families.add("PK");
    if (prefix === "OPS") families.add("OPS");
    if (prefix === "KA") families.add("KA");
    if (prefix === "DDS") families.add("DDS");
    if (prefix === "ADV") families.add("ADV");
  }

  for (const [family, keywords] of Object.entries(FAMILY_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      families.add(family);
    }
  }

  if (normalized.includes("product principle")) {
    families.add("PK");
  }

  if (normalized.includes("context retrieval")) {
    families.add("ENG");
    families.add("ADR");
  }

  return [...families].sort();
}

function extractPhrases(text: string): string[] {
  const phrases = new Set<string>();
  const candidates = [
    "product principles",
    "decision council",
    "context retrieval",
    "knowledge retrieval",
    "executive reasoning",
    "canonical knowledge",
    "governance hierarchy",
    "evidence package",
  ];

  const normalized = text.toLowerCase();

  for (const phrase of candidates) {
    if (normalized.includes(phrase)) {
      phrases.add(phrase);
    }
  }

  return [...phrases].sort();
}

export function analyzeCouncilRequest(
  decisionContext: DecisionContext,
): RequestAnalysis {
  const combined = normalizeWhitespace(
    [
      decisionContext.title,
      decisionContext.question,
      decisionContext.context,
      decisionContext.constraints,
      decisionContext.objectives ?? "",
    ].join(" "),
  );

  const documentIds = extractDocumentIds(combined);
  const keywords = tokenize(combined);
  const families = inferFamilies(combined, documentIds);
  const phrases = extractPhrases(combined);

  return Object.freeze({
    normalizedText: combined,
    keywords: Object.freeze(keywords),
    documentIds: Object.freeze(documentIds),
    families: Object.freeze(families),
    phrases: Object.freeze(phrases),
    language: decisionContext.language,
  });
}

export function buildRequestSummary(decisionContext: DecisionContext): string {
  return normalizeWhitespace(
    `${decisionContext.title}: ${decisionContext.question}`,
  );
}
