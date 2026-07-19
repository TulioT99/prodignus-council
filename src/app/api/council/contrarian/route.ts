import { NextResponse } from "next/server";

import {
  buildContrarianSystemPrompt,
  buildContrarianUserPrompt,
} from "@/lib/council/contrarian-prompt";
import { ModelOutputParseError, parseAdvisorResponseContent } from "@/lib/council/response-parser";
import {
  DecisionValidationError,
  validateContrarianRequestBody,
} from "@/lib/council/validation";
import { createChatCompletion } from "@/lib/openrouter/client";
import { OpenRouterClientError } from "@/lib/openrouter/types";
import { getAdvisorPersonaById } from "@/data/advisor-personas";
import type {
  AdvisorResult,
  ContrarianApiFailure,
  ContrarianApiSuccess,
} from "@/types/council";

function failureResponse(
  status: number,
  body: ContrarianApiFailure,
): NextResponse<ContrarianApiFailure> {
  return NextResponse.json(body, { status });
}

function mapContentToAdvisorResult(
  content: ReturnType<typeof parseAdvisorResponseContent>,
  model: string,
  durationMs: number,
  totalTokens: number,
): AdvisorResult {
  const persona = getAdvisorPersonaById("ADV-001");

  return {
    persona: {
      ...persona,
      model,
    },
    source: "live",
    status: "success",
    summary: content.summary,
    analysis: content.analysis,
    assumptions: content.assumptions,
    risks: content.risks,
    recommendation: content.recommendation,
    confidence: content.confidence / 100,
    durationMs,
    totalTokens,
  };
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
    ({ decision } = validateContrarianRequestBody(body));
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
    const completion = await createChatCompletion(
      buildContrarianSystemPrompt(),
      buildContrarianUserPrompt(decision),
    );

    const content = parseAdvisorResponseContent(completion.content);
    const advisor = mapContentToAdvisorResult(
      content,
      completion.model,
      completion.durationMs,
      completion.totalTokens,
    );

    const success: ContrarianApiSuccess = {
      ok: true,
      advisor,
    };

    return NextResponse.json(success);
  } catch (error) {
    if (error instanceof OpenRouterClientError) {
      const statusByCode: Record<
        OpenRouterClientError["code"],
        number
      > = {
        CONFIGURATION_ERROR: 500,
        PROVIDER_TIMEOUT: 504,
        PROVIDER_ERROR: 502,
        INVALID_PROVIDER_RESPONSE: 502,
      };

      return failureResponse(statusByCode[error.code], {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
        },
      });
    }

    if (error instanceof ModelOutputParseError) {
      return failureResponse(502, {
        ok: false,
        error: {
          code: "INVALID_MODEL_OUTPUT",
          message: "The Contrarian response could not be validated.",
          retryable: true,
        },
      });
    }

    return failureResponse(500, {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while consulting The Contrarian.",
        retryable: true,
      },
    });
  }
}
