"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
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
import { calculateSavings } from "@/lib/ai/savings";
import { normalizeSearchQuery } from "@/lib/ai/normalizeSearchQuery";
import type { AISearchDTO } from "@/lib/dto/AISearchDTO";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { SearchResult } from "@/lib/dto/SearchResult";
import { ROLES } from "@/lib/permissions/roles";
import { buildSearchFilters } from "@/lib/savedSearches";
import { isPremiumStatus } from "@/lib/subscription";
import SaveSearchButton from "@/components/saved-searches/SaveSearchButton";

type Props = {
  properties: PropertyDTO[];
};

type AiSearchResponse = SearchResult<PropertyDTO> & {
  ai: AISearchDTO;
};

export default function PropertySearch({ properties }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, subscription, loading: authLoading } = useAuth();
  const queryFromUrl = normalizeSearchQuery(searchParams.get("q") ?? "");

  const [search, setSearch] = useState(queryFromUrl);
  const [province, setProvince] = useState("All");
  const [propertyType, setPropertyType] = useState("All");
  const [priceRange, setPriceRange] = useState("All");
  const [sortBy, setSortBy] = useState("auction");
  const [aiResults, setAiResults] = useState<PropertyDTO[] | null>(null);
  const [aiMeta, setAiMeta] = useState<AISearchDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeCta, setShowUpgradeCta] = useState(false);

  const canUseAiSearch =
    Boolean(user) &&
    (role === ROLES.admin || isPremiumStatus(subscription));

  const provinces = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          properties
            .map((p) => p.province)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    ],
    [properties],
  );

  const propertyTypes = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          properties
            .map((p) => p.property_type)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    ],
    [properties],
  );

  const applyAiFilters = useCallback((ai: AISearchDTO) => {
    const { filters } = ai;

    if (filters.province) {
      setProvince(filters.province);
    }

    if (filters.propertyType) {
      setPropertyType(filters.propertyType);
    }

    if (filters.maxPrice != null) {
      if (filters.maxPrice < 500000) {
        setPriceRange("<500000");
      } else if (filters.maxPrice <= 1000000) {
        setPriceRange("500000-1000000");
      } else if (filters.maxPrice <= 2000000) {
        setPriceRange("1000000-2000000");
      } else {
        setPriceRange(">2000000");
      }
    }

    if (filters.sort) {
      setSortBy(filters.sort);
    }
  }, []);

  const runSearch = useCallback(
    async (rawQuery: string) => {
      const query = normalizeSearchQuery(rawQuery);

      if (!query) {
        setAiResults(null);
        setAiMeta(null);
        setError(null);
        setShowUpgradeCta(false);
        return;
      }

      setSearch(query);

      // Guests and free users: local keyword filter only (no premium AI endpoint).
      if (authLoading || !canUseAiSearch) {
        setAiResults(null);
        setAiMeta(null);
        setError(null);
        setShowUpgradeCta(Boolean(query) && !authLoading && !canUseAiSearch);
        return;
      }

      setLoading(true);
      setError(null);
      setShowUpgradeCta(false);

      try {
        const response = await fetch("/api/properties/ai-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        if (response.status === 401 || response.status === 403) {
          setAiResults(null);
          setAiMeta(null);
          setShowUpgradeCta(true);
          setError(null);
          return;
        }

        if (!response.ok) {
          throw new Error("AI search failed");
        }

        const data = (await response.json()) as AiSearchResponse;

        setAiResults(data.data);
        setAiMeta(data.ai);
        applyAiFilters(data.ai);
      } catch {
        setAiResults(null);
        setAiMeta(null);
        setError("Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [applyAiFilters, authLoading, canUseAiSearch],
  );

  useEffect(() => {
    if (!queryFromUrl) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      void runSearch(queryFromUrl);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [queryFromUrl, runSearch]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = normalizeSearchQuery(search);

    if (!query) {
      setAiResults(null);
      setAiMeta(null);
      router.replace("/#featured");
      return;
    }

    router.replace(`/?q=${encodeURIComponent(query)}#featured`);
  }

  const filteredProperties = useMemo(() => {
    const source = aiResults ?? properties;
    const term = normalizeSearchQuery(search).toLowerCase();

    const filtered = source.filter((property) => {
      const matchesSearch =
        !term ||
        aiResults != null ||
        property.title.toLowerCase().includes(term) ||
        (property.town ?? "").toLowerCase().includes(term) ||
        (property.province ?? "").toLowerCase().includes(term) ||
        (property.property_type ?? "").toLowerCase().includes(term);

      const matchesProvince =
        province === "All" || property.province === province;

      const matchesType =
        propertyType === "All" || property.property_type === propertyType;

      const auctionPrice = property.auction_price ?? 0;
      let matchesPrice = true;

      if (priceRange === "<500000") {
        matchesPrice = auctionPrice < 500000;
      }

      if (priceRange === "500000-1000000") {
        matchesPrice = auctionPrice >= 500000 && auctionPrice <= 1000000;
      }

      if (priceRange === "1000000-2000000") {
        matchesPrice = auctionPrice >= 1000000 && auctionPrice <= 2000000;
      }

      if (priceRange === ">2000000") {
        matchesPrice = auctionPrice > 2000000;
      }

      const matchesBedrooms =
        aiMeta?.filters.minBedrooms == null ||
        (property.bedrooms ?? 0) >= aiMeta.filters.minBedrooms;

      return (
        matchesSearch &&
        matchesProvince &&
        matchesType &&
        matchesPrice &&
        matchesBedrooms
      );
    });

    switch (sortBy) {
      case "price-low":
        filtered.sort(
          (a, b) => (a.auction_price ?? 0) - (b.auction_price ?? 0),
        );
        break;

      case "price-high":
        filtered.sort(
          (a, b) => (b.auction_price ?? 0) - (a.auction_price ?? 0),
        );
        break;

      case "saving":
        filtered.sort((a, b) => {
          return (
            calculateSavings(
              b.estimated_value ?? 0,
              b.auction_price ?? 0,
            ).percent -
            calculateSavings(
              a.estimated_value ?? 0,
              a.auction_price ?? 0,
            ).percent
          );
        });
        break;

      default:
        filtered.sort((a, b) => {
          if (a.featured !== b.featured) {
            return a.featured ? -1 : 1;
          }

          return (
            new Date(a.auction_date ?? 0).getTime() -
            new Date(b.auction_date ?? 0).getTime()
          );
        });
    }

    return filtered;
  }, [
    aiMeta,
    aiResults,
    priceRange,
    properties,
    propertyType,
    province,
    search,
    sortBy,
  ]);

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

  function handleReset() {
    setSearch("");
    setProvince("All");
    setPropertyType("All");
    setPriceRange("All");
    setSortBy("auction");
    setAiResults(null);
    setAiMeta(null);
    setError(null);
    setShowUpgradeCta(false);
    router.replace("/#featured");
  }

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
              disabled={loading}
              className="absolute right-2 top-1.5 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              Search
            </button>
          </div>

          <div className="relative">
            <MapPin className="absolute left-4 top-4 h-5 w-5 text-slate-400" />

            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 py-3 pl-12 pr-4"
            >
              {provinces.map((item) => (
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
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 py-3 pl-12 pr-4"
            >
              {propertyTypes.map((item) => (
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
              onChange={(e) => setPriceRange(e.target.value)}
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
              onChange={(e) => setSortBy(e.target.value)}
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
                {filteredProperties.length}
              </span>
              properties
              {loading ? (
                <span className="ml-2 text-sm font-medium text-slate-400">
                  Searching…
                </span>
              ) : null}
            </p>
            {aiMeta ? (
              <p className="mt-1 text-xs text-slate-500">
                AI parsed: {[
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

      {filteredProperties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <h3 className="text-2xl font-bold text-navy-900">
            No properties found
          </h3>
          <p className="mt-3 text-slate-500">
            Try changing your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProperties.map((property, index) => (
            <AnimatedSection key={property.id} delay={index * 0.05}>
              <AuctionCard property={property} />
            </AnimatedSection>
          ))}
        </div>
      )}
    </>
  );
}
