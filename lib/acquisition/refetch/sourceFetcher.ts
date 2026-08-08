import {
  contentTypeAllowed,
  hostAllowed,
} from "./fetchPolicy";
import type { FetchPolicy } from "./types";

export type HttpFetchResult = {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string | null;
  body: string | null;
  bytes: number;
  error: string | null;
  retried: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

/**
 * Controlled HTTP fetch — approved hosts only, size-capped, retry with backoff.
 */
export async function fetchSourcePage(input: {
  url: string;
  policy: FetchPolicy;
}): Promise<HttpFetchResult> {
  const { url, policy } = input;

  if (!hostAllowed(url, policy)) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      contentType: null,
      body: null,
      bytes: 0,
      error: "Host not in allowed fetch policy",
      retried: 0,
    };
  }

  let retried = 0;
  let lastStatus = 0;
  let lastError: string | null = null;

  while (retried <= policy.maxRetries) {
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": policy.userAgent,
          Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
        },
        signal: AbortSignal.timeout(policy.timeoutMs),
      });

      lastStatus = res.status;

      if (res.status === 304) {
        return {
          ok: true,
          status: 304,
          finalUrl: res.url || url,
          contentType: res.headers.get("content-type"),
          body: null,
          bytes: 0,
          error: null,
          retried,
        };
      }

      if (shouldRetry(res.status) && retried < policy.maxRetries) {
        retried += 1;
        await sleep(policy.backoffMs * Math.pow(2, retried - 1));
        continue;
      }

      if (res.status === 404 || res.status === 403 || res.status === 410) {
        return {
          ok: false,
          status: res.status,
          finalUrl: res.url || url,
          contentType: res.headers.get("content-type"),
          body: null,
          bytes: 0,
          error: `HTTP ${res.status}`,
          retried,
        };
      }

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          finalUrl: res.url || url,
          contentType: res.headers.get("content-type"),
          body: null,
          bytes: 0,
          error: `HTTP ${res.status}`,
          retried,
        };
      }

      const contentType = res.headers.get("content-type");
      if (!contentTypeAllowed(contentType, policy)) {
        return {
          ok: false,
          status: res.status,
          finalUrl: res.url || url,
          contentType,
          body: null,
          bytes: 0,
          error: `Disallowed content type: ${contentType ?? "unknown"}`,
          retried,
        };
      }

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > policy.maxResponseBytes) {
        return {
          ok: false,
          status: res.status,
          finalUrl: res.url || url,
          contentType,
          body: null,
          bytes: buf.byteLength,
          error: "Response exceeds maxResponseBytes",
          retried,
        };
      }

      return {
        ok: true,
        status: res.status,
        finalUrl: res.url || url,
        contentType,
        body: buf.toString("utf8"),
        bytes: buf.byteLength,
        error: null,
        retried,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Fetch failed";
      if (retried < policy.maxRetries) {
        retried += 1;
        await sleep(policy.backoffMs * Math.pow(2, retried - 1));
        continue;
      }
      return {
        ok: false,
        status: lastStatus || 0,
        finalUrl: url,
        contentType: null,
        body: null,
        bytes: 0,
        error: lastError,
        retried,
      };
    }
  }

  return {
    ok: false,
    status: lastStatus,
    finalUrl: url,
    contentType: null,
    body: null,
    bytes: 0,
    error: lastError ?? "Fetch failed",
    retried,
  };
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function extractHtmlTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m?.[1]) return null;
  return m[1].replace(/\s+/g, " ").trim().slice(0, 300) || null;
}
