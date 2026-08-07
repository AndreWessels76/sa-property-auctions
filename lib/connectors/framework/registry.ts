import type { ConnectorListingEnvelope } from "@/lib/connectors/sourceRegistry";
import type { ExtractedListing } from "@/lib/acquisition/types";
import {
  FULL_CONNECTOR_CAPABILITIES,
  LICENSED_FEED_CAPABILITIES,
  type VerifiedAuctionConnector,
  type VerifiedConnectorDefinition,
  type ConnectorHealthStatus,
} from "@/lib/connectors/framework/types";
import { BIDDERS_CHOICE_CONNECTOR_ID } from "@/lib/connectors/biddersChoice/BiddersChoiceConnector";

function licensedPartner(
  def: Omit<VerifiedConnectorDefinition, "capabilities" | "health"> & {
    health?: ConnectorHealthStatus;
  },
): VerifiedAuctionConnector {
  const definition: VerifiedConnectorDefinition = {
    ...def,
    health: def.health ?? "awaiting_license",
    capabilities: LICENSED_FEED_CAPABILITIES,
  };

  return {
    definition,
    extractFromEnvelope(envelope: ConnectorListingEnvelope): ExtractedListing | null {
      if (envelope.connectorId !== definition.id && envelope.sourceId !== definition.id) {
        return null;
      }
      const p = envelope.payload;
      const title = typeof p.title === "string" ? p.title.trim() : "";
      const auctionDate =
        typeof p.auctionDate === "string"
          ? p.auctionDate
          : typeof p.auction_date === "string"
            ? p.auction_date
            : null;
      const province =
        typeof p.province === "string" ? p.province : null;
      const town =
        typeof p.town === "string"
          ? p.town
          : typeof p.suburb === "string"
            ? p.suburb
            : null;
      if (!title || !auctionDate || !province || !town) {
        // Never fabricate required identity fields
        return null;
      }
      return {
        externalListingId: envelope.externalListingId,
        sourceUrl: envelope.listingUrl ?? (typeof p.sourceUrl === "string" ? p.sourceUrl : ""),
        title,
        description: typeof p.description === "string" ? p.description : null,
        streetAddress: typeof p.streetAddress === "string" ? p.streetAddress : typeof p.address === "string" ? p.address : null,
        suburb: typeof p.suburb === "string" ? p.suburb : null,
        town,
        province,
        postalCode: typeof p.postalCode === "string" ? p.postalCode : null,
        latitude: typeof p.latitude === "number" ? p.latitude : null,
        longitude: typeof p.longitude === "number" ? p.longitude : null,
        propertyType: typeof p.propertyType === "string" ? p.propertyType : typeof p.property_type === "string" ? p.property_type : null,
        bedrooms: typeof p.bedrooms === "number" ? p.bedrooms : null,
        bathrooms: typeof p.bathrooms === "number" ? p.bathrooms : null,
        garages: typeof p.garages === "number" ? p.garages : null,
        landSize: typeof p.landSize === "number" ? p.landSize : typeof p.erf_size === "number" ? p.erf_size : null,
        buildingSize: typeof p.buildingSize === "number" ? p.buildingSize : null,
        estimatedValue: typeof p.estimatedValue === "number" ? p.estimatedValue : null,
        auctionPrice: typeof p.auctionPrice === "number" ? p.auctionPrice : null,
        auctionDate,
        auctionTime: typeof p.auctionTime === "string" ? p.auctionTime : null,
        auctionVenue: typeof p.auctionVenue === "string" ? p.auctionVenue : null,
        auctionAgency: typeof p.auctionAgency === "string" ? p.auctionAgency : definition.agencyName,
        agencyContact: typeof p.agencyContact === "string" ? p.agencyContact : null,
        agencyWebsite: typeof p.agencyWebsite === "string" ? p.agencyWebsite : definition.website ?? null,
        listingStatus: envelope.listingStatus ?? "upcoming",
        termsLink: typeof p.termsLink === "string" ? p.termsLink : null,
        brochureLink: typeof p.brochureLink === "string" ? p.brochureLink : null,
        features: typeof p.features === "string" ? p.features : null,
        viewingInformation: typeof p.viewingInformation === "string" ? p.viewingInformation : null,
        depositRequirements: typeof p.depositRequirements === "string" ? p.depositRequirements : null,
        registrationLink: typeof p.registrationLink === "string" ? p.registrationLink : null,
        imageUrls: Array.isArray(p.imageUrls)
          ? p.imageUrls.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
          : [],
        contentHash:
          typeof p.contentHash === "string" && p.contentHash.trim()
            ? p.contentHash
            : `envelope:${envelope.externalListingId}`,
      };
    },
    async healthCheck() {
      return {
        status: definition.health,
        detail: definition.notes,
      };
    },
  };
}

