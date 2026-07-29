"use client";

import type { SavedSearchDTO } from "@/lib/dto/SavedSearchDTO";
import ActionMenu from "./ActionMenu";

type Props = {
  search: SavedSearchDTO;
  onOpen?: (id: string) => void;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggled?: () => void;
};

export default function SavedSearchCard({
  search,
  onOpen,
  onRename,
  onDelete,
  onToggled,
}: Props) {
  const filters = search.filters ?? {};

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{search.name}</h3>

          <p className="mt-1 text-sm text-slate-500">
            Created {new Date(search.createdAt).toLocaleDateString()}
          </p>
        </div>

        <StatusBadge active={search.active} />
      </div>

      <div className="mt-6 space-y-3">
        <Filter label="Province" value={filters.province} />

        <Filter label="Town" value={filters.town} />

        <Filter label="Suburb" value={filters.suburb} />

        <Filter label="Property Type" value={filters.propertyType} />

        <Filter label="Bedrooms" value={filters.minBedrooms} />

        <Filter
          label="Maximum Price"
          value={
            filters.maxPrice != null
              ? `R ${Number(filters.maxPrice).toLocaleString()}`
              : undefined
          }
        />
      </div>

      <div className="my-6 border-t" />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onOpen?.(search.id)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
        >
          Open
        </button>

        <button
          type="button"
          onClick={() => onRename?.(search.id)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
        >
          Rename
        </button>

        <ActionMenu
          id={search.id}
          active={search.active}
          onToggled={onToggled}
        />

        <button
          type="button"
          onClick={() => onDelete?.(search.id)}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        ● Active
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
      ● Paused
    </span>
  );
}

function Filter({
  label,
  value,
}: {
  label: string;
  value?: unknown;
}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>

      <span className="font-medium text-slate-900">{String(value)}</span>
    </div>
  );
}
