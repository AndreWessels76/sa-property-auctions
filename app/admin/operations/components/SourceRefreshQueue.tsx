import { PropertyService } from "@/lib/services";
import SourceRefreshPanel from "./SourceRefreshPanel";

/**
 * Server wrapper — seeds eligible BC properties for the refresh queue.
 */
export default async function SourceRefreshQueue() {
  let properties: Awaited<ReturnType<typeof PropertyService.getProperties>> = [];
  try {
    properties = await PropertyService.getProperties();
  } catch {
    properties = [];
  }

  const initialRows = properties
    .filter((p) => {
      const blob = `${p.source ?? ""} ${p.source_name ?? ""} ${p.source_url ?? ""}`.toLowerCase();
      return Boolean(p.source_url) && blob.includes("bidder");
    })
    .slice(0, 25)
    .map((p) => ({
      propertyId: p.id,
      title: p.title,
      partner: p.source_name,
      sourceUrl: p.source_url,
      listingStatus: p.listing_status ?? p.status,
    }));

  return <SourceRefreshPanel initialRows={initialRows} />;
}
