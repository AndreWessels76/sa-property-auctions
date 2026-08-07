/**
 * Multi-source verified connector framework.
 * Every partner connector must implement this pipeline contract.
 * No scraping — licensed feed / CSV / manual / approved public fetch only.
 */

import type { ConnectorListingEnvelope } from "@/lib/connectors/sourceRegistry";
import type { ExtractedListing } from "@/lib/acquisition/types";

export type ConnectorPipelineStage =
  | "discover"
  | "download"
  | "extract"
  | "normalize"
  | "verify"
  | "deduplicate"
  | "identity_match"
  | "auction_event"
  | "provenance"
  | "audit";

export type ConnectorHealthStatus =
  | "healthy"
  | "degraded"
  | "failing"
  | "disabled"
  | "awaiting_license";

export type VerifiedConnectorCapabilities = {
  discovery: boolean;
  download: boolean;
  extraction: boolean;
  normalization: boolean;
  verification: boolean;
  duplicateDetection: boolean;
  propertyIdentityMatching: boolean;
  auctionEventCreation: boolean;
  provenance: boolean;
  auditLogging: boolean;
};

export type VerifiedConnectorDefinition = {
  id: string;
  name: string;
  version: string;
  agencyName: string;
  website?: string;
  importMethods: Array<"api" | "csv" | "manual" | "licensed_feed">;
  enabled: boolean;
  health: ConnectorHealthStatus;
  capabilities: VerifiedConnectorCapabilities;
  notes: string;
};

export type ConnectorRunMetrics = {
  connectorId: string;
  jobId: string;
  startedAt: string;
  finishedAt: string;
  discovered: number;
  downloaded: number;
  extracted: number;
  normalized: number;
  rejected: number;
  duplicates: number;
  identityLinked: number;
  mastersCreated: number;
  auctionEventsUpserted: number;
  errors: string[];
  stageLog: Array<{ stage: ConnectorPipelineStage; status: string; detail?: string }>;
};

export const FULL_CONNECTOR_CAPABILITIES: VerifiedConnectorCapabilities = {
  discovery: true,
  download: true,
  extraction: true,
  normalization: true,
  verification: true,
  duplicateDetection: true,
  propertyIdentityMatching: true,
  auctionEventCreation: true,
  provenance: true,
  auditLogging: true,
};

export const LICENSED_FEED_CAPABILITIES: VerifiedConnectorCapabilities = {
  discovery: false,
  download: true,
  extraction: true,
  normalization: true,
  verification: true,
  duplicateDetection: true,
  propertyIdentityMatching: true,
  auctionEventCreation: true,
  provenance: true,
  auditLogging: true,
};

/**
 * Partner connectors ingest licensed envelopes — never invent listings.
 */
export interface VerifiedAuctionConnector {
  definition: VerifiedConnectorDefinition;
  /**
   * Optional discovery (sitemap/API). Return empty when licensed-feed only.
   */
  discover?(): Promise<string[]>;
  /**
   * Map a licensed payload envelope into ExtractedListing.
   * Must not fabricate required fields.
   */
  extractFromEnvelope(envelope: ConnectorListingEnvelope): ExtractedListing | null;
  /**
   * Health probe — does not fetch third-party pages unless allowed.
   */
  healthCheck(): Promise<{ status: ConnectorHealthStatus; detail: string }>;
}

export function emptyRunMetrics(
  connectorId: string,
  jobId: string,
): ConnectorRunMetrics {
  const now = new Date().toISOString();
  return {
    connectorId,
    jobId,
    startedAt: now,
    finishedAt: now,
    discovered: 0,
    downloaded: 0,
    extracted: 0,
    normalized: 0,
    rejected: 0,
    duplicates: 0,
    identityLinked: 0,
    mastersCreated: 0,
    auctionEventsUpserted: 0,
    errors: [],
    stageLog: [],
  };
}
