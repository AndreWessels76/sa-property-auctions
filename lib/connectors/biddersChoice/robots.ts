import { LoggerService } from "@/lib/logger";

export type RobotsDecision = {
  allowed: boolean;
  robotsUrl: string;
  reason: string;
  fetchedAt: string;
};

/**
 * Respect robots.txt before any public fetch.
 * Bidders Choice currently publishes empty Disallow for * (audited 2026-08).
 */
export async function checkRobotsAllowed(
  origin: string,
  path = "/",
): Promise<RobotsDecision> {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  const fetchedAt = new Date().toISOString();

  try {
    const res = await fetch(robotsUrl, {
      headers: {
        "User-Agent": "SAPropertyAuctionsBot/1.0 (+https://sa-property-auctions.vercel.app)",
        Accept: "text/plain",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return {
        allowed: false,
        robotsUrl,
        reason: `robots.txt HTTP ${res.status} — fetch blocked until robots available`,
        fetchedAt,
      };
    }

    const text = await res.text();
    const allowed = isPathAllowedByRobots(text, path);

    return {
      allowed,
      robotsUrl,
      reason: allowed
        ? "robots.txt allows this path for User-agent *"
        : "robots.txt disallows this path",
      fetchedAt,
    };
  } catch (error) {
    LoggerService.warn("bidders_choice.robots_fetch_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      allowed: false,
      robotsUrl,
      reason: "robots.txt unreachable — refusing public fetch",
      fetchedAt,
    };
  }
}

export function isPathAllowedByRobots(robotsTxt: string, path: string): boolean {
  const lines = robotsTxt.split(/\r?\n/);
  let inStar = false;
  const disallows: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("user-agent:")) {
      const agent = line.slice(line.indexOf(":") + 1).trim();
      inStar = agent === "*";
      continue;
    }
    if (!inStar) continue;
    if (lower.startsWith("disallow:")) {
      disallows.push(line.slice(line.indexOf(":") + 1).trim());
    }
  }

  // Empty Disallow means allow all (standard robots semantics).
  if (disallows.length === 0 || disallows.every((d) => d === "")) {
    return true;
  }

  for (const rule of disallows) {
    if (!rule) continue;
    if (path.startsWith(rule) || rule === "/") {
      return false;
    }
  }
  return true;
}
