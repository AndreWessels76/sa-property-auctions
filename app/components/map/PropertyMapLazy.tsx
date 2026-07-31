"use client";

import dynamic from "next/dynamic";
import type { ComparableMapProperty } from "@/lib/maps/comparableTypes";

const PropertyMap = dynamic(
  () => import("@/app/components/map/PropertyMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Loading map…
      </div>
    ),
  },
);

type Props = {
  latitude: number;
  longitude: number;
  comparables?: ComparableMapProperty[];
};

export default function PropertyMapLazy(props: Props) {
  return <PropertyMap {...props} />;
}
