export const FAILURE_CODES = [
  "TB_SCHEMA_UNSUPPORTED",
  "TB_RULES_MISMATCH",
  "TB_CONTENT_MISMATCH",
  "TB_ACTION_ID_CONFLICT",
  "TB_ACTION_SEQUENCE",
  "TB_STATE_REVISION",
  "TB_ACTION_NOT_ALLOWED",
  "TB_CAPACITY_EXCEEDED",
  "TB_PREVIEW_STALE",
  "TB_TICK_RANGE",
  "TB_NUMERIC_RANGE",
  "TB_REPLAY_DIVERGED",
  "TB_DIGEST_MISMATCH",
  "TB_SAVE_CORRUPT",
  "TB_IMPORT_REJECTED",
  "TB_SETTLEMENT_INCOMPLETE",
  "TB_AUTHORITY_UNVERIFIED"
] as const;

export type FailureCode = (typeof FAILURE_CODES)[number];

export interface DomainError {
  readonly code: FailureCode;
  readonly message: string;
  readonly recovery: string;
}

export class DomainFault extends Error {
  readonly code: FailureCode;
  readonly recovery: string;

  constructor(code: FailureCode, message: string, recovery: string) {
    super(message);
    this.name = "DomainFault";
    this.code = code;
    this.recovery = recovery;
  }

  toDomainError(): DomainError {
    return {
      code: this.code,
      message: this.message,
      recovery: this.recovery
    };
  }
}

export function fault(
  code: FailureCode,
  message: string,
  recovery: string
): never {
  throw new DomainFault(code, message, recovery);
}

export function asDomainError(error: unknown): DomainError {
  if (error instanceof DomainFault) {
    return error.toDomainError();
  }

  return {
    code: "TB_ACTION_NOT_ALLOWED",
    message: "The service could not apply that action.",
    recovery: "Review the current service state and try a valid action."
  };
}
