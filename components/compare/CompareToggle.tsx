"use client";

import { useEffect, useState } from "react";
import {
  getCompareIds,
  onCompareIdsChange,
  toggleCompareId,
} from "@/lib/compare/compareSelection";

export default function CompareToggle({ propertyId }: { propertyId: string }) {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    const sync = () => setSelected(getCompareIds().includes(propertyId));
    sync();
    return onCompareIdsChange(sync);
  }, [propertyId]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelected(toggleCompareId(propertyId).includes(propertyId));
      }}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
        selected
          ? "bg-navy-900 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:border-navy-900"
      }`}
    >
      {selected ? "In compare" : "Compare"}
    </button>
  );
}
