import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  buildCalendarItems,
  filterCalendarItems,
} from "@/lib/property/auctionCalendar";
import { PropertyService } from "@/lib/services";
import { resolveAuctionAgency } from "@/lib/auction/agencyDisplay";
import { formatAuctionDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Auction Calendar | SA Property Auctions",
  description:
    "Professional auction calendar for verified upcoming and live South African property auctions.",
};

export const revalidate = 300;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://sa-property-auctions.vercel.app";

type SearchParams = Promise<{
  view?: string;
  province?: string;
  town?: string;
  agency?: string;
  type?: string;
}>;

export default async function AuctionCalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const properties = await PropertyService.getProperties();
  const all = buildCalendarItems(
    properties.map((p) => ({
      ...p,
      auction_agency:
        p.auction_agency || resolveAuctionAgency(p.source).name || p.source_name,
    })),
    siteUrl,
  );
  const items = filterCalendarItems(all, {
    province: sp.province,
    town: sp.town,
    agency: sp.agency,
    propertyType: sp.type,
  });

  const view = sp.view ?? "agenda";
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const monthEnd = new Date();
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  const monthEndStr = monthEnd.toISOString().slice(0, 10);

  const scoped =
    view === "today"
      ? items.filter((i) => i.auctionDate.slice(0, 10) === today)
      : view === "week"
        ? items.filter((i) => {
            const d = i.auctionDate.slice(0, 10);
            return d >= today && d <= weekEndStr;
          })
        : view === "month"
          ? items.filter((i) => {
              const d = i.auctionDate.slice(0, 10);
              return d >= today && d <= monthEndStr;
            })
          : items;

  const provinces = Array.from(
    new Set(all.map((i) => i.province).filter(Boolean) as string[]),
  ).sort();

  const icsQuery = new URLSearchParams();
  if (sp.province) icsQuery.set("province", sp.province);
  if (sp.town) icsQuery.set("town", sp.town);
  if (sp.agency) icsQuery.set("agency", sp.agency);
  if (sp.type) icsQuery.set("type", sp.type);
  const icsHref = `/api/calendar/ics${icsQuery.toString() ? `?${icsQuery}` : ""}`;

  return (
    <>
      <Header />
      <main className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
              Auction calendar
            </p>
            <h1 className="mt-1 text-3xl font-bold text-navy-900">
              Professional Auction Calendar
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Verified upcoming and live auctions only. Export ICS for Outlook,
              Google Calendar, or subscription feeds.
            </p>
          </header>

          <div className="mb-6 flex flex-wrap gap-2">
            {(
              [
                ["agenda", "Agenda"],
                ["today", "Today"],
                ["week", "Week"],
                ["month", "Month"],
                ["timeline", "Timeline"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                href={`/calendar?view=${key}${sp.province ? `&province=${encodeURIComponent(sp.province)}` : ""}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  view === key
                    ? "bg-navy-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {label}
              </Link>
            ))}
            <a
              href={icsHref}
              className="rounded-lg border border-gold-500/40 bg-gold-50 px-3 py-1.5 text-xs font-semibold text-navy-900"
            >
              Export ICS
            </a>
          </div>

          <form
            method="get"
            className="mb-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4"
          >
            <input type="hidden" name="view" value={view} />
            <label className="text-xs">
              <span className="font-semibold text-slate-500">Province</span>
              <select
                name="province"
                defaultValue={sp.province ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              >
                <option value="">All</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="font-semibold text-slate-500">Town</span>
              <input
                name="town"
                defaultValue={sp.town ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                placeholder="Filter town"
              />
            </label>
            <label className="text-xs">
              <span className="font-semibold text-slate-500">Agency</span>
              <input
                name="agency"
                defaultValue={sp.agency ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                placeholder="Filter agency"
              />
            </label>
            <label className="text-xs">
              <span className="font-semibold text-slate-500">Property type</span>
              <input
                name="type"
                defaultValue={sp.type ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                placeholder="e.g. Farm"
              />
            </label>
            <button
              type="submit"
              className="sm:col-span-4 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white sm:w-fit"
            >
              Apply filters
            </button>
          </form>

          {scoped.length === 0 ? (
            <p className="text-sm text-slate-600">
              No verified auctions match this view or filter set.
            </p>
          ) : (
            <ul
              className={
                view === "timeline"
                  ? "relative space-y-4 border-l-2 border-slate-200 pl-6"
                  : "space-y-3"
              }
            >
              {scoped.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {formatAuctionDate(item.auctionDate)}
                    {item.auctionTime ? ` · ${item.auctionTime}` : ""}
                  </p>
                  <Link
                    href={`/properties/${item.id}`}
                    className="mt-1 block text-base font-semibold text-navy-900 hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-600">
                    {[item.town, item.province, item.agency, item.propertyType]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-8 text-xs text-slate-500">
            Subscribe: use the ICS URL in Outlook / Google Calendar. Premium calendar
            sync reserved for authenticated premium accounts.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
