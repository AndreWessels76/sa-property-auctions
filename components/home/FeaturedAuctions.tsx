import { Suspense } from "react";
import { ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import AnimatedSection from "@/components/ui/AnimatedSection";
import PropertySearch from "@/components/search/PropertySearch";
import { PropertyService } from "@/lib/services";

export default async function FeaturedAuctions() {
  const properties = await PropertyService.getProperties();

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
                database. Search and filter to find your next opportunity.
              </p>
            </div>
            <Link
              href="#featured"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-navy-900 shadow-sm transition-all hover:border-navy-900 hover:shadow-md"
            >
              View all auctions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </AnimatedSection>

        {properties.length === 0 ? (
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
            <PropertySearch properties={properties} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
