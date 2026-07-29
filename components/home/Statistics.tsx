"use client";

import { motion } from "framer-motion";
import { Building2, Clock, Gavel, MapPinned } from "lucide-react";
import CountUp from "@/components/ui/CountUp";

const stats = [
  {
    value: 10000,
    suffix: "+",
    label: "Properties",
    icon: Building2,
    description: "Listed nationwide",
    isNumeric: true,
  },
  {
    value: 9,
    suffix: "",
    label: "Provinces",
    icon: MapPinned,
    description: "Full SA coverage",
    isNumeric: true,
  },
  {
    value: 500,
    suffix: "+",
    label: "Auctions Monthly",
    icon: Gavel,
    description: "New every month",
    isNumeric: true,
  },
  {
    value: 0,
    display: "24/7",
    label: "Monitoring",
    icon: Clock,
    description: "Always up to date",
    isNumeric: false,
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function Statistics() {
  return (
    <section className="relative z-10 -mt-20 px-4 sm:px-6 lg:px-8">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-7 shadow-xl shadow-slate-200/40 transition-all duration-500 hover:-translate-y-1 hover:border-gold-400/50 hover:shadow-2xl"
          >
            <div className="animate-shimmer absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="relative">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 transition-all duration-300 group-hover:bg-gold-500">
                <stat.icon className="h-5 w-5 text-gold-400 transition-colors group-hover:text-navy-950" />
              </div>
              <p className="text-4xl font-bold tracking-tight text-navy-900">
                {stat.isNumeric ? (
                  <CountUp end={stat.value} suffix={stat.suffix} />
                ) : (
                  stat.display
                )}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-800">
                {stat.label}
              </p>
              <p className="mt-1 text-sm text-slate-500">{stat.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
