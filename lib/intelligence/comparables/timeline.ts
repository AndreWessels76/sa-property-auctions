/**
 * Deterministic property event timeline — evidence-backed stages only.
 */

import type { HistoricalEventObservation } from "@/lib/intelligence/historical/types";
import type { PropertyTimelineStage } from "./types";
import { isCurrentCatalogueState } from "@/lib/intelligence/historical/eventClassification";

export function buildPropertyTimeline(
  observations: HistoricalEventObservation[],
): PropertyTimelineStage[] {
  const stages: PropertyTimelineStage[] = [];
  const sorted = [...observations].sort((a, b) =>
    (a.auctionDate ?? "").localeCompare(b.auctionDate ?? ""),
  );

  if (sorted.length === 0) return stages;

  const hasUpcoming = sorted.some((o) => isCurrentCatalogueState(o.state));
  if (hasUpcoming) {
    stages.push({
      stage: "listed",
      date: sorted.find((o) => isCurrentCatalogueState(o.state))?.auctionDate ?? null,
      evidence: "Current catalogue listing with upcoming/live auction state",
      supported: true,
    });
    stages.push({
      stage: "auction_scheduled",
      date: sorted.find((o) => o.state === "upcoming" || o.state === "live")?.auctionDate ?? null,
      evidence: "Verified auction date on Auction Event or listing",
      supported: true,
    });
  }

  for (const row of sorted.filter((o) => !isCurrentCatalogueState(o.state))) {
    if (row.auctionDate) {
      stages.push({
        stage: "auction_occurred",
        date: row.auctionDate,
        evidence: `Historical auction event (${row.sourceUnit})`,
        supported: true,
      });
    }
    if (row.state === "sold") {
      stages.push({
        stage: "sold",
        date: row.auctionDate,
        evidence: "Verified sold outcome on Auction Event",
        supported: true,
      });
    } else if (row.state === "withdrawn") {
      stages.push({
        stage: "withdrawn",
        date: row.auctionDate,
        evidence: "Verified withdrawn outcome",
        supported: true,
      });
    } else if (row.state === "cancelled") {
      stages.push({
        stage: "cancelled",
        date: row.auctionDate,
        evidence: "Verified cancelled outcome",
        supported: true,
      });
    } else if (row.state === "expired") {
      stages.push({
        stage: "expired",
        date: row.auctionDate,
        evidence: "Expired auction — not treated as sold",
        supported: true,
      });
    }
  }

  const soldCount = sorted.filter((o) => o.state === "sold").length;
  if (soldCount >= 2) {
    stages.push({
      stage: "relisted",
      date: sorted[sorted.length - 1]?.auctionDate ?? null,
      evidence: "Multiple auction events on Property Master",
      supported: true,
    });
  }

  return stages;
}
