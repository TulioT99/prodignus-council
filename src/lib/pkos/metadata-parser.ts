import {
  DOCUMENT_ID_PATTERN,
  NAVIGATION_ONLY_FILENAMES,
} from "@/lib/pkos/constants";
import type { PKOSArtifact } from "@/types/pkos";

type ParsedFrontMatter = {
  readonly fields: Record<string, string | string[]>;
  readonly body: string;
};

function normalizeScalar(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function parseSimpleFrontMatter(content: string): ParsedFrontMatter {
  if (!content.startsWith("---")) {
    return { fields: {}, body: content };
  }

  const endIndex = content.indexOf("\n---", 3);

  if (endIndex === -1) {
    return { fields: {}, body: content };
  }

  const frontMatterBlock = content.slice(3, endIndex).trim();
  const body = content.slice(endIndex + 4).replace(/^\n?/, "");
  const fields: Record<string, string | string[]> = {};
  let currentListKey: string | null = null;

  for (const rawLine of frontMatterBlock.split("\n")) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      continue;
    }

    const listMatch = line.match(/^\s*-\s+(.+)$/);

    if (listMatch && currentListKey) {
      const existing = fields[currentListKey];

      if (Array.isArray(existing)) {
        existing.push(normalizeScalar(listMatch[1]));
      } else {
        fields[currentListKey] = [normalizeScalar(listMatch[1])];
      }

      continue;
    }

    const keyValueMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!keyValueMatch) {
      continue;
    }

    const key = keyValueMatch[1];
    const value = keyValueMatch[2];

    if (!value) {
      fields[key] = [];
      currentListKey = key;
      continue;
    }

    fields[key] = normalizeScalar(value);
    currentListKey = null;
  }

  return { fields, body };
}

function inferDocumentId(
  fields: Record<string, string | string[]>,
  fileName: string,
  body: string,
): string | null {
  const fieldId = fields.id;

  if (typeof fieldId === "string" && fieldId.trim()) {
    return fieldId.trim().toUpperCase();
  }

  const fileMatch = fileName.match(
    /^(ADR|ENG|PK|OPS|KA|DDS|ADV)-\d{4}/i,
  );

  if (fileMatch) {
    return fileMatch[0].toUpperCase();
  }

  const headingMatch = body.match(
    /^#\s+(?:[A-Z]{2,4}-\d{4}\s*[—:-]\s*)?(.+)$/m,
  );

  if (headingMatch) {
    const headingId = headingMatch[0].match(DOCUMENT_ID_PATTERN);

    if (headingId?.[0]) {
      return headingId[0].toUpperCase();
    }
  }

  return null;
}

function inferTitle(
  fields: Record<string, string | string[]>,
  fileName: string,
  body: string,
): string {
  if (typeof fields.title === "string" && fields.title.trim()) {
    return fields.title.trim();
  }

  const headingMatch = body.match(/^#\s+(.+)$/m);

  if (headingMatch?.[1]) {
    return headingMatch[1].replace(/^[A-Z]{2,4}-\d{4}\s*[—:-]\s*/i, "").trim();
  }

  return fileName.replace(/\.md$/i, "");
}

function inferFamily(
  repositoryRelativePath: string,
  documentId: string | null,
): string {
  const prefix = documentId?.split("-")[0]?.toUpperCase();

  if (prefix === "ADR") return "ADR";
  if (prefix === "ENG") return "ENG";
  if (prefix === "PK") return "PK";
  if (prefix === "OPS") return "OPS";
  if (prefix === "KA") return "KA";
  if (prefix === "DDS") return "DDS";
  if (prefix === "ADV") return "ADV";

  const normalizedPath = repositoryRelativePath.replace(/\\/g, "/").toLowerCase();

  if (normalizedPath.startsWith("foundation/")) return "Foundation";
  if (normalizedPath.startsWith("product/")) return "PK";
  if (normalizedPath.startsWith("decisions/")) return "ADR";
  if (normalizedPath.startsWith("engineering/")) return "ENG";
  if (normalizedPath.startsWith("knowledge-architecture/")) return "KA";
  if (normalizedPath.startsWith("operations/")) return "OPS";

  return "Unknown";
}

function normalizeStatus(value: string | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return value.trim().toLowerCase();
}

function normalizeRelated(
  fields: Record<string, string | string[]>,
): readonly string[] | undefined {
  const related = fields.related;

  if (!related) {
    return undefined;
  }

  const values = Array.isArray(related) ? related : [related];
  const normalized = values
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);

  return normalized.length > 0 ? Object.freeze(normalized) : undefined;
}

export function parsePKOSArtifact(
  repositoryRelativePath: string,
  rawContent: string,
): { artifact: PKOSArtifact | null; warnings: string[] } {
  const warnings: string[] = [];
  const fileName = repositoryRelativePath.split("/").pop() ?? repositoryRelativePath;
  const { fields, body } = parseSimpleFrontMatter(rawContent);
  const documentId = inferDocumentId(fields, fileName, body);
  const title = inferTitle(fields, fileName, body);

  if (!documentId) {
    warnings.push("Unable to establish a canonical document identifier.");
    return { artifact: null, warnings };
  }

  if (!title.trim()) {
    warnings.push("Unable to establish an artifact title.");
    return { artifact: null, warnings };
  }

  const status =
    normalizeStatus(
      typeof fields.status === "string" ? fields.status : undefined,
    ) ??
    normalizeStatus(
      typeof fields.classification === "string"
        ? fields.classification
        : undefined,
    );

  const version =
    typeof fields.version === "string"
      ? fields.version.replace(/^['"]|['"]$/g, "")
      : undefined;

  const artifact: PKOSArtifact = Object.freeze({
    id: documentId,
    title,
    family: inferFamily(repositoryRelativePath, documentId),
    status,
    version,
    path: repositoryRelativePath,
    related: normalizeRelated(fields),
    tags: undefined,
    content: body,
    isNavigationOnly: NAVIGATION_ONLY_FILENAMES.has(fileName),
    parsingWarnings: Object.freeze(warnings),
  });

  return { artifact, warnings };
}

export function extractHeading(documentContent: string): string | null {
  const match = documentContent.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}
