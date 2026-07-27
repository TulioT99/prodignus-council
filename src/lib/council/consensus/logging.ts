import "server-only";

import { getRuntimeConfig } from "@/config/runtime";

export function logConsensusEvent(
  event: string,
  fields: Readonly<Record<string, unknown>>,
): void {
  const runtime = getRuntimeConfig();
  if (!runtime.features.enableStructuredLogging) {
    return;
  }

  console.info(
    `[Council Consensus] ${JSON.stringify({
      event,
      ...fields,
    })}`,
  );
}