const biddersChoiceConnector: VerifiedAuctionConnector = {
  definition: {
    id: BIDDERS_CHOICE_CONNECTOR_ID,
    name: "Bidders Choice",
    version: "2.1.0",
    agencyName: "Bidders Choice",
    website: "https://www.bidderschoice.co.za",
    importMethods: ["licensed_feed", "csv", "manual"],
    enabled: true,
    health: "healthy",
    capabilities: FULL_CONNECTOR_CAPABILITIES,
    notes:
      "Production reference connector. Public fetch only when robots allow + BIDDERS_CHOICE_ALLOW_PUBLIC_FETCH.",
  },
  extractFromEnvelope(envelope) {
    return licensedPartner({
      id: BIDDERS_CHOICE_CONNECTOR_ID,
      name: "Bidders Choice",
      version: "2.1.0",
      agencyName: "Bidders Choice",
      website: "https://www.bidderschoice.co.za",
      importMethods: ["licensed_feed", "csv", "manual"],
      enabled: true,
      notes: "",
    }).extractFromEnvelope(envelope);
  },
  async healthCheck() {
    return {
      status: "healthy",
      detail: "Reference production connector operational",
    };
  },
};

export const VERIFIED_AUCTION_CONNECTORS: VerifiedAuctionConnector[] = [
  biddersChoiceConnector,
  licensedPartner({
    id: "high_street_auctions",
    name: "High Street Auctions",
    version: "2.0.0",
    agencyName: "High Street Auctions",
    website: "https://www.highstreetauctions.com",
    importMethods: ["licensed_feed", "csv", "manual"],
    enabled: true,
    notes: "Awaiting licensed feed / approved CSV — envelope ingestion ready.",
  }),
  licensedPartner({
    id: "claremart",
    name: "Claremart",
    version: "2.0.0",
    agencyName: "Claremart",
    website: "https://www.claremart.co.za",
    importMethods: ["licensed_feed", "csv", "manual"],
    enabled: true,
    notes: "Awaiting licensed feed / approved CSV — envelope ingestion ready.",
  }),
  licensedPartner({
    id: "in2assets",
    name: "In2Assets",
    version: "2.0.0",
    agencyName: "In2Assets",
    website: "https://www.in2assets.co.za",
    importMethods: ["licensed_feed", "csv", "manual"],
    enabled: true,
    notes: "Awaiting licensed feed / approved CSV — envelope ingestion ready.",
  }),
  licensedPartner({
    id: "park_village_auctions",
    name: "Park Village Auctions",
    version: "2.0.0",
    agencyName: "Park Village Auctions",
    website: "https://www.parkvillageauctions.co.za",
    importMethods: ["licensed_feed", "csv", "manual"],
    enabled: true,
    notes: "Awaiting licensed feed / approved CSV — envelope ingestion ready.",
  }),
  licensedPartner({
    id: "vans_auctioneers",
    name: "Van's Auctioneers",
    version: "2.0.0",
    agencyName: "Van's Auctioneers",
    website: "https://www.vansauctions.co.za",
    importMethods: ["licensed_feed", "csv", "manual"],
    enabled: true,
    notes: "Awaiting licensed feed / approved CSV — envelope ingestion ready.",
  }),
  licensedPartner({
    id: "broll_auctions",
    name: "Broll Auctions",
    version: "2.0.0",
    agencyName: "Broll Auctions",
    website: "https://www.broll.com",
    importMethods: ["licensed_feed", "csv", "manual"],
    enabled: true,
    notes: "Awaiting licensed feed / approved CSV — envelope ingestion ready.",
  }),
  licensedPartner({
    id: "bidx1_south_africa",
    name: "BidX1 South Africa",
    version: "2.0.0",
    agencyName: "BidX1 South Africa",
    website: "https://www.bidx1.com",
    importMethods: ["licensed_feed", "csv", "manual"],
    enabled: true,
    notes: "Awaiting licensed feed / approved CSV — envelope ingestion ready.",
  }),
];

export function getVerifiedConnector(id: string): VerifiedAuctionConnector | null {
  return VERIFIED_AUCTION_CONNECTORS.find((c) => c.definition.id === id) ?? null;
}

export function listVerifiedConnectors(): VerifiedAuctionConnector[] {
  return VERIFIED_AUCTION_CONNECTORS.filter((c) => c.definition.enabled);
}

export async function collectConnectorHealth() {
  const rows = [];
  for (const c of listVerifiedConnectors()) {
    const health = await c.healthCheck();
    rows.push({
      id: c.definition.id,
      name: c.definition.name,
      agencyName: c.definition.agencyName,
      version: c.definition.version,
      capabilities: c.definition.capabilities,
      ...health,
    });
  }
  return rows;
}
