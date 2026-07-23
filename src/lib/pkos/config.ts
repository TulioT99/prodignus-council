import "server-only";

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import type { PKOSRetrievalConfig } from "@/types/pkos";

const DEFAULT_MAX_SOURCES = 5;
const DEFAULT_MAX_EXCERPT_CHARS = 2000;

export class PKOSConfigurationError extends Error {
  readonly code = "PKOS_CONFIGURATION_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "PKOSConfigurationError";
  }
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  envName: string,
): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number.parseInt(value.trim(), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new PKOSConfigurationError(
      `${envName} must be a positive integer when provided.`,
    );
  }

  return parsed;
}

export function resolvePKOSRetrievalConfig(
  env: NodeJS.ProcessEnv = process.env,
): PKOSRetrievalConfig | null {
  const rawPath = env.PKOS_REPOSITORY_PATH?.trim();

  if (!rawPath) {
    return null;
  }

  const repositoryPath = resolve(rawPath);

  if (!existsSync(repositoryPath)) {
    throw new PKOSConfigurationError(
      "PKOS_REPOSITORY_PATH does not point to an existing directory.",
    );
  }

  if (!statSync(repositoryPath).isDirectory()) {
    throw new PKOSConfigurationError(
      "PKOS_REPOSITORY_PATH must reference a directory.",
    );
  }

  return Object.freeze({
    repositoryPath,
    maxSources: parsePositiveInteger(
      env.PKOS_MAX_EVIDENCE_SOURCES,
      DEFAULT_MAX_SOURCES,
      "PKOS_MAX_EVIDENCE_SOURCES",
    ),
    maxExcerptChars: parsePositiveInteger(
      env.PKOS_MAX_EXCERPT_CHARS,
      DEFAULT_MAX_EXCERPT_CHARS,
      "PKOS_MAX_EXCERPT_CHARS",
    ),
  });
}
