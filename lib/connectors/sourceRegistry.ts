/**
 * Licensed / partner source connector registry.
 * Framework only — no scraping. Connectors may be CSV, API, or manual upload.
 */

export type SourceConnectorDefinition = {
  id: string;
  name: string;
  category: "auctioneer" | "sheriff" | "bank" | "partner_csv" | "manual";
  website?: string;
  importMethods: Array<"api" | "csv" | "manual" | "licensed_feed">;
  connectorVersion: string;
  enabled: boolean;
  notes: string;
};

export const SOURCE_CONNECTORS: SourceConnectorDefinition[] = [
  {
    id: "high_street_auctions",
    name: "High Street Auctions",
    category: "auctioneer",
    website: "https://www.highstreetauctions.com",
    importMethods: ["licensed_feed", "csv", "manual"],
    connectorVersion: "2.0.0",
    enabled: true,
    notes: "Requires licensed feed or approved CSV. No scraping.",
  },
  {
    id: "bidders_choice",
    name: "Bidders Choice",
    category: "auctioneer",
    website: "https://www.bidderschoice.co.za",
    importMethods: ["licensed_feed", "csv", "manual"],
    connectorVersion: "2.1.0",
    enabled: true,
    notes:
      "Preferred: licensed feed/CSV/manual. Public fetch only after robots allow + BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH. No prohibited scraping.",
  },
  {
    id: "claremart",
    name: "Claremart",
    category: "auctioneer",
    website: "https://www.claremart.co.za",
    importMethods: ["licensed_feed", "csv", "manual"],
    connectorVersion: "2.0.0",
    enabled: true,
    notes: "Requires licensed feed or approved CSV. No scraping.",
  },
  {
    id: "in2assets",
    name: "In2Assets",
    category: "auctioneer",
    website: "https://www.in2assets.co.za",
    importMethods: ["licensed_feed", "csv", "manual"],
    connectorVersion: "2.0.0",
    enabled: true,
    notes: "Requires licensed feed or approved CSV. No scraping.",
  },
  {
    id: "park_village_auctions",
    name: "Park Village Auctions",
    category: "auctioneer",
    website: "https://www.parkvillageauctions.co.za",
    importMethods: ["licensed_feed", "csv", "manual"],
    connectorVersion: "2.0.0",
    enabled: true,
    notes: "Requires licensed feed or approved CSV. No scraping.",
  },
  {
    id: "vans_auctioneers",
    name: "Van's Auctioneers",
    category: "auctioneer",
    website: "https://www.vansauctions.co.za",
    importMethods: ["licensed_feed", "csv", "manual"],
    connectorVersion: "2.0.0",
    enabled: true,
    notes: "Requires licensed feed or approved CSV. No scraping.",
  },
  {
    id: "broll_auctions",
    name: "Broll Auctions",
    category: "auctioneer",
    website: "https://www.broll.com",
    importMethods: ["licensed_feed", "csv", "manual"],
    connectorVersion: "2.0.0",
    enabled: true,
    notes: "Requires licensed feed or approved CSV. No scraping.",
  },
  {
    id: "bidx1_south_africa",
    name: "BidX1 South Africa",
    category: "auctioneer",
    website: "https://www.bidx1.com",
    importMethods: ["licensed_feed", "csv", "manual"],
    connectorVersion: "2.0.0",
    enabled: true,
    notes: "Requires licensed feed or approved CSV. No scraping.",
  },
  {
    id: "sheriff_auctions",
    name: "Sheriff Auctions",
    category: "sheriff",
    importMethods: ["licensed_feed", "csv", "manual"],
    connectorVersion: "2.0.0",
    enabled: true,
    notes: "Official/licensed sheriff lists only. Respect jurisdiction ToS.",
  },
  {
    id: "bank_auction_portals",
    name: "Bank Auction Portals",
    category: "bank",
    importMethods: ["licensed_feed", "csv", "manual"],
    connectorVersion: "2.0.0",
    enabled: true,
    notes: "Absa / FNB / Nedbank / Standard Bank EasySell via contract only.",
  },
];

export type ConnectorListingEnvelope = {
  sourceId: string;
  externalListingId: string;
  listingUrl?: string | null;
  importDate: string;
  verificationDate?: string | null;
  updateDate?: string | null;
  listingStatus?: string | null;
  importMethod: "api" | "csv" | "manual" | "licensed_feed";
  sourceVersion?: string | null;
  connectorVersion: string;
  connectorId: string;
  payload: Record<string, unknown>;
};

export function getConnector(id: string): SourceConnectorDefinition | null {
  return SOURCE_CONNECTORS.find((c) => c.id === id) ?? null;
}

export function listEnabledConnectors(): SourceConnectorDefinition[] {
  return SOURCE_CONNECTORS.filter((c) => c.enabled);
}
