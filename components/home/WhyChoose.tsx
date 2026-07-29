import {
  BellRing,
  Lock,
  MapPinned,
  ShieldCheck,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { whyChooseFeatures } from "@/lib/data";

const iconMap = {
  ShieldCheck,
  BellRing,
  MapPinned,
  TrendingUp,
  Smartphone,
  Lock,
};

export default function WhyChoose() {
  return (
    <section id="why-choose" className="py-28 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold-500">
            The SA Property Advantage
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl">
            Why Choose SA Property Auctions?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            Built for serious buyers and investors who demand accuracy, speed,
            and transparency in every auction listing.
          </p>
        </AnimatedSection>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {whyChooseFeatures.map((feature, index) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap];
            return (
              <AnimatedSection key={feature.title} delay={index * 0.08}>
                <div className="group h-full rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-gold-400/40 hover:shadow-xl">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 transition-all duration-300 group-hover:bg-gold-500">
                    <Icon className="h-6 w-6 text-gold-400 transition-colors group-hover:text-navy-950" />
                  </div>
                  <h3 className="text-xl font-bold text-navy-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
