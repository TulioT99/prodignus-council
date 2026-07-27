import "server-only";

/**
 * Abort reason markers for distinguishing provider timeout from parent cancellation.
 * Used only at the execution/reliability boundary (WP-03).
 */
export const ABORT_REASON_TIMEOUT = "provider_timeout" as const;
export const ABORT_REASON_CANCELLED = "execution_cancelled" as const;

export type ExecutionAbortReason =
  | typeof ABORT_REASON_TIMEOUT
  | typeof ABORT_REASON_CANCELLED;

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  return false;
}

export function getAbortReason(signal: AbortSignal | undefined): unknown {
  return signal?.reason;
}

export function isCancellationReason(reason: unknown): boolean {
  return reason === ABORT_REASON_CANCELLED;
}

export function isTimeoutReason(reason: unknown): boolean {
  return reason === ABORT_REASON_TIMEOUT;
}

/**
 * Combine optional abort signals into one. Caller must invoke cleanup().
 */
export function combineAbortSignals(
  ...signals: readonly (AbortSignal | undefined)[]
): { signal: AbortSignal; cleanup: () => void } {
  const active = signals.filter((signal): signal is AbortSignal => signal != null);

  if (active.length === 0) {
    const controller = new AbortController();
    return { signal: controller.signal, cleanup: () => undefined };
  }

  if (active.length === 1) {
    return { signal: active[0], cleanup: () => undefined };
  }

  if (typeof AbortSignal.any === "function") {
    return { signal: AbortSignal.any(active), cleanup: () => undefined };
  }

  const controller = new AbortController();
  const onAbort = (): void => {
    if (!controller.signal.aborted) {
      const aborted = active.find((signal) => signal.aborted);
      controller.abort(aborted?.reason);
    }
  };

  for (const signal of active) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return { signal: controller.signal, cleanup: () => undefined };
    }

    signal.addEventListener("abort", onAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const signal of active) {
        signal.removeEventListener("abort", onAbort);
      }
    },
  };
}

/**
 * Deadline controller that aborts with ABORT_REASON_TIMEOUT after timeoutMs.
 * timeoutMs <= 0 disables the timer (signal never auto-aborts).
 */
export function createDeadlineController(timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return { signal: controller.signal, cleanup: () => undefined };
  }

  const timeoutId = setTimeout(() => {
    controller.abort(ABORT_REASON_TIMEOUT);
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
    },
  };
}
