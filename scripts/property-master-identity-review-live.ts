/**
 * Property Master Identity Review 1.0 — read-only evidence gathering.
 * Writes PROPERTY_MASTER_IDENTITY_REVIEW10_LIVE.json
 */
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { enrichVerifiedListing } from "../lib/platform/dataEnrichment";
import { fingerprintInputFromProperty, computePropertyFingerprint } from "../lib/identity";
import { classificationFromProperty } from "../lib/identity/fromProperty";
import { computeEventFingerprint } from "../lib/backfill/eventFingerprint";

function loadEnv() {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && !process.env[m[1]!.trim()]) {
      process.env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  }
}

const REVIEW_CASES = [
  {
    caseId: "CASE_1",
    masterId: "852a132f-ff3c-4ca0-a324-a5dfd4d54ee4",
    propertyIds: [
      "f3f47cca-73c8-420c-9144-146b0f4c9aba",
      "b8eb4cb5-d9c1-46de-a338-266357d3d8f9",
    ],
  },
  {
    caseId: "CASE_2",
    masterId: "7eaf47fc-4468-4902-96f5-1ddcf6435f51",
    propertyIds: [
      "78e0ab0e-0b33-4a2a-a9e3-eda3677c6209",
      "ec3e90f0-5d86-4b32-9b20-4dee592654c3",
    ],
  },
];

function normalize(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value).trim();
}

