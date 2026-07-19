import { NextResponse } from "next/server";

import { runCouncil } from "@/lib/council/orchestrator";
import {
  DecisionValidationError,
  validateCouncilRequestBody,
} from "@/lib/council/validation";
import type { CouncilApiFailure, CouncilApiSuccess } from "@/types/council";

function failureResponse(
  status: number,
  body: CouncilApiFailure,
): NextResponse<CouncilApiFailure> {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return failureResponse(400, {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message: "Request body must be valid JSON.",
        retryable: false,
      },
    });
  }

  let decision;

  try {
    ({ decision } = validateCouncilRequestBody(body));
  } catch (error) {
    const message =
      error instanceof DecisionValidationError
        ? error.message
        : "The request payload is invalid.";

    return failureResponse(400, {
      ok: false,
      error: {
        code: "INVALID_REQUEST",
        message,
        retryable: false,
      },
    });
  }

  try {
    const result = await runCouncil(decision);

    const success: CouncilApiSuccess = {
      ok: true,
      result,
    };

    return NextResponse.json(success);
  } catch {
    return failureResponse(500, {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while running the Council.",
        retryable: true,
      },
    });
  }
}
