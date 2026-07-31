import AnimatedSection from "@/components/ui/AnimatedSection";
import { partners } from "@/lib/data";

export default function Partners() {
  const doubled = [...partners, ...partners];

  return (
    <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
            Listing sources
          </p>
          <h2 className="mt-2 text-xl font-semibold text-navy-900 sm:text-2xl">
            Built for South African auction discovery
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">
            We organise auction-style inventory from sheriff, bank, public and
            partner feeds as they are onboarded. Always verify details with the
            official seller before bidding.
          </p>
        </AnimatedSection>
      </div>

      <div className="relative mt-12 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />

        <div className="animate-marquee flex w-max items-center gap-16 px-8">
          {doubled.map((partner, index) => (
            <div
              key={`${partner}-${index}`}
              className="flex h-16 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-10 transition-colors hover:border-gold-400/30 hover:bg-gold-50/50"
            >
              <span className="whitespace-nowrap text-lg font-bold tracking-tight text-slate-400 transition-colors hover:text-navy-800">
                {partner}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
