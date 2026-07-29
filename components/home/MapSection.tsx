"use client";

import { Map, MousePointerClick } from "lucide-react";
import { useState } from "react";
import AnimatedSection from "@/components/ui/AnimatedSection";
import { mapProvinces } from "@/lib/data";

export default function MapSection() {
  const [activeProvince, setActiveProvince] = useState(mapProvinces[5]);

  return (
    <section id="map" className="py-28 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold-500">
            Geographic Intelligence
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl lg:text-5xl">
            Explore Auctions by Province
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Interactive map coming soon. Hover over a province to preview
            available listings.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.15} className="mt-14">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="grid lg:grid-cols-5">
              <div className="map-grid relative bg-slate-50 p-8 lg:col-span-3 lg:p-12">
                <div className="absolute right-6 top-6 flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-slate-500 shadow-sm">
                  <MousePointerClick className="h-3.5 w-3.5" />
                  Interactive placeholder
                </div>

                <div className="relative mx-auto aspect-[4/5] max-w-md">
                  <svg
                    viewBox="0 0 100 100"
                    className="h-full w-full drop-shadow-md"
                    aria-label="South Africa map placeholder"
                  >
                    <path
                      d="M25 75 L18 65 L20 55 L15 45 L22 38 L20 28 L30 22 L38 18 L45 25 L52 20 L58 25 L65 22 L72 28 L78 35 L82 42 L75 50 L80 58 L72 65 L68 72 L58 78 L48 82 L38 80 L30 78 Z"
                      fill="#e8edf3"
                      stroke="#132d52"
                      strokeWidth="0.8"
                      className="transition-colors hover:fill-slate-200"
                    />
                    {mapProvinces.map((province) => (
                      <g key={province.name}>
                        <circle
                          cx={province.x}
                          cy={province.y}
                          r={
                            activeProvince.name === province.name ? 3.5 : 2.5
                          }
                          fill={
                            activeProvince.name === province.name
                              ? "#c9a227"
                              : "#132d52"
                          }
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setActiveProvince(province)}
                          onFocus={() => setActiveProvince(province)}
                          tabIndex={0}
                          role="button"
                          aria-label={`${province.name}, ${province.auctions} auctions`}
                        />
                        {activeProvince.name === province.name && (
                          <circle
                            cx={province.x}
                            cy={province.y}
                            r="6"
                            fill="none"
                            stroke="#c9a227"
                            strokeWidth="0.5"
                            opacity="0.6"
                          />
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              <div className="flex flex-col justify-center border-t border-slate-200 bg-navy-900 p-10 lg:col-span-2 lg:border-l lg:border-t-0 lg:p-12">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-800">
                  <Map className="h-6 w-6 text-gold-400" />
                </div>
                <p className="text-sm font-medium text-gold-400">
                  Selected Province
                </p>
                <h3 className="mt-1 text-2xl font-bold text-white">
                  {activeProvince.name}
                </h3>
                <p className="mt-4 text-5xl font-bold text-gold-400">
                {activeProvince.auctions.toLocaleString("en-ZA")}
                </p>
                <p className="text-sm text-slate-400">Active auction listings</p>

                <div className="mt-8 space-y-2">
                  {mapProvinces.slice(0, 4).map((province) => (
                    <button
                      key={province.name}
                      type="button"
                      onMouseEnter={() => setActiveProvince(province)}
                      onClick={() => setActiveProvince(province)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                        activeProvince.name === province.name
                          ? "bg-navy-800 text-white"
                          : "text-slate-400 hover:bg-navy-800/50 hover:text-white"
                      }`}
                    >
                      <span>{province.name}</span>
                      <span className="font-semibold text-gold-400">
                        {province.auctions}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
