"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFavourites } from "@/lib/favourites";
import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

export default function LocalFavouritesPanel() {
  const [items, setItems] = useState<PropertyDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ids = getFavourites();
    if (!ids.length) {
      setLoaded(true);
      return;
    }
    void fetch(`/api/properties?ids=${encodeURIComponent(ids.slice(0, 40).join(","))}`)
      .then((r) => r.json())
      .then((json) => {
        setItems(Array.isArray(json.data) ? json.data : []);
      })
      .finally(() => setLoaded(true));
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-navy-900">Device favourites</h2>
      <p className="mt-1 text-xs text-slate-500">
        Hearted listings on this browser. Public catalogue hides expired rows.
      </p>
      {!loaded ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No device favourites in the public catalogue.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/properties/${p.id}`} className="font-medium underline">
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
