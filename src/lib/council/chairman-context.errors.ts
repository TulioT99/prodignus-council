import "server-only";

export type ChairmanContextBuildErrorCode =
  | "INVALID_BUILD_INPUT"
  | "MISSING_DECISION_CONTEXT"
  | "MISSING_QUESTION"
  | "MISSING_ADVISORS"
  | "MISSING_ADVISOR_ID";

export class ChairmanContextBuildError extends Error {
  readonly code: ChairmanContextBuildErrorCode;
  readonly safeMessage: string;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: ChairmanContextBuildErrorCode,
    safeMessage: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(safeMessage);
    this.name = "ChairmanContextBuildError";
    this.code = code;
    this.safeMessage = safeMessage;
    this.details = details;
  }
}
