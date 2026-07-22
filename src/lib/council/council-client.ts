import type { CouncilApiResponse, CouncilResult, Decision } from "@/types/council";

export class CouncilClientError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = "CouncilClientError";
    this.retryable = retryable;
  }
}

export async function fetchCouncilResult(decision: Decision): Promise<CouncilResult> {
  let response: Response;

  try {
    response = await fetch("/api/council", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ decision }),
    });
  } catch {
    throw new CouncilClientError(
      "The Council service could not be reached. Check your connection and try again.",
      true,
    );
  }

  const responseText = await response.text();
  let payload: CouncilApiResponse;

  try {
    payload = JSON.parse(responseText) as CouncilApiResponse;
  } catch {
    throw new CouncilClientError(
      "The Council service returned an unreadable response. Please try again.",
      true,
    );
  }

  if (!payload || typeof payload !== "object" || !("ok" in payload)) {
    throw new CouncilClientError(
      "The Council service returned an unexpected response. Please try again.",
      true,
    );
  }

  if (!payload.ok) {
    throw new CouncilClientError(payload.error.message, payload.error.retryable);
  }

  if (!Array.isArray(payload.result.advisors) || payload.result.advisors.length === 0) {
    throw new CouncilClientError(
      "The Council service returned an incomplete result. Please try again.",
      true,
    );
  }

  return payload.result;
}
