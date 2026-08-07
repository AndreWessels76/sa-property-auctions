import { NextResponse } from "next/server";
import {
  buildCalendarItems,
  filterCalendarItems,
  toIcsCalendar,
} from "@/lib/property/auctionCalendar";
import { PropertyService } from "@/lib/services";
import { resolveAuctionAgency } from "@/lib/auction/agencyDisplay";

export const revalidate = 300;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://sa-property-auctions.vercel.app";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
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
    province: searchParams.get("province") ?? undefined,
    town: searchParams.get("town") ?? undefined,
    agency: searchParams.get("agency") ?? undefined,
    propertyType: searchParams.get("type") ?? undefined,
  });

  const body = toIcsCalendar(items);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sa-property-auctions.ics"',
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
