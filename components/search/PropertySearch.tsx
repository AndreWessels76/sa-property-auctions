"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  Search,
  MapPin,
  Home,
  ArrowUpDown,
  RotateCcw,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/components/auth/AuthProvider";
import AuctionCard from "@/components/home/AuctionCard";
import AnimatedSection from "@/components/ui/AnimatedSection";
import Pagination from "@/components/ui/Pagination";
import { normalizeSearchQuery } from "@/lib/ai/normalizeSearchQuery";
import type { AISearchDTO } from "@/lib/dto/AISearchDTO";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { SearchResult } from "@/lib/dto/SearchResult";
import { ROLES } from "@/lib/permissions/roles";
import { buildSearchFilters } from "@/lib/savedSearches";
import { isPremiumStatus } from "@/lib/subscription";
import SaveSearchButton from "@/components/saved-searches/SaveSearchButton";

const DEFAULT_PAGE_SIZE = 24;

const SA_PROVINCES = [
  "All",
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

const PROPERTY_TYPES = [
  "All",
  "House",
  "Apartment",
  "Townhouse",
  "Flat",
  "Farm",
  "Commercial",
  "Land",
  "Industrial",
];

type Props = {
  initialResult: SearchResult<PropertyDTO>;
};

type AiSearchResponse = SearchResult<PropertyDTO> & {
  ai: AISearchDTO;
};

function priceBounds(priceRange: string): {
  minPrice?: number;
  maxPrice?: number;
} {
  switch (priceRange) {
    case "<500000":
      return { maxPrice: 499999 };
    case "500000-1000000":
      return { minPrice: 500000, maxPrice: 1000000 };
    case "1000000-2000000":
      return { minPrice: 1000000, maxPrice: 2000000 };
    case ">2000000":
      return { minPrice: 2000001 };
    default:
      return {};
  }
}

function mapSort(sortBy: string): "auction" | "price-low" | "price-high" | "value-high" {
  if (sortBy === "price-low" || sortBy === "price-high") {
    return sortBy;
  }
  if (sortBy === "saving") {
    return "value-high";
  }
  return "auction";
}

/** True when AI produced structured filters — do not also send the raw NL query as `search`. */
function hasStructuredAiFilters(ai?: AISearchDTO | null): boolean {
  const filters = ai?.filters;
  if (!filters) {
    return false;
  }

  return Boolean(
    filters.town ||
      filters.province ||
      filters.suburb ||
      filters.propertyType ||
      filters.minBedrooms != null ||
      filters.maxBedrooms != null ||
      filters.minBathrooms != null ||
      filters.minPrice != null ||
      filters.maxPrice != null ||
      filters.auctionFrom ||
      filters.auctionTo ||
      filters.status ||
      filters.source,
  );
}

export default function PropertySearch({ initialResult }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, subscription, loading: authLoading } = useAuth();
  const [pending, startTransition] = useTransition();

  const queryFromUrl = normalizeSearchQuery(searchParams.get("q") ?? "");
  const pageFromUrl = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);

  const [search, setSearch] = useState(queryFromUrl);
  const [province, setProvince] = useState(
    searchParams.get("province") ?? "All",
  );
  const [propertyType, setPropertyType] = useState(
    searchParams.get("propertyType") ?? "All",
  );
  const [priceRange, setPriceRange] = useState(
    searchParams.get("priceRange") ?? "All",
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "auction");
  const [result, setResult] = useState(initialResult);
  const [aiMeta, setAiMeta] = useState<AISearchDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeCta, setShowUpgradeCta] = useState(false);

  const canUseAiSearch =
    Boolean(user) &&
    (role === ROLES.admin || isPremiumStatus(subscription));

  const syncUrl = useCallback(
    (next: {
      q?: string;
      page?: number;
      province?: string;
      propertyType?: string;
      priceRange?: string;
      sort?: string;
    }) => {
      const params = new URLSearchParams();
      const q = next.q ?? search;
      const page = next.page ?? pageFromUrl;
      const prov = next.province ?? province;
      const type = next.propertyType ?? propertyType;
      const price = next.priceRange ?? priceRange;
      const sort = next.sort ?? sortBy;

      if (q) params.set("q", q);
      if (page > 1) params.set("page", String(page));
      if (prov !== "All") params.set("province", prov);
      if (type !== "All") params.set("propertyType", type);
      if (price !== "All") params.set("priceRange", price);
      if (sort !== "auction") params.set("sort", sort);

      const qs = params.toString();
      router.replace(qs ? `/?${qs}#featured` : "/#featured", { scroll: false });
    },
    [pageFromUrl, priceRange, propertyType, province, router, search, sortBy],
  );

  const fetchPage = useCallback(
    async (opts: {
      q?: string;
      page?: number;
      province?: string;
      propertyType?: string;
      priceRange?: string;
      sort?: string;
      ai?: AISearchDTO | null;
    }) => {
      const q = opts.q ?? "";
      const page = opts.page ?? 1;
      const prov = opts.province ?? "All";
      const type = opts.propertyType ?? "All";
      const price = opts.priceRange ?? "All";
      const sort = opts.sort ?? "auction";
      const bounds = priceBounds(price);
      const ai = opts.ai;

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(DEFAULT_PAGE_SIZE));
      params.set("sort", mapSort(sort));

      const structuredAi = hasStructuredAiFilters(ai);
      // Prefer explicit AI search text; never AND the full NL query with structured filters
      // (that zeroes results — title/town cannot match "4 bedroom house in Pretoria").
      const searchText =
        ai?.filters.search?.trim() ||
        (!structuredAi ? q.trim() : "");
      if (searchText) params.set("search", searchText);

      if (prov !== "All") params.set("province", prov);
      if (type !== "All") params.set("propertyType", type);
      if (bounds.minPrice != null) params.set("minPrice", String(bounds.minPrice));
      if (bounds.maxPrice != null) params.set("maxPrice", String(bounds.maxPrice));

      if (ai?.filters.town) params.set("town", ai.filters.town);
      if (ai?.filters.minBedrooms != null) {
        params.set("minBedrooms", String(ai.filters.minBedrooms));
      }
      if (ai?.filters.maxBedrooms != null) {
        params.set("maxBedrooms", String(ai.filters.maxBedrooms));
      }
      if (ai?.filters.minBathrooms != null) {
        params.set("minBathrooms", String(ai.filters.minBathrooms));
      }
      if (ai?.filters.maxPrice != null && !bounds.maxPrice) {
        params.set("maxPrice", String(ai.filters.maxPrice));
      }
      if (ai?.filters.minPrice != null && !bounds.minPrice) {
        params.set("minPrice", String(ai.filters.minPrice));
      }
      if (ai?.filters.province && prov === "All") {
        params.set("province", ai.filters.province);
      }
      if (ai?.filters.propertyType && type === "All") {
        params.set("propertyType", ai.filters.propertyType);
      }
      if (ai?.filters.suburb) params.set("suburb", ai.filters.suburb);

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/properties?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Search failed");
        }
        const pageResult = (await response.json()) as SearchResult<PropertyDTO>;
        setResult(pageResult);
      } catch {
        setError("Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const runAiThenPage = useCallback(
    async (rawQuery: string) => {
      const query = normalizeSearchQuery(rawQuery);

      if (!query) {
        setAiMeta(null);
        setShowUpgradeCta(false);
        await fetchPage({
          q: "",
          page: 1,
          province,
          propertyType,
          priceRange,
          sort: sortBy,
        });
        return;
      }

      if (authLoading || !canUseAiSearch) {
        setAiMeta(null);
        setShowUpgradeCta(Boolean(query) && !authLoading && !canUseAiSearch);
        await fetchPage({
          q: query,
          page: 1,
          province,
          propertyType,
          priceRange,
          sort: sortBy,
        });
        return;
      }

      setLoading(true);
      setShowUpgradeCta(false);

      try {
        const response = await fetch("/api/properties/ai-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (response.status === 401 || response.status === 403) {
          setAiMeta(null);
          setShowUpgradeCta(true);
          await fetchPage({
            q: query,
            page: 1,
            province,
            propertyType,
            priceRange,
            sort: sortBy,
          });
          return;
        }

        if (!response.ok) {
          throw new Error("AI search failed");
        }

        const data = (await response.json()) as AiSearchResponse;
        setAiMeta(data.ai);

        const nextProvince = data.ai.filters.province ?? province;
        const nextType = data.ai.filters.propertyType ?? propertyType;
        let nextPrice = priceRange;
        if (data.ai.filters.maxPrice != null) {
          const max = data.ai.filters.maxPrice;
          if (max < 500000) nextPrice = "<500000";
          else if (max <= 1000000) nextPrice = "500000-1000000";
          else if (max <= 2000000) nextPrice = "1000000-2000000";
          else nextPrice = ">2000000";
        }
        const nextSort = data.ai.filters.sort ?? sortBy;

        setProvince(nextProvince);
        setPropertyType(nextType);
        setPriceRange(nextPrice);
        setSortBy(nextSort);

        // Use repository results from the AI search response directly.
        // Re-fetching with the raw NL query as `search` AND structured filters
        // previously returned zero rows for valid Pretoria listings.
        setResult({
          data: data.data,
          total: data.total,
          page: data.page,
          pageSize: data.pageSize,
          totalPages: data.totalPages,
          hasNext: data.hasNext,
          hasPrevious: data.hasPrevious,
        });
      } catch {
        setAiMeta(null);
        setError("Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [
      authLoading,
      canUseAiSearch,
      fetchPage,
      priceRange,
      propertyType,
      province,
      sortBy,
    ],
  );

  // Sync when URL page/filters change (browser back, pagination).
  useEffect(() => {
    setSearch(queryFromUrl);
    void fetchPage({
      q: queryFromUrl,
      page: pageFromUrl,
      province: searchParams.get("province") ?? province,
      propertyType: searchParams.get("propertyType") ?? propertyType,
      priceRange: searchParams.get("priceRange") ?? priceRange,
      sort: searchParams.get("sort") ?? sortBy,
      ai: aiMeta,
    });
    // Intentionally keyed on URL only to avoid filter-change loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFromUrl, pageFromUrl, searchParams]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = normalizeSearchQuery(search);
    startTransition(() => {
      void (async () => {
        // Run search before URL sync so the URL effect cannot overwrite AI results
        // with a stale free-text fetch (NL `search` AND structured filters → 0 rows).
        await runAiThenPage(query);
        syncUrl({ q: query, page: 1 });
      })();
    });
  }

  function handleFilterChange(
    key: "province" | "propertyType" | "priceRange" | "sort",
    value: string,
  ) {
    const next = {
      province,
      propertyType,
      priceRange,
      sort: sortBy,
      [key]: value,
    };

    if (key === "province") setProvince(value);
    if (key === "propertyType") setPropertyType(value);
    if (key === "priceRange") setPriceRange(value);
    if (key === "sort") setSortBy(value);

    syncUrl({
      page: 1,
      province: next.province,
      propertyType: next.propertyType,
      priceRange: next.priceRange,
      sort: next.sort,
    });

    startTransition(() => {
      void fetchPage({
        q: normalizeSearchQuery(search),
        page: 1,
        province: next.province,
        propertyType: next.propertyType,
        priceRange: next.priceRange,
        sort: next.sort,
        ai: aiMeta,
      });
    });
  }

  function handlePageChange(page: number) {
    syncUrl({ page });
    startTransition(() => {
      void fetchPage({
        q: normalizeSearchQuery(search),
        page,
        province,
        propertyType,
        priceRange,
        sort: sortBy,
        ai: aiMeta,
      });
    });
  }

  function handleReset() {
    setSearch("");
    setProvince("All");
    setPropertyType("All");
    setPriceRange("All");
    setSortBy("auction");
    setAiMeta(null);
    setError(null);
    setShowUpgradeCta(false);
    router.replace("/#featured", { scroll: false });
    startTransition(() => {
      void fetchPage({
        q: "",
        page: 1,
        province: "All",
        propertyType: "All",
        priceRange: "All",
        sort: "auction",
      });
    });
  }

  const currentFilters = useMemo(
    () =>
      buildSearchFilters({
        search,
        province,
        propertyType,
        priceRange,
        sortBy,
        aiFilters: aiMeta?.filters,
      }),
    [search, province, propertyType, priceRange, sortBy, aiMeta],
  );

  const busy = loading || pending;

  return (
    <>
      <div className="mt-12 mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form
          onSubmit={handleSearchSubmit}
          className="grid gap-4 lg:grid-cols-5"
        >
          <div className="relative lg:col-span-2">
            <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Try: 3 bedroom houses in Pretoria under R1.5m"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-28 focus:border-navy-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="absolute right-2 top-1.5 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Search
            </button>
          </div>

          <div className="relative">
            <MapPin className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
            <select
              value={province}
              onChange={(e) => handleFilterChange("province", e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 py-3 pl-12 pr-4"
            >
              {SA_PROVINCES.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All Provinces" : item}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Home className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
            <select
              value={propertyType}
              onChange={(e) =>
                handleFilterChange("propertyType", e.target.value)
              }
              className="w-full appearance-none rounded-xl border border-slate-300 py-3 pl-12 pr-4"
            >
              {PROPERTY_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All Property Types" : item}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-4 top-3 text-sm font-semibold text-slate-400"
            >
              R
            </span>
            <select
              value={priceRange}
              onChange={(e) => handleFilterChange("priceRange", e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 py-3 pl-12 pr-4"
            >
              <option value="All">Any Price</option>
              <option value="<500000">Under R500 000</option>
              <option value="500000-1000000">R500k - R1m</option>
              <option value="1000000-2000000">R1m - R2m</option>
              <option value=">2000000">Over R2m</option>
            </select>
          </div>
        </form>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="relative">
            <ArrowUpDown className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => handleFilterChange("sort", e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 py-3 pl-12 pr-4"
            >
              <option value="auction">Auction Date</option>
              <option value="price-low">Lowest Price</option>
              <option value="price-high">Highest Price</option>
              <option value="saving">Biggest Saving</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 font-semibold text-white transition hover:bg-navy-800"
          >
            <RotateCcw className="h-5 w-5" />
            Reset Filters
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-600">
              Showing
              <span className="mx-1 text-lg font-bold text-navy-900">
                {result.data.length}
              </span>
              of
              <span className="mx-1 font-bold text-navy-900">{result.total}</span>
              properties
              {busy ? (
                <span className="ml-2 text-sm font-medium text-slate-400">
                  Searching…
                </span>
              ) : null}
            </p>
            {aiMeta ? (
              <p className="mt-1 text-xs text-slate-500">
                AI parsed:{" "}
                {[
                  aiMeta.filters.town,
                  aiMeta.filters.propertyType,
                  aiMeta.filters.minBedrooms
                    ? `${aiMeta.filters.minBedrooms}+ beds`
                    : null,
                  aiMeta.filters.maxPrice
                    ? `under R${aiMeta.filters.maxPrice.toLocaleString("en-ZA")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {error ? (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            ) : null}
            {showUpgradeCta ? (
              <p className="mt-1 text-xs text-slate-600">
                Showing keyword matches.{" "}
                <Link
                  href="/pricing"
                  className="font-semibold text-navy-900 underline underline-offset-2 hover:text-gold-600"
                >
                  Upgrade to Premium
                </Link>{" "}
                for AI-powered search.
              </p>
            ) : null}
          </div>

          <SaveSearchButton filters={currentFilters} />
        </div>
      </div>

      {result.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <h3 className="text-2xl font-bold text-navy-900">
            No properties found
          </h3>
          <p className="mt-3 text-slate-500">
            Try changing your search or filters.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((property, index) => (
              <AnimatedSection key={property.id} delay={index * 0.05}>
                <AuctionCard property={property} />
              </AnimatedSection>
            ))}
          </div>

          {result.totalPages > 1 ? (
            <div className="mt-10">
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
