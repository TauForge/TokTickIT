import { Request, Response, NextFunction } from "express";

export interface FieldError {
  field: string;
  message: string;
}

export class HttpError extends Error {
  status: number;
  code: string;
  fieldErrors: FieldError[];
  extra: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: FieldError[] = [],
    extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.extra = extra;
  }
}

export function errorEnvelope(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, fieldErrors: err.fieldErrors, ...err.extra },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", fieldErrors: [] },
  });
}
