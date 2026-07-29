"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HERO_IMAGE } from "@/lib/data";
import { normalizeSearchQuery } from "@/lib/ai/normalizeSearchQuery";

export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = normalizeSearchQuery(query);

    if (!normalized) {
      return;
    }

    router.push(`/?q=${encodeURIComponent(normalized)}#featured`);
  }

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <Image
        src={HERO_IMAGE}
        alt="Luxury South African property"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/80 via-navy-900/70 to-navy-950/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,162,39,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-32 sm:px-6 sm:pb-28 sm:pt-36 lg:px-8 lg:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-gold-300 backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold-400" />
              Trusted by 12,000+ property seekers nationwide
            </p>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              South Africa&apos;s Smartest Property Auction Platform
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              Find sheriff, bank and public property auctions across South
              Africa. Discover below-market deals before anyone else.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="#featured"
              className="animate-pulse-glow group inline-flex items-center gap-2.5 rounded-xl bg-gold-500 px-8 py-4 text-base font-bold text-navy-950 shadow-2xl shadow-gold-500/25 transition-all hover:bg-gold-400 hover:shadow-gold-500/40"
            >
              Find Auctions
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#featured"
              className="inline-flex items-center gap-2.5 rounded-xl border-2 border-white/25 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
            >
              Browse Properties
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-14 max-w-xl"
          >
            <form
              onSubmit={handleSearch}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-2 backdrop-blur-md"
            >
              <Search className="ml-3 h-5 w-5 shrink-0 text-white/50" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try: 3 bedroom houses in Pretoria under R1.5m"
                className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-white/40 outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-navy-900 transition-colors hover:bg-gold-400"
              >
                Search
              </button>
            </form>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <ChevronDown className="h-6 w-6 animate-bounce text-white/40" />
      </motion.div>
    </section>
  );
}
