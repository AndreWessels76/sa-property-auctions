import { NextResponse } from "next/server";
import { formatErrorMessage } from "@/lib/errors/formatError";
import { LoggerService } from "@/lib/logger";

export class ApiError extends Error {
  readonly status: number;
  readonly publicMessage: string;

  constructor(status: number, publicMessage: string, internalMessage?: string) {
    super(internalMessage ?? publicMessage);
    this.name = "ApiError";
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

const AUTH_MESSAGES = new Set([
  "Authentication required",
  "Admin access required",
  "Premium subscription required",
]);

export function statusFromError(error: unknown): number {
  if (error instanceof ApiError) {
    return error.status;
  }

  if (error instanceof Error && AUTH_MESSAGES.has(error.message)) {
    if (error.message === "Authentication required") return 401;
    if (error.message === "Admin access required") return 403;
    if (error.message === "Premium subscription required") return 403;
  }

  return 500;
}

export function publicMessageFromError(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (error instanceof ApiError) {
    return error.publicMessage;
  }

  if (error instanceof Error && AUTH_MESSAGES.has(error.message)) {
    return error.message;
  }

  // Never forward arbitrary DB/config messages in production.
  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export function jsonError(
  error: unknown,
  fallback: string,
  context?: Record<string, unknown>,
) {
  const status = statusFromError(error);
  const message = publicMessageFromError(error, fallback);

  if (status >= 500) {
    LoggerService.error(fallback, {
      ...context,
      error: formatErrorMessage(error, fallback),
    });
  } else {
    LoggerService.warn(fallback, {
      ...context,
      error: formatErrorMessage(error, fallback),
      status,
    });
  }

  return NextResponse.json({ error: message }, { status });
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
