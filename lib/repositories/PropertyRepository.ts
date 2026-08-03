import { BaseRepository } from "./BaseRepository";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import {
  buildSearchResult,
  type SearchResult,
} from "@/lib/dto/SearchResult";
import type { Property } from "@/lib/types/property";
import {
  isPubliclyVisibleVerification,
  PUBLIC_VERIFICATION_STATES,
} from "@/lib/data/publicListingPolicy";

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

  /** Public website catalogue — verified/sold only. */
  static async getPublicAll(): Promise<Property[]> {
    const all = await this.getAll();
    return all.filter((p) =>
      isPubliclyVisibleVerification(p.verification_state, p.data_classification),
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
      !isPubliclyVisibleVerification(
        property.verification_state,
        property.data_classification,
      )
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

    let query = db.from("properties").select("*", { count: "exact" });

    // Never expose pending/seed/archived on public search.
    query = query.in("verification_state", [...PUBLIC_VERIFICATION_STATES]);

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
      query = query.eq(
        "province",
        filters.province,
      );
    }

    if (filters.town) {
      query = query.eq(
        "town",
        filters.town,
      );
    }

    if (filters.suburb) {
      query = query.eq("suburb", filters.suburb);
    }

    if (filters.propertyType) {
      query = query.eq(
        "property_type",
        filters.propertyType,
      );
    }

    if (filters.minPrice) {
      query = query.gte(
        "auction_price",
        filters.minPrice,
      );
    }

    if (filters.maxPrice) {
      query = query.lte(
        "auction_price",
        filters.maxPrice,
      );
    }

    if (filters.minEstimatedValue) {
      query = query.gte("estimated_value", filters.minEstimatedValue);
    }

    if (filters.maxEstimatedValue) {
      query = query.lte("estimated_value", filters.maxEstimatedValue);
    }

    if (filters.minBedrooms) {
      query = query.gte(
        "bedrooms",
        filters.minBedrooms,
      );
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
      query = query.gte(
        "auction_date",
        filters.auctionFrom,
      );
    }

    if (filters.auctionTo) {
      query = query.lte(
        "auction_date",
        filters.auctionTo,
      );
    }

    if (filters.status) {
      const normalized = filters.status.trim().toLowerCase();
      // Only apply known auction statuses. AI often invents "Active"/"Available",
      // which would zero results against real rows (Upcoming/upcoming).
      const knownStatuses = new Set([
        "upcoming",
        "sold",
        "withdrawn",
        "cancelled",
        "closed",
      ]);

      if (knownStatuses.has(normalized)) {
        query = query.ilike("status", normalized);
      }
    }

    if (filters.source) {
      query = query.eq("source", filters.source);
    }

    switch (filters.sort) {
      case "auction":
        query = query.order("auction_date");
        break;

      case "price-low":
        query = query.order(
          "auction_price",
          { ascending: true },
        );
        break;

      case "price-high":
        query = query.order(
          "auction_price",
          { ascending: false },
        );
        break;

      case "value-high":
        query = query.order(
          "estimated_value",
          { ascending: false },
        );
        break;

      default:
        query = query.order(
          "created_at",
          { ascending: false },
        );
    }
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      this.handleError("PropertyRepository.search", error);
    }

    return buildSearchResult(
      (data as Property[]) ?? [],
      count ?? 0,
      page,
      pageSize,
    );
  }
}
