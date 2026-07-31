"use client";

import { motion } from "framer-motion";
import { Building2, Clock, MapPinned, RefreshCw } from "lucide-react";

const stats = [
  {
    label: "Catalogue",
    display: "Growing",
    description: "South African auction properties",
    icon: Building2,
  },
  {
    label: "Coverage",
    display: "9 provinces",
    description: "Expanding town-level coverage",
    icon: MapPinned,
  },
  {
    label: "Updates",
    display: "Regular",
    description: "New listings added over time",
    icon: RefreshCw,
  },
  {
    label: "Access",
    display: "24/7",
    description: "Browse whenever you need",
    icon: Clock,
  },
];

export default function Statistics() {
  return (
    <section className="relative z-10 -mt-16 px-4 sm:-mt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:p-2">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                className="flex items-start gap-4 rounded-xl px-4 py-5 lg:px-6"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-navy-900">
                    {stat.display}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {stat.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
