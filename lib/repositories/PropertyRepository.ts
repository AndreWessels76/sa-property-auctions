import { BaseRepository } from "./BaseRepository";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import type { SearchResult } from "@/lib/dto/SearchResult";
import type { Property } from "@/lib/types/property";

export class PropertyRepository extends BaseRepository {
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

  static async search(
    filters: PropertySearchDTO,
  ): Promise<SearchResult<Property>> {
    const db = this.publicDb();

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    let query = db.from("properties").select("*", { count: "exact" });

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
      query = query.eq("status", filters.status);
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

    return {
      data: (data as Property[]) ?? [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  }
}
