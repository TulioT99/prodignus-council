import { loadRuntimeConfig } from "@/config/load";
import type { RuntimeCouncilConfig } from "@/config/types";

let cachedConfig: RuntimeCouncilConfig | undefined;

/**
 * Returns the process-wide immutable runtime configuration.
 * Loaded once on first access; restart required to pick up env changes.
 */
export function getRuntimeConfig(): RuntimeCouncilConfig {
  if (!cachedConfig) {
    cachedConfig = loadRuntimeConfig();
  }

  return cachedConfig;
}

/** Test helper — resets the singleton so a subsequent load uses fresh env. */
export function resetRuntimeConfigForTests(): void {
  cachedConfig = undefined;
}

/** Test helper — inject a pre-built config (still treated as immutable). */
export function setRuntimeConfigForTests(config: RuntimeCouncilConfig): void {
  cachedConfig = config;
}
