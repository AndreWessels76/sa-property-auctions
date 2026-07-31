"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";
import AuctionCard from "@/components/home/AuctionCard";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import Pagination from "@/components/ui/Pagination";
import { useAuth } from "@/app/components/auth/AuthProvider";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { SearchResult } from "@/lib/dto/SearchResult";
import { getFavourites } from "@/lib/favourites";

const PAGE_SIZE = 24;

export default function FavouritesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [pending, startTransition] = useTransition();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);

  const [result, setResult] = useState<SearchResult<PropertyDTO> | null>(null);
  const [loadingProperties, setLoadingProperties] = useState(true);

  const loadPage = useCallback(async (pageNumber: number) => {
    const ids = getFavourites();

    if (ids.length === 0) {
      setResult({
        data: [],
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      });
      setLoadingProperties(false);
      return;
    }

    setLoadingProperties(true);

    try {
      const params = new URLSearchParams({
        ids: ids.join(","),
        page: String(pageNumber),
        pageSize: String(PAGE_SIZE),
      });
      const response = await fetch(`/api/properties?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load favourites");
      }
      const payload = (await response.json()) as SearchResult<PropertyDTO>;
      setResult(payload);
    } catch {
      setResult({
        data: [],
        total: 0,
        page: pageNumber,
        pageSize: PAGE_SIZE,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      });
    } finally {
      setLoadingProperties(false);
    }
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/login?next=/favourites");
      return;
    }

    void loadPage(page);

    function onFavouritesUpdated() {
      void loadPage(page);
    }

    window.addEventListener("favouritesUpdated", onFavouritesUpdated);
    return () =>
      window.removeEventListener("favouritesUpdated", onFavouritesUpdated);
  }, [user, loading, router, page, loadPage]);

  function handlePageChange(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    const qs = params.toString();
    router.replace(qs ? `/favourites?${qs}` : "/favourites");
    startTransition(() => {
      void loadPage(nextPage);
    });
  }

  const busy = loadingProperties || pending;
  const properties = result?.data ?? [];
  const total = result?.total ?? 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-10 flex items-center gap-3">
            <Heart className="h-8 w-8 fill-red-500 text-red-500" />

            <div>
              <h1 className="text-4xl font-bold text-navy-900">
                My Favourite Properties
              </h1>
              <p className="text-slate-500">
                {busy
                  ? "Loading favourites..."
                  : `${total} saved ${total === 1 ? "property" : "properties"}`}
              </p>
            </div>
          </div>

          {busy && !result ? (
            <p className="py-16 text-center text-slate-500">
              Loading favourites...
            </p>
          ) : total === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-24 text-center">
              <Heart className="mx-auto h-16 w-16 text-slate-300" />

              <h2 className="mt-6 text-2xl font-bold text-navy-900">
                No favourites yet
              </h2>

              <p className="mt-2 text-slate-500">
                Click the heart icon on any property to save it here.
              </p>

              <Link
                href="/#featured"
                className="mt-8 inline-flex rounded-xl bg-navy-900 px-6 py-3 font-semibold text-white hover:bg-navy-800"
              >
                Browse Auctions
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                {properties.map((property) => (
                  <AuctionCard key={property.id} property={property} />
                ))}
              </div>

              {result && result.totalPages > 1 ? (
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
        </div>
      </main>
      <Footer />
    </>
  );
}
