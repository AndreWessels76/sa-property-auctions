import { BaseRepository } from "./BaseRepository";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import {
  buildSearchResult,
  type SearchResult,
} from "@/lib/dto/SearchResult";
import type { Property } from "@/lib/types/property";
import { agriculturalSearchNeedle } from "@/lib/intelligence/agriculturalSearch";
import {
  isPubliclyActiveListing,
  PUBLIC_VERIFICATION_STATES,
  publicCatalogueTodayIso,
  HISTORICAL_INTELLIGENCE_STATES,
} from "@/lib/data/publicListingPolicy";

function sanitizeIlike(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const cleaned = value.trim().replace(/[%_,.()]/g, "").slice(0, 80);
  return cleaned.length > 0 ? cleaned : null;
}

export class PropertyRepository extends BaseRepository {
  static readonly DEFAULT_PAGE_SIZE = 24;

  /** Full catalogue including pending — cron/admin/internal only. */
  static async getAll(): Promise<Property[]> {
    const db = this.publicDb();

    const { data, error } = await db
      .from("properties")
      .select("*")
      .order("auction_date", {
        ascending: true,
      });

    if (error) {
      this.handleError("PropertyRepository.getAll", error);
    }

    return (data as Property[]) ?? [];
  }

  /** Public website catalogue — verified upcoming/live only. */
  static async getPublicAll(): Promise<Property[]> {
    const all = await this.getAll();
    return all.filter((p) =>
      isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
      }),
    );
  }

  /**
   * Intelligence corpus — verified + historical states (sold/expired/withdrawn).
   * Never used for public catalogue listing.
   */
  static async getIntelligenceCorpus(limit = 1000): Promise<Property[]> {
    const db = this.publicDb();
    const { data, error } = await db
      .from("properties")
      .select("*")
      .in("verification_state", [...HISTORICAL_INTELLIGENCE_STATES])
      .limit(limit);

    if (error) {
      this.handleError("PropertyRepository.getIntelligenceCorpus", error);
    }

    return ((data as Property[]) ?? []).filter(
      (p) => p.data_classification !== "seed" && p.data_classification !== "demo",
    );
  }

  static async getById(id: string): Promise<Property | null> {
    const db = this.publicDb();

    const { data, error } = await db
      .from("properties")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.handleError("PropertyRepository.getById", error);
    }

    return data as Property | null;
  }

  static async getPublicById(id: string): Promise<Property | null> {
    const property = await this.getById(id);
    if (!property) return null;
    if (
      !isPubliclyActiveListing({
        verification_state: property.verification_state,
        data_classification: property.data_classification,
        listing_status: property.listing_status,
        status: property.status,
        auction_date: property.auction_date,
      })
    ) {
      return null;
    }
    return property;
  }

  /** Fetch a page of properties by explicit IDs (favourites). */
  static async getByIds(
    ids: string[],
    page = 1,
    pageSize = PropertyRepository.DEFAULT_PAGE_SIZE,
  ): Promise<SearchResult<Property>> {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(Math.max(1, pageSize), 100);
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    const total = uniqueIds.length;

    if (total === 0) {
      return buildSearchResult([], 0, safePage, safeSize);
    }

    const from = (safePage - 1) * safeSize;
    const pageIds = uniqueIds.slice(from, from + safeSize);

    if (pageIds.length === 0) {
      return buildSearchResult([], total, safePage, safeSize);
    }

    const db = this.publicDb();
    const { data, error } = await db
      .from("properties")
      .select("*")
      .in("id", pageIds);

    if (error) {
      this.handleError("PropertyRepository.getByIds", error);
    }

    const byId = new Map(
      ((data as Property[]) ?? []).map((property) => [property.id, property]),
    );
    const ordered = pageIds
      .map((id) => byId.get(id))
      .filter((property): property is Property => Boolean(property));

    return buildSearchResult(ordered, total, safePage, safeSize);
  }

  static async search(
    filters: PropertySearchDTO,
  ): Promise<SearchResult<Property>> {
    const db = this.publicDb();

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(
      Math.max(1, filters.pageSize ?? PropertyRepository.DEFAULT_PAGE_SIZE),
      100,
    );

    const today = publicCatalogueTodayIso();

    let query = db.from("properties").select("*", { count: "exact" });

    // Public catalogue: verified only (sold/expired/withdrawn excluded).
    query = query.in("verification_state", [...PUBLIC_VERIFICATION_STATES]);

    // Active auctions: live OR auction_date today/future.
    // listing_status sold/cancelled/withdrawn/completed excluded via second filter.
    query = query.or(
      `listing_status.ilike.live,auction_date.gte.${today}`,
    );
    query = query.or(
      "listing_status.is.null,listing_status.ilike.upcoming,listing_status.ilike.live",
    );

    if (filters.search) {
      query = query.or(
        `
title.ilike.%${filters.search}%,
town.ilike.%${filters.search}%,
suburb.ilike.%${filters.search}%,
address.ilike.%${filters.search}%
`.replace(/\s+/g, ""),
      );
    }

    if (filters.province) {
      query = query.eq("province", filters.province);
    }

    if (filters.town) {
      query = query.eq("town", filters.town);
    }

    if (filters.suburb) {
      query = query.eq("suburb", filters.suburb);
    }

    if (filters.propertyType) {
      const t = filters.propertyType;
      // Fine-grained types (e.g. Macadamia Farm) should match catalogue bucket "Farm".
      if (t === "Farm") {
        query = query.or(
          "property_type.eq.Farm,property_type.ilike.%Farm%,property_type.eq.Smallholding,property_type.eq.Agricultural Land",
        );
      } else if (t === "Commercial") {
        query = query.or(
          "property_type.eq.Commercial,property_type.eq.Retail,property_type.eq.Office,property_type.eq.Mixed Use",
        );
      } else if (t === "Industrial") {
        query = query.or(
          "property_type.eq.Industrial,property_type.eq.Warehouse",
        );
      } else if (t === "House") {
        query = query.or(
          "property_type.eq.House,property_type.eq.Guest House",
        );
      } else if (t === "Townhouse") {
        query = query.or(
          "property_type.eq.Townhouse,property_type.eq.Duet,property_type.eq.Cluster",
        );
      } else if (t === "Vacant Land") {
        query = query.or(
          "property_type.eq.Vacant Land,property_type.eq.Development Land",
        );
      } else {
        query = query.eq("property_type", t);
      }
    }

    if (filters.minPrice) {
      query = query.gte("auction_price", filters.minPrice);
    }

    if (filters.maxPrice) {
      query = query.lte("auction_price", filters.maxPrice);
    }

    if (filters.minEstimatedValue) {
      query = query.gte("estimated_value", filters.minEstimatedValue);
    }

    if (filters.maxEstimatedValue) {
      query = query.lte("estimated_value", filters.maxEstimatedValue);
    }

    if (filters.minBedrooms) {
      query = query.gte("bedrooms", filters.minBedrooms);
    }

    if (filters.maxBedrooms) {
      query = query.lte("bedrooms", filters.maxBedrooms);
    }

    if (filters.minBathrooms) {
      query = query.gte("bathrooms", filters.minBathrooms);
    }

    if (filters.maxBathrooms) {
      query = query.lte("bathrooms", filters.maxBathrooms);
    }

    if (filters.auctionFrom) {
      query = query.gte("auction_date", filters.auctionFrom);
    }

    if (filters.auctionTo) {
      query = query.lte("auction_date", filters.auctionTo);
    }

    if (filters.status) {
      const normalized = filters.status.trim().toLowerCase();
      const knownStatuses = new Set(["upcoming", "live"]);

      // Public search never expands into sold/cancelled/closed.
      if (knownStatuses.has(normalized)) {
        query = query.ilike("listing_status", normalized);
      }
    }

    if (filters.source) {
      query = query.eq("source", filters.source);
    }

    if (filters.minGarages) {
      query = query.gte("garages", filters.minGarages);
    }

    if (filters.minErfSize) {
      query = query.gte("erf_size", filters.minErfSize);
    }

    if (filters.maxErfSize) {
      query = query.lte("erf_size", filters.maxErfSize);
    }

    if (filters.minFloorSize) {
      query = query.gte("floor_size", filters.minFloorSize);
    }

    if (filters.maxFloorSize) {
      query = query.lte("floor_size", filters.maxFloorSize);
    }

    const agency = sanitizeIlike(filters.agency);
    if (agency) {
      query = query.or(
        `auction_agency.ilike.%${agency}%,source_name.ilike.%${agency}%`,
      );
    }

    const agriNeedle = sanitizeIlike(
      agriculturalSearchNeedle(filters.agriculturalType ?? null) ?? undefined,
    );
    if (agriNeedle) {
      query = query.or(
        `property_type.ilike.%${agriNeedle}%,title.ilike.%${agriNeedle}%`,
      );
    }

    switch (filters.sort) {
      case "auction":
        query = query.order("auction_date");
        break;

      case "price-low":
        query = query.order("auction_price", { ascending: true });
        break;

      case "price-high":
        query = query.order("auction_price", { ascending: false });
        break;

      case "value-high":
        query = query.order("estimated_value", { ascending: false });
        break;

      default:
        query = query.order("created_at", { ascending: false });
    }
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      this.handleError("PropertyRepository.search", error);
    }

    const rows = ((data as Property[]) ?? []).filter((p) =>
      isPubliclyActiveListing({
        verification_state: p.verification_state,
        data_classification: p.data_classification,
        listing_status: p.listing_status,
        status: p.status,
        auction_date: p.auction_date,
      }),
    );

    return buildSearchResult(rows, count ?? rows.length, page, pageSize);
  }
}
