/**
 * Scheduled job definitions for DATA FOUNDATION 2.0.
 * Wired via /api/cron/data-foundation — require CRON_SECRET in production.
 */

export type ScheduledJobCadence = "daily" | "weekly" | "monthly";

export type ScheduledJobDefinition = {
  id: string;
  cadence: ScheduledJobCadence;
  description: string;
  handler: "verify_listings" | "update_status" | "refresh_metadata" | "quality_audit" | "broken_links" | "expired_listings" | "archive_old" | "recalculate_quality";
};

export const DATA_FOUNDATION_JOBS: ScheduledJobDefinition[] = [
  {
    id: "daily_verify_listings",
    cadence: "daily",
    description: "Verify listings pending source confirmation",
    handler: "verify_listings",
  },
  {
    id: "daily_update_status",
    cadence: "daily",
    description: "Update listing lifecycle from auction dates",
    handler: "update_status",
  },
  {
    id: "daily_refresh_metadata",
    cadence: "daily",
    description: "Refresh provenance/metadata timestamps",
    handler: "refresh_metadata",
  },
  {
    id: "weekly_quality_audit",
    cadence: "weekly",
    description: "Quality audit across catalogue",
    handler: "quality_audit",
  },
  {
    id: "weekly_broken_links",
    cadence: "weekly",
    description: "Flag broken source/image URLs",
    handler: "broken_links",
  },
  {
    id: "weekly_expired_listings",
    cadence: "weekly",
    description: "Mark expired auctions",
    handler: "expired_listings",
  },
  {
    id: "monthly_archive_old",
    cadence: "monthly",
    description: "Archive old completed listings",
    handler: "archive_old",
  },
  {
    id: "monthly_recalculate_quality",
    cadence: "monthly",
    description: "Recalculate multi-dimensional quality scores",
    handler: "recalculate_quality",
  },
];

export function jobsForCadence(
  cadence: ScheduledJobCadence,
): ScheduledJobDefinition[] {
  return DATA_FOUNDATION_JOBS.filter((j) => j.cadence === cadence);
}