function compareField(
  label: string,
  a: unknown,
  b: unknown,
): { field: string; listing1: string | null; listing2: string | null; match: boolean } {
  const v1 = normalize(a);
  const v2 = normalize(b);
  return {
    field: label,
    listing1: v1,
    listing2: v2,
    match: v1 != null && v2 != null && v1.toLowerCase() === v2.toLowerCase(),
  };
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const db = createClient(url, key, { auth: { persistSession: false } });

  const allPropertyIds = REVIEW_CASES.flatMap((c) => c.propertyIds);
  const { data: properties } = await db.from("properties").select("*").in("id", allPropertyIds);
  const { data: masters } = await db
    .from("property_masters")
    .select("*")
    .in("id", REVIEW_CASES.map((c) => c.masterId));
  const { data: events } = await db
    .from("auction_events")
    .select("*")
    .in("listing_property_id", allPropertyIds);

  type EventRow = NonNullable<typeof events>[number];

  const propById = new Map((properties ?? []).map((p) => [p.id, p]));
  const masterById = new Map((masters ?? []).map((m) => [m.id, m]));
  const eventsByListing = new Map<string, EventRow[]>();
  for (const e of events ?? []) {
    if (!e.listing_property_id) continue;
    const arr = eventsByListing.get(e.listing_property_id) ?? [];
    arr.push(e);
    eventsByListing.set(e.listing_property_id, arr);
  }

  function buildListingEvidence(propertyId: string) {
    const p = propById.get(propertyId);
    if (!p) return null;

    const enriched = enrichVerifiedListing(p);
    const fpInput = fingerprintInputFromProperty({
      ...p,
      farm_name: enriched.address.farmName,
      erf_number: enriched.address.erfNumber,
      town: enriched.address.town ?? p.town,
    });
    const fp = computePropertyFingerprint(fpInput);
    const classification = classificationFromProperty(p);
    const listingEvents = eventsByListing.get(propertyId) ?? [];

    return {
      propertyId: p.id,
      title: p.title,
      normalizedAddress: enriched.address.street ?? p.address ?? p.street_address,
      street: enriched.address.street ?? p.street_address,
      suburb: p.suburb ?? enriched.address.suburb,
      town: enriched.address.town ?? p.town,
      province: enriched.address.province ?? p.province,
      municipality: p.municipality ?? enriched.address.municipality,
      farmName: enriched.address.farmName ?? p.farm_name,
      farmNumber: enriched.address.farmNumber ?? p.farm_number,
      erf: enriched.address.erfNumber ?? p.erf_number,
      portion: enriched.address.portion ?? p.portion_number,
      propertyType: classification.propertyType ?? p.property_type,
      propertyTypeConfidence: classification.confidence,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      landSize: p.erf_size ?? fpInput.landSizeSqm,
      buildingSize: p.building_size,
      agriculturalHectares: p.agricultural_hectares,
      latitude: p.latitude,
      longitude: p.longitude,
      sourceUrl: p.source_url,
      sourceAgency: p.source_name ?? p.auction_agency,
      auctionDate: p.auction_date,
      connectorId: p.connector_id,
      externalListingId: p.external_listing_id,
      verificationState: p.verification_state,
      listingStatus: p.listing_status,
      propertyMasterId: p.property_master_id,
      fingerprint: fp.fingerprint,
      fingerprintComponents: fp.components,
      externalReferences: fpInput.externalReferences,
      provenance: {
        dataClassification: p.data_classification,
        verificationState: p.verification_state,
        sourceName: p.source_name,
      },
      auctionEvents: listingEvents.map((e) => ({
        id: e.id,
        propertyMasterId: e.property_master_id,
        auctionDate: e.auction_date,
        agency: e.agency,
        sourceUrl: e.source_url,
        externalListingId: e.external_listing_id,
        eventFingerprint: computeEventFingerprint({
          propertyMasterId: e.property_master_id,
          auctionDate: e.auction_date,
          connectorId: e.connector_id,
          externalEventId: e.external_listing_id,
          agency: e.agency,
          sourceUrl: e.source_url,
        }),
      })),
    };
  }

  function analyzeCase(caseDef: (typeof REVIEW_CASES)[number]) {
    const master = masterById.get(caseDef.masterId);
    const [id1, id2] = caseDef.propertyIds;
    const l1 = buildListingEvidence(id1);
    const l2 = buildListingEvidence(id2);
    if (!l1 || !l2) throw new Error(`Missing listing for ${caseDef.caseId}`);

    const fieldComparisons = [
      compareField("normalizedAddress", l1.normalizedAddress, l2.normalizedAddress),
      compareField("street", l1.street, l2.street),
      compareField("suburb", l1.suburb, l2.suburb),
      compareField("town", l1.town, l2.town),
      compareField("province", l1.province, l2.province),
      compareField("municipality", l1.municipality, l2.municipality),
      compareField("farmName", l1.farmName, l2.farmName),
      compareField("farmNumber", l1.farmNumber, l2.farmNumber),
      compareField("erf", l1.erf, l2.erf),
      compareField("portion", l1.portion, l2.portion),
      compareField("propertyType", l1.propertyType, l2.propertyType),
      compareField("bedrooms", l1.bedrooms, l2.bedrooms),
      compareField("bathrooms", l1.bathrooms, l2.bathrooms),
      compareField("landSize", l1.landSize, l2.landSize),
      compareField("buildingSize", l1.buildingSize, l2.buildingSize),
      compareField("agriculturalHectares", l1.agriculturalHectares, l2.agriculturalHectares),
      compareField("sourceUrl", l1.sourceUrl, l2.sourceUrl),
      compareField("sourceAgency", l1.sourceAgency, l2.sourceAgency),
      compareField("connectorId", l1.connectorId, l2.connectorId),
      compareField("externalListingId", l1.externalListingId, l2.externalListingId),
      compareField("fingerprint", l1.fingerprint, l2.fingerprint),
      compareField("latitude", l1.latitude, l2.latitude),
      compareField("longitude", l1.longitude, l2.longitude),
    ];

    const matchingEvidence = fieldComparisons
      .filter((f) => f.match)
      .map((f) => `${f.field}: ${f.listing1}`);

    const conflictingEvidence = fieldComparisons
      .filter((f) => {
        if (f.match) return false;
        if (f.listing1 == null && f.listing2 == null) return false;
        return true;
      })
      .map((f) => ({
        field: f.field,
        listing1: f.listing1,
        listing2: f.listing2,
      }));

    const materialConflicts = conflictingEvidence.filter((c) =>
      [
        "normalizedAddress",
        "street",
        "suburb",
        "town",
        "erf",
        "portion",
        "farmName",
        "farmNumber",
        "propertyType",
        "landSize",
        "agriculturalHectares",
        "fingerprint",
        "externalListingId",
        "sourceUrl",
      ].includes(c.field),
    );

    const sameTownOnly =
      matchingEvidence.some((m) => m.startsWith("town:")) &&
      materialConflicts.length >= 2;

    let identityDecision: "CORRECT_SAME_PROPERTY" | "DISTINCT_PROPERTIES_REQUIRES_SPLIT";
    let confidence: "high" | "medium" | "low";
    let recommendedAction: string;

    const hasStrongSameEvidence =
      fieldComparisons.find((f) => f.field === "erf")?.match ||
      fieldComparisons.find((f) => f.field === "farmNumber")?.match ||
      fieldComparisons.find((f) => f.field === "normalizedAddress")?.match ||
      (fieldComparisons.find((f) => f.field === "street")?.match &&
        fieldComparisons.find((f) => f.field === "erf")?.match);

    if (hasStrongSameEvidence && !materialConflicts.some((c) => c.field === "propertyType")) {
      identityDecision = "CORRECT_SAME_PROPERTY";
      confidence = "medium";
      recommendedAction = "Confirm same property — keep shared master";
    } else if (
      materialConflicts.some((c) =>
        ["propertyType", "street", "town", "erf", "fingerprint"].includes(c.field),
      ) ||
      sameTownOnly
    ) {
      identityDecision = "DISTINCT_PROPERTIES_REQUIRES_SPLIT";
      confidence = materialConflicts.length >= 4 ? "high" : "medium";
      recommendedAction =
        "Split into separate Property Masters — assign second listing to new master via admin review";
    } else {
      identityDecision = "DISTINCT_PROPERTIES_REQUIRES_SPLIT";
      confidence = "low";
      recommendedAction = "Manual admin review required — insufficient same-property evidence";
    }

    return {
      caseId: caseDef.caseId,
      master_id: caseDef.masterId,
      masterFingerprint: master?.fingerprint ?? null,
      listing_1: l1,
      listing_2: l2,
      fieldComparisons,
      identity_decision: identityDecision,
      confidence,
      matching_evidence: matchingEvidence,
      conflicting_evidence: conflictingEvidence,
      recommended_action: recommendedAction,
    };
  }

  const cases = REVIEW_CASES.map(analyzeCase);

  const report = {
    generatedAt: new Date().toISOString(),
    principle: "Do not decide from title similarity alone. No production writes.",
    productionState: {
      propertyMasters: masters?.length ?? 0,
      sharedMasterCases: REVIEW_CASES.length,
    },
    cases,
  };

  writeFileSync(
    "PROPERTY_MASTER_IDENTITY_REVIEW10_LIVE.json",
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
