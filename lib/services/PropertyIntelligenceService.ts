import { PropertyRepository } from "@/lib/repositories";
import { isPubliclyActiveListing } from "@/lib/data/publicListingPolicy";
import { buildMapFoundationDataset } from "@/lib/platform/mapFoundation";
import { buildHeatMapFoundationDatasets } from "@/lib/platform/heatMapFoundation";
import { buildGovernanceReport } from "@/lib/platform/dataGovernance";
import { collectConnectorHealth } from "@/lib/connectors/framework/registry";
import {
  buildAllAgencyIntelligence,
  buildAllAreaIntelligence,
  buildMarketIntelligence,
} from "@/lib/platform";
import {
  buildAgencyReportCsv,
  buildProvinceReportCsv,
  buildTownReportCsv,
} from "@/lib/platform/reportingEngine";
import { getPropertyClassification } from "@/lib/property/detailExperience";
import { unstable_cache } from "next/cache";

export type MapLayerKey =
  | "upcoming"
  | "live"
  | "residential"
  | "commercial"
  | "industrial"
  | "agricultural"
  | "vacant_land"
  | "verified_only";

/**
 * Phase 4–5 intelligence orchestration — verified production data only.
 */
export class PropertyIntelligenceService {
  static getVerifiedMapProperties = unstable_cache(
    async () => {
      const corpus = await PropertyRepository.getIntelligenceCorpus(1000);
      const active = corpus.filter((p) =>
        isPubliclyActiveListing({
          verification_state: p.verification_state,
          data_classification: p.data_classification,
          listing_status: p.listing_status,
          status: p.status,
          auction_date: p.auction_date,
        }),
      );
      return active
        .filter(
          (p) =>
            typeof p.latitude === "number" &&
            typeof p.longitude === "number" &&
            Number.isFinite(p.latitude) &&
            Number.isFinite(p.longitude),
        )
        .map((p) => ({
          id: p.id,
          title: p.title,
          town: p.town,
          province: p.province,
          latitude: p.latitude as number,
          longitude: p.longitude as number,
          property_type: p.property_type,
          classification: getPropertyClassification(p.property_type),
          listing_status: p.listing_status ?? p.status,
          verification_state: p.verification_state,
          auction_date: p.auction_date,
          auction_agency: p.auction_agency ?? p.source_name ?? null,
          opportunity_score: p.data_quality_score ?? p.completeness_score ?? 50,
        }));
    },
    ["property-intelligence-map-points"],
    { revalidate: 120, tags: ["properties", "verified-data-platform"] },
  );

  static async getHeatmapProperties() {
    return this.getVerifiedMapProperties();
  }

  static async getMapFoundation() {
    const corpus = await PropertyRepository.getIntelligenceCorpus(1000);
    return buildMapFoundationDataset(corpus);
  }

  static async getHeatFoundation() {
    const corpus = await PropertyRepository.getIntelligenceCorpus(1000);
    return buildHeatMapFoundationDatasets(corpus);
  }

  static async getGovernanceReport() {
    const corpus = await PropertyRepository.getIntelligenceCorpus(1000);
    return buildGovernanceReport(corpus);
  }

  static async getConnectorHealth() {
    return collectConnectorHealth();
  }

  static async getAgencyDashboardData() {
    const corpus = await PropertyRepository.getIntelligenceCorpus(1000);
    return buildAllAgencyIntelligence(corpus);
  }

  static async getAreaDashboardData() {
    const corpus = await PropertyRepository.getIntelligenceCorpus(1000);
    return buildAllAreaIntelligence(corpus);
  }

  static async getMarketDashboardData() {
    const corpus = await PropertyRepository.getIntelligenceCorpus(1000);
    return buildMarketIntelligence(corpus);
  }

  static async buildReports() {
    const [agencies, areas, market] = await Promise.all([
      this.getAgencyDashboardData(),
      this.getAreaDashboardData(),
      this.getMarketDashboardData(),
    ]);

    const provinceMap = new Map<string, { count: number; active: number }>();
    for (const a of areas) {
      const province = a.province ?? "Unknown";
      const cur = provinceMap.get(province) ?? { count: 0, active: 0 };
      cur.count += a.verifiedAuctions;
      cur.active += a.upcomingAuctions;
      provinceMap.set(province, cur);
    }

    return {
      provinceCsv: buildProvinceReportCsv(
        [...provinceMap.entries()].map(([province, v]) => ({
          province,
          count: v.count,
          active: v.active,
        })),
      ),
      agencyCsv: buildAgencyReportCsv(
        agencies.map((a) => ({
          agency: a.agencyName,
          active: a.activeListings,
          completed: a.completedAuctions,
          verificationRate: a.verificationRate,
          averageQuality: a.averageListingQuality,
        })),
      ),
      townCsv: buildTownReportCsv(
        areas.map((a) => ({
          town: a.town,
          province: a.province,
          upcoming: a.upcomingAuctions,
          historical: Math.max(0, a.verifiedAuctions - a.upcomingAuctions),
          averageReserve: a.averageReserve,
        })),
      ),
      market,
    };
  }
}
