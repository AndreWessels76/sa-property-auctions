import { createSupabaseClient } from "@/lib/supabase";
import {
  buildAuctionIntelligencePanel,
  buildVerifiedCatalogueStats,
  type AuctionIntelligencePanel,
  type VerifiedCatalogueStats,
} from "@/lib/property/auctionIntelligence";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { LoggerService } from "@/lib/logger";
import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";

/**
 * Auction Intelligence — verified-only aggregates + per-listing panel.
 * Active catalogue stats exclude historical (sold/expired) auctions.
 */
export class AuctionIntelligenceService {
  static async getVerifiedCatalogueStats(): Promise<VerifiedCatalogueStats> {
    try {
      const db = createSupabaseClient();
      const { data, error } = await db
        .from("properties")
        .select(
          "id,province,town,property_type,auction_agency,source_name,auction_date,verification_state,data_classification,listing_status,status",
        )
        .eq("verification_state", "verified")
        .limit(500);

      if (error) {
        LoggerService.warn("auction_intelligence.catalogue_failed", {
          error: error.message,
        });
        return buildVerifiedCatalogueStats([]);
      }

      const active = (data ?? []).filter((row) =>
        isPubliclyActiveListing({
          verification_state: row.verification_state as string | null,
          data_classification: row.data_classification as string | null,
          listing_status: row.listing_status as string | null,
          status: row.status as string | null,
          auction_date: row.auction_date as string | null,
        }),
      );

      return buildVerifiedCatalogueStats(
        active.map((row) => ({
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
