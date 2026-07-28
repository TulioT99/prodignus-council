import path from "node:path";

/**
 * Extract the first full SHA-1 / SHA-256-looking commit hash from baseline markdown.
 * Prefers a table/field context containing "Commit hash".
 */
export function extractCommitHashFromBaseline(content: string): string | null {
  const fieldMatch = content.match(/Commit hash\s*\|\s*`?([0-9a-f]{7,64})`?/i);
  if (fieldMatch?.[1]) {
    return fieldMatch[1];
  }

  const generic = content.match(/\b([0-9a-f]{40})\b/i);
  return generic?.[1] ?? null;
}

export function pathIsAllowed(
  relativePath: string,
  allowedPathPrefixes: readonly string[],
): boolean {
  const normalized = relativePath.replaceAll("\\", "/");

  return allowedPathPrefixes.some((prefix) => {
    const allowed = prefix.replaceAll("\\", "/");
    if (allowed.endsWith("/")) {
      return (
        normalized === allowed.slice(0, -1) || normalized.startsWith(allowed)
      );
    }
    return normalized === allowed || normalized.startsWith(`${allowed}/`);
  });
}

export function toPosixRelative(
  repositoryRoot: string,
  absoluteOrRelative: string,
): string {
  const absolute = path.isAbsolute(absoluteOrRelative)
    ? absoluteOrRelative
    : path.join(repositoryRoot, absoluteOrRelative);
  return path.relative(repositoryRoot, absolute).replaceAll("\\", "/");
}

export function extractPredecessorHashFromDocument(
  content: string,
): string | null {
  const match = content.match(
    /Predecessor baseline[^|\n]*\|\s*`?[^`|\n]*@\s*`?([0-9a-f]{7,64})`?/i,
  );
  if (match?.[1]) {
    return match[1];
  }

  const alt = content.match(/predecessor[^`\n]*`([0-9a-f]{7,64})`/i);
  return alt?.[1] ?? null;
}

export function hashesMatch(left: string, right: string): boolean {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || !b) {
    return false;
  }
  return a === b || a.startsWith(b) || b.startsWith(a);
}
