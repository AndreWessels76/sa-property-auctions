import { createSupabaseClient } from "@/lib/supabase";
import {
  buildAuctionIntelligencePanel,
  buildVerifiedCatalogueStats,
  type AuctionIntelligencePanel,
  type VerifiedCatalogueStats,
} from "@/lib/property/auctionIntelligence";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { LoggerService } from "@/lib/logger";

/**
 * Auction Intelligence — verified-only aggregates + per-listing panel.
 * Single catalogue query reused across panel sections (no N+1).
 */
export class AuctionIntelligenceService {
  static async getVerifiedCatalogueStats(): Promise<VerifiedCatalogueStats> {
    try {
      const db = createSupabaseClient();
      const { data, error } = await db
        .from("properties")
        .select(
          "id,province,town,property_type,auction_agency,source_name,auction_date",
        )
        .eq("verification_state", "verified")
        .limit(500);

      if (error) {
        LoggerService.warn("auction_intelligence.catalogue_failed", {
          error: error.message,
        });
        return buildVerifiedCatalogueStats([]);
      }

      return buildVerifiedCatalogueStats(
        (data ?? []).map((row) => ({
          id: row.id as string,
          province: (row.province as string | null) ?? null,
          town: (row.town as string | null) ?? null,
          property_type: (row.property_type as string | null) ?? null,
          auction_agency: (row.auction_agency as string | null) ?? null,
          source_name: (row.source_name as string | null) ?? null,
          auction_date: (row.auction_date as string | null) ?? null,
        })),
      );
    } catch (error) {
      LoggerService.warn("auction_intelligence.catalogue_unavailable", {
        error: error instanceof Error ? error.message : "unknown",
      });
      return buildVerifiedCatalogueStats([]);
    }
  }

  static async buildPanel(input: {
    property: PropertyDTO;
    hasImages: boolean;
    comparableCount: number;
    catalogue?: VerifiedCatalogueStats;
  }): Promise<AuctionIntelligencePanel> {
    const catalogue =
      input.catalogue ?? (await this.getVerifiedCatalogueStats());

    return buildAuctionIntelligencePanel({
      property: input.property,
      hasImages: input.hasImages,
      comparableCount: input.comparableCount,
      catalogue,
    });
  }
}
