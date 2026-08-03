import { checkRobotsAllowed } from "@/lib/connectors/biddersChoice/robots";
import {
  extractBiddersChoiceListing,
  mapLicensedPayload,
} from "@/lib/connectors/biddersChoice/extractListing";
import type {
  ExtractedListing,
  RawListingCandidate,
} from "@/lib/acquisition/types";
import { LoggerService } from "@/lib/logger";
import { getConnector } from "@/lib/connectors/sourceRegistry";

export const BIDDERS_CHOICE_CONNECTOR_ID = "bidders_choice";
export const BIDDERS_CHOICE_ORIGIN = "https://www.bidderschoice.co.za";

const USER_AGENT =
  "SAPropertyAuctionsBot/1.0 (+https://sa-property-auctions.vercel.app; verified-listings)";

/**
 * Production reference connector for Bidders Choice.
 * Public HTTP fetch only after robots.txt allow.
 * Preferred production path: licensed_feed / csv / manual payloads.
 */
export class BiddersChoiceConnector {
  readonly id = BIDDERS_CHOICE_CONNECTOR_ID;
  readonly name = "Bidders Choice";
  readonly version: string;

  constructor() {
    this.version = getConnector(BIDDERS_CHOICE_CONNECTOR_ID)?.connectorVersion ?? "2.0.0";
  }

  async assertRobots(path = "/"): Promise<void> {
    const decision = await checkRobotsAllowed(BIDDERS_CHOICE_ORIGIN, path);
    LoggerService.audit("bidders_choice.robots", decision);
    if (!decision.allowed) {
      throw new Error(`Robots policy blocked fetch: ${decision.reason}`);
    }
  }

  /**
   * Discover candidate listing URLs from sitemap(s).
   * Returns empty list (with log) when sitemaps are unavailable — never fabricates URLs.
   */
  async discover(max = 50): Promise<RawListingCandidate[]> {
    await this.assertRobots("/");

    const sitemapCandidates = [
      `${BIDDERS_CHOICE_ORIGIN}/sitemap_index.xml`,
      `${BIDDERS_CHOICE_ORIGIN}/sitemap.xml`,
      "https://bidderschoice.co.za/sitemap_index.xml",
      "https://bidderschoice.co.za/sitemap.xml",
    ];

    const locs = new Set<string>();

    for (const sitemapUrl of sitemapCandidates) {
      try {
        const xml = await this.fetchText(sitemapUrl);
        if (!xml) continue;
        const nested = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(
          (m) => m[1].trim(),
        );
        for (const loc of nested) {
          if (loc.endsWith(".xml")) {
            const child = await this.fetchText(loc);
            if (!child) continue;
            for (const m of child.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
              locs.add(m[1].trim());
            }
          } else {
            locs.add(loc);
          }
        }
        if (locs.size > 0) break;
      } catch (error) {
        LoggerService.warn("bidders_choice.sitemap_failed", {
          sitemapUrl,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    const listingUrls = [...locs]
      .filter((u) => this.looksLikeListingUrl(u))
      .slice(0, max);

    LoggerService.audit("bidders_choice.discover", {
      found: listingUrls.length,
      scanned: locs.size,
    });

    const now = new Date().toISOString();
    return listingUrls.map((sourceUrl) => ({
      sourceUrl,
      discoveredAt: now,
    }));
  }

  looksLikeListingUrl(url: string): boolean {
    try {
      const u = new URL(url);
      if (!u.hostname.includes("bidderschoice.co.za")) return false;
      const path = u.pathname.toLowerCase();
      if (path === "/" || path.includes("sitemap")) return false;
      // Property-ish paths — conservative; operator may still pass explicit URLs.
      return (
        /property|auction|listing|lot|estate|house|apartment|sale/i.test(path) ||
        path.split("/").filter(Boolean).length >= 2
      );
    } catch {
      return false;
    }
  }

  async downloadListing(url: string): Promise<{ html: string; broken: boolean }> {
    await this.assertRobots(new URL(url).pathname);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(25_000),
        redirect: "follow",
      });
      if (!res.ok) {
        return { html: "", broken: true };
      }
      const html = await res.text();
      return { html, broken: html.length < 200 };
    } catch (error) {
      LoggerService.warn("bidders_choice.download_failed", {
        url,
        error: error instanceof Error ? error.message : "unknown",
      });
      return { html: "", broken: true };
    }
  }

  extract(html: string, sourceUrl: string): ExtractedListing {
    return extractBiddersChoiceListing(html, sourceUrl);
  }

  fromLicensedRows(rows: Record<string, unknown>[]): ExtractedListing[] {
    const out: ExtractedListing[] = [];
    for (const row of rows) {
      const mapped = mapLicensedPayload(row);
      if (mapped) out.push(mapped);
    }
    return out;
  }

  async fetchText(url: string): Promise<string | null> {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml,text/xml,*/*" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return res.text();
  }
}
