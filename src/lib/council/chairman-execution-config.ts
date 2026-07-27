import "server-only";

import { getRuntimeConfig } from "@/config/runtime";

/** Default chairman model env var name (pre–WP-07). Prefer resolveChairmanModelEnvVar(). */
export const CHAIRMAN_MODEL_ENV_VAR = "OPENROUTER_MODEL_CHAIRMAN" as const;

export function resolveChairmanModelEnvVar(): string {
  return getRuntimeConfig().openRouter.modelEnvVars.chairman;
}
