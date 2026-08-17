"use client";

import { useEffect, useState, useTransition } from "react";
import AciNav from "../AciNav";
import AciPropertyIntelligenceCard from "../AciPropertyIntelligenceCard";
import { useAciWatchlist } from "../AciWatchButton";

type Row = {
  id: string;
  observationId: string;
  title: string;
  address: string | null;
  town: string | null;
  suburb: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garages: number | null;
  auctionDate: string | null;
  source: string | null;
  sourceUrl: string | null;
  evidenceBadge: string;
  outcomeState: string;
  salePriceState: string;
  quality: string | null;
  lastEvidenceUpdate: string | null;
};

export default function AciWatchlistPage() {
  const { ids } = useAciWatchlist();
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await fetch("/api/admin/aci/workspace?pageSize=100", { cache: "no-store" });
      const json = (await res.json()) as { rows?: Row[] };
      setRows(json.rows ?? []);
    });
  }, []);

  const watched = rows.filter((row) => ids.includes(row.id) || ids.includes(row.observationId));

  return (
    <div>
      <AciNav current="/admin/aci/watchlist" />
      <h1 className="text-3xl font-bold">Watchlist</h1>
      <p className="mt-1 text-slate-600">
        Operator WATCH marks are stored locally. No crawler. Authorised acquisition only.
      </p>
      {pending ? <p className="mt-4 text-sm">Loading…</p> : null}
      {watched.length === 0 ? (
        <p className="mt-6 rounded-2xl border bg-white p-6">INSUFFICIENT_DATA — nothing on watch.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {watched.map((row) => (
            <AciPropertyIntelligenceCard key={row.observationId} card={row} />
          ))}
        </div>
      )}
    </div>
  );
}
