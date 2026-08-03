import { unstable_cache } from "next/cache";
import { PropertyRepository } from "@/lib/repositories";
import type { Property } from "@/lib/types/property";
import { LoggerService } from "@/lib/logger";
import {
  buildAllAgencyIntelligence,
  buildAllAreaIntelligence,
  buildHeatMapFoundationDatasets,
  buildHistoricalIntelligence,
  buildMapFoundationDataset,
  buildMarketIntelligence,
  enrichVerifiedListing,
  type AgencyIntelligenceProfile,
  type AreaIntelligenceProfile,
  type EnrichmentResult,
  type HeatMapFoundationDatasets,
  type HistoricalIntelligenceSummary,
  type MapFoundationDataset,
  type MarketIntelligenceReport,
} from "@/lib/platform";
import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";

export type VerifiedDataPlatformSnapshot = {
  generatedAt: string;
  corpusSize: number;
  activeCatalogueSize: number;
  areas: AreaIntelligenceProfile[];
  agencies: AgencyIntelligenceProfile[];
  market: MarketIntelligenceReport;
  historical: HistoricalIntelligenceSummary;
  maps: MapFoundationDataset;
  heatmaps: HeatMapFoundationDatasets;
};

/**
 * Verified Data Platform 2.0 — single corpus fetch, cached aggregates.
 * Does not redesign Repository → Service boundaries.
 */
export class VerifiedDataPlatformService {
  static getIntelligenceCorpus = unstable_cache(
    async (): Promise<Property[]> => {
      try {
        return await PropertyRepository.getIntelligenceCorpus(1000);
      } catch (error) {
        LoggerService.warn("verified_data_platform.corpus_failed", {
          error: error instanceof Error ? error.message : "unknown",
        });
        return [];
      }
    },
    ["verified-data-platform-corpus"],
    { revalidate: 120, tags: ["properties", "verified-data-platform"] },
  );

  static async buildSnapshot(
    corpus?: Property[],
  ): Promise<VerifiedDataPlatformSnapshot> {
    const rows = corpus ?? (await this.getIntelligenceCorpus());
    const now = new Date();
    const active = rows.filter((p) =>
      isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
        now,
      }),
    );

    return {
      generatedAt: now.toISOString(),
      corpusSize: rows.length,
      activeCatalogueSize: active.length,
      areas: buildAllAreaIntelligence(rows, now),
      agencies: buildAllAgencyIntelligence(rows, now),
      market: buildMarketIntelligence(rows, now),
      historical: buildHistoricalIntelligence(rows, now),
      maps: buildMapFoundationDataset(rows, now),
      heatmaps: buildHeatMapFoundationDatasets(rows, { now }),
    };
  }

  static getSnapshot = unstable_cache(
    async (): Promise<VerifiedDataPlatformSnapshot> => {
      return VerifiedDataPlatformService.buildSnapshot();
    },
    ["verified-data-platform-snapshot"],
    { revalidate: 120, tags: ["properties", "verified-data-platform"] },
  );

  /** Pure enrichment for a single listing — skip when hash unchanged at call site. */
  static enrichListing(property: Property): EnrichmentResult {
    return enrichVerifiedListing(property);
  }

  static async getAreaIntelligence(town: string): Promise<AreaIntelligenceProfile> {
    const rows = await this.getIntelligenceCorpus();
    const { buildAreaIntelligence } = await import("@/lib/platform/areaIntelligence");
    return buildAreaIntelligence(town, rows);
  }

  static async getAgencyIntelligence(
    agencyName: string,
  ): Promise<AgencyIntelligenceProfile> {
    const rows = await this.getIntelligenceCorpus();
    const { buildAgencyIntelligence } = await import(
      "@/lib/platform/agencyIntelligence"
    );
    return buildAgencyIntelligence(agencyName, rows);
  }
}
