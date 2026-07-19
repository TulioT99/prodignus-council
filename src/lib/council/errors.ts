import "server-only";

export type CouncilErrorCode =
  | "INVALID_REQUEST"
  | "CONFIGURATION_ERROR"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE"
  | "INVALID_MODEL_OUTPUT"
  | "INTERNAL_ERROR";

export class CouncilConfigurationError extends Error {
  readonly code: CouncilErrorCode = "CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "CouncilConfigurationError";
  }
}

export class AdvisorExecutionError extends Error {
  readonly code: CouncilErrorCode;
  readonly retryable: boolean;
  readonly safeMessage: string;

  constructor(
    code: Exclude<
      CouncilErrorCode,
      "INVALID_REQUEST" | "INTERNAL_ERROR" | "CONFIGURATION_ERROR"
    >,
    safeMessage: string,
    retryable: boolean,
  ) {
    super(safeMessage);
    this.name = "AdvisorExecutionError";
    this.code = code;
    this.retryable = retryable;
    this.safeMessage = safeMessage;
  }
}

export class ProviderTimeoutError extends AdvisorExecutionError {
  constructor(message = "The model provider did not respond within the allowed time.") {
    super("PROVIDER_TIMEOUT", message, true);
    this.name = "ProviderTimeoutError";
  }
}

export class InvalidModelOutputError extends Error {
  readonly code: CouncilErrorCode = "INVALID_MODEL_OUTPUT";
  readonly safeMessage: string;

  constructor(message: string) {
    super(message);
    this.name = "InvalidModelOutputError";
    this.safeMessage = "The advisor response could not be validated.";
  }
}

export function toAdvisorSafeMessage(error: unknown): string {
  if (error instanceof CouncilConfigurationError) {
    return "The advisor model is not configured on the server.";
  }

  if (error instanceof AdvisorExecutionError) {
    return error.safeMessage;
  }

  if (error instanceof InvalidModelOutputError) {
    return error.safeMessage;
  }

  return "The advisor could not complete this review.";
}
