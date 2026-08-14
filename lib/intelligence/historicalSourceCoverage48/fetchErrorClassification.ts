/**
 * HSA 4.9 — deterministic fetch error classification.
 * Never collapse distinct failures into generic HTTP_ERROR.
 */

export type FetchErrorCode =
  | "DNS_ERROR"
  | "TLS_ERROR"
  | "CONNECTION_ERROR"
  | "TIMEOUT"
  | "HTTP_400"
  | "HTTP_401"
  | "HTTP_403"
  | "HTTP_404"
  | "HTTP_408"
  | "HTTP_429"
  | "HTTP_500"
  | "HTTP_502"
  | "HTTP_503"
  | "HTTP_504"
  | "HTTP_OTHER"
  | "EMPTY_RESPONSE"
  | "SOURCE_CHANGED"
  | "CONTENT_UNAVAILABLE"
  | "REDIRECT_LOOP"
  | "AUTH_REQUIRED"
  | "FETCH_CONFIGURATION_ERROR"
  | "INVALID_SOURCE_URL"
  | "CONNECTIVITY_UNAVAILABLE"
  | "NONE";

export type ClassifiedFetchFailure = {
  errorCode: FetchErrorCode;
  httpStatus: number | null;
  retryable: boolean;
  diagnosticMessage: string;
  category: "NETWORK" | "HTTP" | "SOURCE" | "PLATFORM" | "NONE";
};

function redact(text: string | null | undefined): string | null {
  if (!text) return null;
  return text
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/api[_-]?key[=:]\s*\S+/gi, "api_key=[REDACTED]")
    .slice(0, 400);
}

const RETRYABLE_CODES: FetchErrorCode[] = [
  "TIMEOUT",
  "DNS_ERROR",
  "TLS_ERROR",
  "CONNECTION_ERROR",
  "HTTP_408",
  "HTTP_429",
  "HTTP_500",
  "HTTP_502",
  "HTTP_503",
  "HTTP_504",
];

const NON_RETRYABLE_CODES: FetchErrorCode[] = [
  "HTTP_400",
  "HTTP_401",
  "HTTP_403",
  "HTTP_404",
  "AUTH_REQUIRED",
  "INVALID_SOURCE_URL",
  "REDIRECT_LOOP",
];

export function isRetryableErrorCode(code: FetchErrorCode): boolean {
  if (code === "NONE") return false;
  if (NON_RETRYABLE_CODES.includes(code)) return false;
  return RETRYABLE_CODES.includes(code);
}

export function classifyFetchFailure(input: {
  error?: string | null;
  httpStatus?: number | null;
  enrichmentStatus?: string | null;
  refetchStatus?: string | null;
  contentLength?: number | null;
  sourceUrl?: string | null;
}): ClassifiedFetchFailure {
  const err = (input.error ?? "").toLowerCase();
  const http = input.httpStatus ?? null;

  if (http != null && http >= 200 && http < 300 && !err) {
    return {
      errorCode: "NONE",
      httpStatus: http,
      retryable: false,
      diagnosticMessage: "Fetch succeeded",
      category: "NONE",
    };
  }

  if (err.includes("tls") || err.includes("certificate") || err.includes("unable to verify")) {
    return {
      errorCode: "TLS_ERROR",
      httpStatus: http,
      retryable: true,
      diagnosticMessage: redact(input.error) ?? "TLS/certificate error",
      category: "NETWORK",
    };
  }
  if (err.includes("enotfound") || err.includes("getaddrinfo") || err.includes("dns")) {
    return {
      errorCode: "DNS_ERROR",
      httpStatus: http,
      retryable: true,
      diagnosticMessage: redact(input.error) ?? "DNS resolution failed",
      category: "NETWORK",
    };
  }
  if (err.includes("timeout") || err.includes("etimedout") || err.includes("aborted")) {
    return {
      errorCode: "TIMEOUT",
      httpStatus: http,
      retryable: true,
      diagnosticMessage: redact(input.error) ?? "Fetch timed out",
      category: "NETWORK",
    };
  }
  if (err.includes("redirect") && err.includes("loop")) {
    return {
      errorCode: "REDIRECT_LOOP",
      httpStatus: http,
      retryable: false,
      diagnosticMessage: redact(input.error) ?? "Redirect loop detected",
      category: "SOURCE",
    };
  }
  if (err.includes("login") || err.includes("auth") || err.includes("unauthorized")) {
    return {
      errorCode: "AUTH_REQUIRED",
      httpStatus: http ?? 401,
      retryable: false,
      diagnosticMessage: "Authentication required — source may require login",
      category: "SOURCE",
    };
  }
  if (err.includes("connectivity") || err.includes("fetch failed")) {
    return {
      errorCode: "CONNECTION_ERROR",
      httpStatus: http,
      retryable: true,
      diagnosticMessage: redact(input.error) ?? "Network connection failed",
      category: "NETWORK",
    };
  }
  if (err.includes("source changed") || err.includes("content hash changed")) {
    return {
      errorCode: "SOURCE_CHANGED",
      httpStatus: http,
      retryable: false,
      diagnosticMessage: "Source content changed substantially",
      category: "SOURCE",
    };
  }

  if (http != null && http >= 400) {
    const map: Record<number, FetchErrorCode> = {
      400: "HTTP_400",
      401: "HTTP_401",
      403: "HTTP_403",
      404: "HTTP_404",
      408: "HTTP_408",
      429: "HTTP_429",
      500: "HTTP_500",
      502: "HTTP_502",
      503: "HTTP_503",
      504: "HTTP_504",
    };
    const code = map[http] ?? "HTTP_OTHER";
    return {
      errorCode: code,
      httpStatus: http,
      retryable: isRetryableErrorCode(code),
      diagnosticMessage: `HTTP ${http} response from source`,
      category: "HTTP",
    };
  }

  if (
    input.contentLength === 0 ||
    err.includes("empty") ||
    err.includes("no content")
  ) {
    return {
      errorCode: "EMPTY_RESPONSE",
      httpStatus: http,
      retryable: false,
      diagnosticMessage: "Empty response body received",
      category: "SOURCE",
    };
  }

  if (!input.sourceUrl?.trim()) {
    return {
      errorCode: "INVALID_SOURCE_URL",
      httpStatus: null,
      retryable: false,
      diagnosticMessage: "No source URL configured for fetch",
      category: "PLATFORM",
    };
  }

  if (
    input.enrichmentStatus === "FAILED" ||
    input.refetchStatus === "failed" ||
    input.enrichmentStatus === "SOURCE_UNAVAILABLE"
  ) {
    return {
      errorCode: "CONTENT_UNAVAILABLE",
      httpStatus: http,
      retryable: false,
      diagnosticMessage: redact(input.error) ?? "Source content unavailable",
      category: "SOURCE",
    };
  }

  return {
    errorCode: "NONE",
    httpStatus: http,
    retryable: false,
    diagnosticMessage: "No fetch failure detected",
    category: "NONE",
  };
}

export function failureBreakdown(
  failures: ClassifiedFetchFailure[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of failures) {
    if (f.errorCode === "NONE") continue;
    counts[f.errorCode] = (counts[f.errorCode] ?? 0) + 1;
  }
  return counts;
}
