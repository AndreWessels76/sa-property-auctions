import { Quote, Star } from "lucide-react";
import Image from "next/image";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { testimonials } from "@/lib/data";

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-navy-950 py-28 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold-400">
            Who it helps
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Built for SA auction research
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
            Illustrative scenarios for public beta — not individual customer
            endorsements.
          </p>
        </AnimatedSection>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <AnimatedSection key={testimonial.id} delay={index * 0.1}>
              <div className="relative flex h-full flex-col rounded-2xl border border-navy-800 bg-navy-900/50 p-8 backdrop-blur-sm transition-all duration-500 hover:border-gold-500/30 hover:bg-navy-900">
                <Quote className="h-8 w-8 text-gold-500/40" />

                <div className="mt-4 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-gold-400 text-gold-400"
                    />
                  ))}
                </div>

                <p className="mt-5 flex-1 text-base leading-relaxed text-slate-300">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>

                <div className="mt-8 flex items-center gap-4 border-t border-navy-800 pt-6">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-gold-500/30"
                  />
                  <div>
                    <p className="font-semibold text-white">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gold-400">{testimonial.role}</p>
                    <p className="text-xs text-slate-500">
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
