"use client";

import { useState } from "react";
import CreateSearchDialog from "@/app/dashboard/save-searches/components/CreateSearchDialog";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

export default function SaveSearchButton({
  filters,
}: {
  filters: PropertySearchDTO;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-black px-5 py-3 text-white hover:bg-slate-800"
      >
        💾 Save Search
      </button>

      <CreateSearchDialog
        open={open}
        onClose={() => setOpen(false)}
        filters={filters}
      />
    </>
  );
}
