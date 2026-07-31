import { Suspense } from "react";
import { ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import AnimatedSection from "@/components/ui/AnimatedSection";
import PropertySearch from "@/components/search/PropertySearch";
import { PropertyService } from "@/lib/services";

type Props = {
  page?: number;
  q?: string;
  province?: string;
  propertyType?: string;
  priceRange?: string;
  sort?: string;
};

function priceBounds(priceRange?: string): {
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

export default async function FeaturedAuctions({
  page = 1,
  q,
  province,
  propertyType,
  priceRange,
  sort,
}: Props) {
  const bounds = priceBounds(priceRange);

  const initialResult = await PropertyService.search({
    page: Math.max(1, page),
    pageSize: PropertyService.DEFAULT_PAGE_SIZE,
    search: q || undefined,
    province: province && province !== "All" ? province : undefined,
    propertyType:
      propertyType && propertyType !== "All" ? propertyType : undefined,
    minPrice: bounds.minPrice,
    maxPrice: bounds.maxPrice,
    sort:
      sort === "price-low" || sort === "price-high"
        ? sort
        : sort === "saving"
          ? "value-high"
          : "auction",
  });

  return (
    <section id="featured" className="bg-slate-50 py-28 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold-500">
                Live Listings
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl">
                Featured Auctions
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Properties going under the hammer soon, loaded directly from our
                live catalogue. Search and filter to explore current listings.
              </p>
            </div>
            <Link
              href="/auctions"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-navy-900 shadow-sm transition-all hover:border-navy-900 hover:shadow-md"
            >
              View all auctions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </AnimatedSection>

        {initialResult.total === 0 && !q && !province && !propertyType ? (
          <AnimatedSection delay={0.1}>
            <div className="mt-14 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-6 text-xl font-semibold text-navy-900">
                No properties found
              </p>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                There are no auction listings in the database yet. Check back
                soon or add properties in Supabase.
              </p>
            </div>
          </AnimatedSection>
        ) : (
          <Suspense
            fallback={
              <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                Loading search…
              </div>
            }
          >
            <PropertySearch initialResult={initialResult} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
