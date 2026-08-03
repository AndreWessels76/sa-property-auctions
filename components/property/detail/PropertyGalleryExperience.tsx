"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  X,
} from "lucide-react";
import { getPropertyImage } from "@/lib/format";

export type GalleryImageItem = {
  id: string;
  url: string;
  blur?: string | null;
};

type Props = {
  images: GalleryImageItem[];
  title: string;
  propertyType: string;
  placeholderUrl?: string;
};

export default function PropertyGalleryExperience({
  images,
  title,
  propertyType,
  placeholderUrl,
}: Props) {
  const fallback =
    placeholderUrl || getPropertyImage(propertyType || "Property");
  const slides =
    images.length > 0
      ? images
      : [{ id: "placeholder", url: fallback, blur: null }];
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const go = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        const next = current + delta;
        if (next < 0) return slides.length - 1;
        if (next >= slides.length) return 0;
        return next;
      });
    },
    [slides.length],
  );

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, go]);

  const active = slides[activeIndex];

  return (
    <>
      <section
        aria-label="Property gallery"
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg"
      >
        <div className="relative aspect-[16/9] min-h-[240px] w-full bg-slate-100 sm:aspect-[21/9]">
          <Image
            src={active.url}
            alt={`${title} — photo ${activeIndex + 1} of ${slides.length}`}
            fill
            priority={activeIndex === 0}
            loading={activeIndex === 0 ? "eager" : "lazy"}
            placeholder={active.blur ? "blur" : "empty"}
            blurDataURL={active.blur ?? undefined}
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-transparent" />
          <div className="absolute right-4 top-4 flex gap-2">
            <span
              className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
              aria-live="polite"
            >
              {activeIndex + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-navy-900 shadow-sm transition hover:bg-white"
              aria-label="Open fullscreen gallery"
            >
              <Expand className="h-3.5 w-3.5" aria-hidden />
              View all
            </button>
          </div>
          {slides.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-900 shadow-md transition hover:bg-white"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-navy-900 shadow-md transition hover:bg-white"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>

        {slides.length > 1 ? (
          <div
            className="flex gap-2 overflow-x-auto border-t border-slate-200 p-3"
            role="tablist"
            aria-label="Gallery thumbnails"
          >
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`Show photo ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  index === activeIndex
                    ? "border-gold-500 ring-2 ring-gold-200"
                    : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <Image
                  src={slide.url}
                  alt=""
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="96px"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            Provider photos are not yet available. A category placeholder is
            shown until verified gallery images are added.
          </div>
        )}
      </section>

      {fullscreen ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-navy-950/95"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen property gallery"
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-sm font-medium">
              {title} — {activeIndex + 1} / {slides.length}
            </p>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"
              aria-label="Close fullscreen gallery"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex-1">
            <Image
              src={active.url}
              alt={`${title} — photo ${activeIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
            {slides.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition hover:bg-white/25"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition hover:bg-white/25"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
