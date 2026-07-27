import { RuntimeConfigError } from "@/config/types";
import type { RetryFailureCategory } from "@/lib/retry/types";

const RETRY_CATEGORIES: ReadonlySet<RetryFailureCategory> = new Set([
  "timeout",
  "rate_limited",
  "transient",
  "invalid_response",
  "configuration",
  "permanent",
]);

export function readEnvString(
  env: NodeJS.ProcessEnv,
  key: string,
): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

export function readEnvBoolean(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: boolean,
): boolean {
  const raw = env[key]?.trim().toLowerCase();
  if (!raw) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(raw)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(raw)) {
    return false;
  }

  throw new RuntimeConfigError(
    `Invalid boolean for ${key}: "${env[key]}". Use true/false.`,
  );
}

export function readEnvNumber(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  options?: { min?: number; max?: number; integer?: boolean },
): number {
  const raw = env[key]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new RuntimeConfigError(
      `Invalid number for ${key}: "${env[key]}".`,
    );
  }

  const value = options?.integer ? Math.floor(parsed) : parsed;

  if (options?.min !== undefined && value < options.min) {
    throw new RuntimeConfigError(
      `${key} must be >= ${options.min} (received ${value}).`,
    );
  }

  if (options?.max !== undefined && value > options.max) {
    throw new RuntimeConfigError(
      `${key} must be <= ${options.max} (received ${value}).`,
    );
  }

  return value;
}

export function readRetryableCategories(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: readonly RetryFailureCategory[],
): readonly RetryFailureCategory[] {
  const raw = env[key]?.trim();
  if (!raw) {
    return fallback;
  }

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean) as RetryFailureCategory[];

  if (parts.length === 0) {
    throw new RuntimeConfigError(`${key} must list at least one category.`);
  }

  for (const part of parts) {
    if (!RETRY_CATEGORIES.has(part)) {
      throw new RuntimeConfigError(
        `Unknown retry category "${part}" in ${key}.`,
      );
    }
  }

  return parts;
}

export function readAdvisorIdList(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: readonly string[],
): readonly string[] {
  const raw = env[key]?.trim();
  if (!raw) {
    return fallback;
  }

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new RuntimeConfigError(`${key} must list at least one advisor id.`);
  }

  return parts;
}
