import "server-only";

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { IGNORED_DIRECTORY_NAMES } from "@/lib/pkos/constants";

export function discoverMarkdownArtifacts(repositoryPath: string): string[] {
  const discovered: string[] = [];

  function walk(currentPath: string): void {
    let entries;

    try {
      entries = readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
          continue;
        }

        walk(entryPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
        continue;
      }

      discovered.push(entryPath);
    }
  }

  walk(repositoryPath);

  return discovered.sort((left, right) => left.localeCompare(right));
}

export function readArtifactFile(
  repositoryPath: string,
  absolutePath: string,
): string {
  return readFileSync(absolutePath, "utf8");
}

export function toRepositoryRelativePath(
  repositoryPath: string,
  absolutePath: string,
): string {
  return relative(repositoryPath, absolutePath).replace(/\\/g, "/");
}

export function isReadableFile(absolutePath: string): boolean {
  try {
    return statSync(absolutePath).isFile();
  } catch {
    return false;
  }
}
