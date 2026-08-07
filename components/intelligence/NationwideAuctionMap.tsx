"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_CONFIG } from "@/lib/maps/mapConfig";
import { MAP_THEMES } from "@/lib/maps/mapStyles";

export type AuctionMapPoint = {
  id: string;
  title: string;
  town: string | null;
  province: string | null;
  latitude: number;
  longitude: number;
  classification: string;
  listing_status: string | null;
  auction_agency: string | null;
};

const LAYERS = [
  { key: "all", label: "All upcoming / live" },
  { key: "Residential", label: "Residential" },
  { key: "Commercial", label: "Commercial" },
  { key: "Industrial", label: "Industrial" },
  { key: "Farm", label: "Agricultural" },
  { key: "Vacant Land", label: "Vacant Land" },
] as const;

type Props = {
  points: AuctionMapPoint[];
};

export default function NationwideAuctionMap({ points }: Props) {
  const [layer, setLayer] = useState<(typeof LAYERS)[number]["key"]>("all");

  const filtered = useMemo(() => {
    if (layer === "all") return points;
    return points.filter((p) => p.classification === layer);
  }, [points, layer]);

  const center = useMemo(() => {
    if (filtered.length === 0) {
      return { latitude: -28.5, longitude: 24.7, zoom: 5 };
    }
    const lat =
      filtered.reduce((s, p) => s + p.latitude, 0) / filtered.length;
    const lng =
      filtered.reduce((s, p) => s + p.longitude, 0) / filtered.length;
    return {
      latitude: lat,
      longitude: lng,
      zoom: filtered.length === 1 ? 12 : 6,
    };
  }, [filtered]);

  const mapStyle = MAP_THEMES.street ?? MAP_CONFIG.style;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {LAYERS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLayer(l.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                layer === l.key
                  ? "bg-navy-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Street basemap · satellite reserved when licensed tiles available
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-slate-100">
        <div className="h-[480px] w-full">
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-600">
              No verified listings with coordinates for this layer yet.
            </div>
          ) : (
            <Map
              initialViewState={{
                latitude: center.latitude,
                longitude: center.longitude,
                zoom: center.zoom,
              }}
              mapStyle={mapStyle}
              style={{ width: "100%", height: "100%" }}
            >
              <NavigationControl position="top-right" />
              {filtered.map((p) => (
                <Marker
                  key={p.id}
                  latitude={p.latitude}
                  longitude={p.longitude}
                  anchor="bottom"
                >
                  <Link
                    href={`/properties/${p.id}`}
                    title={p.title}
                    className="block h-3 w-3 rounded-full bg-gold-500 ring-2 ring-navy-900"
                  />
                </Marker>
              ))}
            </Map>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Showing {filtered.length} verified point
        {filtered.length === 1 ? "" : "s"} · cluster radius reserved for denser
        catalogues · municipality boundaries reserved
      </p>

      <ul className="grid gap-2 sm:grid-cols-2">
        {filtered.slice(0, 12).map((p) => (
          <li key={p.id}>
            <Link
              href={`/properties/${p.id}`}
              className="block rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm hover:border-gold-400"
            >
              <span className="font-semibold text-navy-900">{p.title}</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {[p.town, p.province, p.classification].filter(Boolean).join(" · ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
