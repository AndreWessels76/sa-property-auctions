import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";
import type { SavedSearchDTO } from "@/lib/dto/SavedSearchDTO";

export type { SavedSearchDTO as SavedSearch };

type CreateSavedSearchInput = {
  name: string;
  filters: PropertySearchDTO;
  active?: boolean;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Saved search request failed");
  }

  return data;
}

export async function getSavedSearches(): Promise<SavedSearchDTO[]> {
  const response = await fetch("/api/saved-searches", {
    method: "GET",
    cache: "no-store",
  });

  return parseResponse<SavedSearchDTO[]>(response);
}

export async function getSavedSearch(id: string): Promise<SavedSearchDTO> {
  const response = await fetch(`/api/saved-searches/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  return parseResponse<SavedSearchDTO>(response);
}

export async function saveSearch(search: CreateSavedSearchInput): Promise<SavedSearchDTO> {
  const response = await fetch("/api/saved-searches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: search.name,
      filters: search.filters,
      active: search.active ?? true,
    }),
  });

  const created = await parseResponse<SavedSearchDTO>(response);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("savedSearchUpdated"));
  }

  return created;
}

export async function deleteSearch(id: string): Promise<void> {
  const response = await fetch(`/api/saved-searches/${id}`, {
    method: "DELETE",
  });

  await parseResponse<{ success: boolean }>(response);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("savedSearchUpdated"));
  }
}

export async function renameSearch(id: string, name: string): Promise<void> {
  await updateSearch(id, { name });
}

export async function setSearchActive(
  id: string,
  active: boolean,
): Promise<void> {
  await updateSearch(id, { active });
}

export async function updateSearch(
  id: string,
  data: {
    name?: string;
    filters?: PropertySearchDTO;
    active?: boolean;
  },
): Promise<SavedSearchDTO> {
  const response = await fetch(`/api/saved-searches/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const updated = await parseResponse<SavedSearchDTO>(response);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("savedSearchUpdated"));
  }

  return updated;
}

export function buildSearchName(filters: PropertySearchDTO): string {
  if (filters.search?.trim()) {
    return filters.search.trim();
  }

  const parts: string[] = [];

  if (filters.town) {
    parts.push(filters.town);
  } else if (filters.province) {
    parts.push(filters.province);
  }

  if (filters.propertyType) {
    parts.push(filters.propertyType);
  }

  if (filters.maxPrice != null) {
    parts.push(`under R${filters.maxPrice.toLocaleString("en-ZA")}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Saved search";
}

export function buildSearchFilters(input: {
  search?: string;
  province?: string;
  propertyType?: string;
  priceRange?: string;
  sortBy?: string;
  aiFilters?: PropertySearchDTO;
}): PropertySearchDTO {
  const filters: PropertySearchDTO = {
    ...(input.aiFilters ?? {}),
  };

  const search = input.search?.trim();

  if (search) {
    filters.search = search;
  }

  if (input.province && input.province !== "All") {
    filters.province = input.province;
  }

  if (input.propertyType && input.propertyType !== "All") {
    filters.propertyType = input.propertyType;
  }

  switch (input.priceRange) {
    case "<500000":
      filters.maxPrice = 499_999;
      break;
    case "500000-1000000":
      filters.minPrice = 500_000;
      filters.maxPrice = 1_000_000;
      break;
    case "1000000-2000000":
      filters.minPrice = 1_000_000;
      filters.maxPrice = 2_000_000;
      break;
    case ">2000000":
      filters.minPrice = 2_000_001;
      break;
    default:
      break;
  }

  if (
    input.sortBy === "auction" ||
    input.sortBy === "price-low" ||
    input.sortBy === "price-high" ||
    input.sortBy === "value-high"
  ) {
    filters.sort = input.sortBy;
  }

  return filters;
}

export function buildSavedSearchUrl(filters: PropertySearchDTO): string {
  if (filters.search?.trim()) {
    return `/?q=${encodeURIComponent(filters.search.trim())}#featured`;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value == null || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();

  return query ? `/?${query}#featured` : "/#featured";
}
