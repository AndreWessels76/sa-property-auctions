/**
 * HSA 4.9 — snapshot content validation.
 * Successful HTTP ≠ valid auction evidence page.
 */

export type SnapshotValidationResult = {
  valid: boolean;
  reason: string;
  flags: string[];
};

const LOGIN_PATTERNS = [
  /sign\s+in/i,
  /log\s+in/i,
  /password/i,
  /authentication required/i,
];

const ERROR_PAGE_PATTERNS = [
  /page not found/i,
  /404\s+not found/i,
  /error occurred/i,
  /something went wrong/i,
  /access denied/i,
];

const CAPTCHA_PATTERNS = [/captcha/i, /recaptcha/i, /hcaptcha/i];

export function validateSnapshotContent(input: {
  contentLength?: number | null;
  contentType?: string | null;
  httpStatus?: number | null;
  bodySnippet?: string | null;
  sourceUrl?: string | null;
  finalUrl?: string | null;
}): SnapshotValidationResult {
  const flags: string[] = [];

  if (input.httpStatus != null && input.httpStatus >= 400) {
    return {
      valid: false,
      reason: `HTTP ${input.httpStatus} — not a valid snapshot`,
      flags: ["HTTP_ERROR"],
    };
  }

  if (input.contentLength != null && input.contentLength === 0) {
    return { valid: false, reason: "Empty response body", flags: ["EMPTY_RESPONSE"] };
  }

  const ct = (input.contentType ?? "").toLowerCase();
  if (ct && !ct.includes("html") && !ct.includes("text") && !ct.includes("json")) {
    flags.push("UNEXPECTED_CONTENT_TYPE");
  }

  const body = (input.bodySnippet ?? "").slice(0, 8000);
  if (body) {
    for (const p of LOGIN_PATTERNS) {
      if (p.test(body)) {
        flags.push("LOGIN_PAGE");
        return { valid: false, reason: "Login page detected", flags };
      }
    }
    for (const p of CAPTCHA_PATTERNS) {
      if (p.test(body)) {
        flags.push("CAPTCHA_PAGE");
        return { valid: false, reason: "CAPTCHA page detected", flags };
      }
    }
    for (const p of ERROR_PAGE_PATTERNS) {
      if (p.test(body)) {
        flags.push("ERROR_PAGE");
        return { valid: false, reason: "Generic error page detected", flags };
      }
    }
  }

  if (
    input.sourceUrl &&
    input.finalUrl &&
    input.sourceUrl !== input.finalUrl
  ) {
    try {
      const src = new URL(input.sourceUrl);
      const fin = new URL(input.finalUrl);
      if (src.hostname !== fin.hostname) {
        flags.push("CROSS_DOMAIN_REDIRECT");
        return {
          valid: false,
          reason: `Redirected to different domain: ${fin.hostname}`,
          flags,
        };
      }
    } catch {
      /* ignore invalid URLs */
    }
  }

  if (flags.length > 0) {
    return { valid: false, reason: flags.join(", "), flags };
  }

  return { valid: true, reason: "Content appears valid for extraction", flags: [] };
}
