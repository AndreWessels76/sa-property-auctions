"use client";

import Link from "next/link";
import type { SavedSearchDTO } from "@/lib/dto/SavedSearchDTO";

type Props = {
  searches: SavedSearchDTO[];
};

export default function SavedSearchWidget({
  searches,
}: Props) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">

      <div className="mb-5 flex items-center justify-between">

        <h2 className="text-xl font-semibold">
          Saved Searches
        </h2>

        <Link
          href="/dashboard/save-searches"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          View All
        </Link>

      </div>

      {searches.length === 0 ? (
        <p className="text-slate-500">
          No saved searches yet.
        </p>
      ) : (
        <div className="space-y-4">
          {searches.slice(0, 5).map((search) => (
            <div
              key={search.id}
              className="flex items-center justify-between"
            >
              <span className="font-medium">
                {search.name}
              </span>

              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  search.active
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {search.active ? "Active" : "Paused"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}