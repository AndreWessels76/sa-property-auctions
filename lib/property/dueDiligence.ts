import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import { buildDocumentLinks } from "@/lib/property/detailExperience";

/**
 * Due Diligence Centre — verified / unavailable / pending only.
 * Never fabricates zoning, rates, servitudes, or legal facts.
 */

export type DiligenceStatus = "verified" | "unavailable" | "pending_verification";

export type DiligenceItem = {
  key: string;
  label: string;
  status: DiligenceStatus;
  value: string | null;
  group:
    | "auction"
    | "title"
    | "land"
    | "building"
    | "municipality"
    | "occupation"
    | "legal"
    | "utilities"
    | "risk"
    | "documents";
};

export type DueDiligenceCentre = {
  propertyId: string;
  generatedAt: string;
  items: DiligenceItem[];
  outstanding: string[];
  summary: {
    verifiedCount: number;
    unavailableCount: number;
    pendingCount: number;
  };
};

function item(
  key: string,
  label: string,
  group: DiligenceItem["group"],
  value: string | null | undefined,
  pending = false,
): DiligenceItem {
  if (pending) {
    return { key, label, group, value: value?.trim() || null, status: "pending_verification" };
  }
  if (value == null || !String(value).trim()) {
    return { key, label, group, value: null, status: "unavailable" };
  }
  return { key, label, group, value: String(value).trim(), status: "verified" };
}

export function buildDueDiligenceCentre(property: PropertyDTO): DueDiligenceCentre {
  const pending = property.verification_state === "pending_verification";
  const docs = buildDocumentLinks(property);
  const ag = property.agricultural_details;

  const items: DiligenceItem[] = [
    item("auction_rules", "Auction rules / catalogue", "auction", property.catalogue_link || property.brochure_link, pending),
    item("terms", "Conditions of sale", "auction", property.terms_link, pending),
    item("registration", "Registration", "auction", property.registration_link, pending),
    item("deposit", "Deposit requirements", "auction", property.deposit_requirements, pending),
    item("description", "Property description", "title", property.description, pending),
    item("title_info", "Title information", "title", null),
    item("erf_size", "Land size (m²)", "land", property.erf_size != null ? String(property.erf_size) : null, pending),
    item("farm_hectares", "Agricultural hectares", "land", ag?.totalHectares != null ? String(ag.totalHectares) : null),
    item("municipality", "Municipality", "municipality", null),
    item("zoning", "Zoning", "municipality", null),
    item("rates", "Rates information", "municipality", null),
    item("ward", "Ward", "municipality", null),
    item("occupation", "Occupation status", "occupation", null),
    item("lease", "Lease information", "occupation", null),
    item("servitudes", "Servitudes", "legal", null),
    item("restrictions", "Known restrictions", "legal", null),
    item("building_size", "Building / floor size (m²)", "building", property.floor_size != null ? String(property.floor_size) : null, pending),
    item("utilities", "Utility availability", "utilities", null),
    item("risk_notices", "Risk notices", "risk", null),
    item("viewing", "Viewing information", "auction", property.viewing_information, pending),
  ];

  for (const d of docs) {
    items.push({
      key: `doc_${d.kind}`,
      label: d.label,
      group: "documents",
      value: d.href,
      status: "verified",
    });
  }

  if (docs.length === 0) {
    items.push({
      key: "documents_none",
      label: "Legal / auction documents",
      group: "documents",
      value: null,
      status: "unavailable",
    });
  }

  const outstanding = items
    .filter((i) => i.status !== "verified")
    .map((i) => i.label);

  return {
    propertyId: property.id,
    generatedAt: new Date().toISOString(),
    items,
    outstanding,
    summary: {
      verifiedCount: items.filter((i) => i.status === "verified").length,
      unavailableCount: items.filter((i) => i.status === "unavailable").length,
      pendingCount: items.filter((i) => i.status === "pending_verification").length,
    },
  };
}
