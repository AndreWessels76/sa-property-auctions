"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import AciNav from "../AciNav";

type DiscoverRow = {
  id: string;
  observationId: string;
  town: string | null;
  auctionDate: string | null;
  acquisitionPriority: string;
  outcome: string;
  salePrice: string;
  evidenceState: string;
};

type CompareRow = {
  id: string;
  title: string;
  location: string;
  propertyType: string | null;
  auctionDate: string | null;
  outcome: string;
  verifiedSalePrice: string;
  includedInCalculations?: boolean;
  evidenceQuality: string;
  comparableReady: boolean;
  marketReady: boolean;
  ddFindings: string | null;
};

export default function AciComparePage() {
  const [events, setEvents] = useState<DiscoverRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await fetch("/api/admin/aci/discover", { cache: "no-store" });
      const json = (await res.json()) as { events?: DiscoverRow[] };
      setEvents(json.events ?? []);
    });
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 6),
    );
  }

  function compare() {
    startTransition(async () => {
      const params = selected.map((id) => `id=${encodeURIComponent(id)}`).join("&");
      const res = await fetch(`/api/admin/aci/compare?${params}`, { cache: "no-store" });
      const json = (await res.json()) as { rows?: CompareRow[]; note?: string };
      setRows(json.rows ?? []);
      setNote(json.note ?? "");
    });
  }

  return (
    <div>
      <AciNav current="/admin/aci/compare" />
      <h1 className="text-3xl font-bold">Compare</h1>
      <p className="mt-1 text-slate-600">
        Up to 6 properties. Unverified sale prices are excluded from calculations.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || selected.length < 2}
          onClick={compare}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Compare selected ({selected.length})
        </button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {events.slice(0, 40).map((event) => (
          <label key={event.observationId} className="flex gap-3 rounded-xl border bg-white p-3 text-sm">
            <input
              type="checkbox"
              checked={selectedSet.has(event.id)}
              onChange={() => toggle(event.id)}
            />
            <span>
              <span className="font-medium">{event.town ?? "Unknown town"}</span>
              <span className="block text-slate-500">
                {event.acquisitionPriority} · {event.outcome} · {event.salePrice}
              </span>
            </span>
          </label>
        ))}
      </div>

      {note ? <p className="mt-4 text-sm text-slate-500">{note}</p> : null}

      {rows.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2">Property</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Verified sale price</th>
                <th className="px-3 py-2">Included</th>
                <th className="px-3 py-2">Quality</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link className="underline" href={`/admin/aci/research/${row.id}`}>
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.location || "—"}</td>
                  <td className="px-3 py-2">{row.propertyType ?? "—"}</td>
                  <td className="px-3 py-2">{row.auctionDate ?? "—"}</td>
                  <td className="px-3 py-2">{row.outcome}</td>
                  <td className="px-3 py-2">{row.verifiedSalePrice}</td>
                  <td className="px-3 py-2">{row.includedInCalculations ? "YES" : "NO"}</td>
                  <td className="px-3 py-2">{row.evidenceQuality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
