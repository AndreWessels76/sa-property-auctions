import { listingContentHash } from "@/lib/acquisition/changeDetection";
import type { ExtractedListing } from "@/lib/acquisition/types";
import {
  normalizePropertyType,
  normalizeProvince,
} from "@/lib/acquisition/validateListing";

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i",
  );
  return html.match(re)?.[1] ?? html.match(re2)?.[1] ?? null;
}

function firstMatch(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

function extractImages(html: string, pageUrl: string): string[] {
  const urls = new Set<string>();
  const og = metaContent(html, "og:image");
  if (og) urls.add(absolutize(og, pageUrl));

  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRe.exec(html))) {
    const src = match[1];
    if (!src || src.startsWith("data:")) continue;
    if (/logo|icon|sprite|avatar|placeholder|1x1/i.test(src)) continue;
    urls.add(absolutize(src, pageUrl));
  }
  return [...urls].slice(0, 30);
}

function absolutize(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseDate(value: string | null): string | null {
  if (!value?.trim()) return null;
  const cleaned = value.trim().replace(/\s+/g, " ");

  // Prefer explicit calendar parsing before Date() to avoid timezone day-shift.
  const months: Record<string, string> = {
    january: "01",
    jan: "01",
    february: "02",
    feb: "02",
    march: "03",
    mar: "03",
    april: "04",
    apr: "04",
    may: "05",
    june: "06",
    jun: "06",
    july: "07",
    jul: "07",
    august: "08",
    aug: "08",
    september: "09",
    sep: "09",
    october: "10",
    oct: "10",
    november: "11",
    nov: "11",
    december: "12",
    dec: "12",
  };

  // DD/MM/YYYY
  const slash = cleaned.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  }

  // 04 August 2026 | 4 Aug 2026
  const dmy = cleaned.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i,
  );
  if (dmy) {
    const month = months[dmy[2].toLowerCase()];
    if (month) {
      return `${dmy[3]}-${month}-${dmy[1].padStart(2, "0")}`;
    }
  }
  // August 4, 2026 | August 4 2026
  const mdy = cleaned.match(
    /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(\d{4})/i,
  );
  if (mdy) {
    const month = months[mdy[1].toLowerCase()];
    if (month) {
      return `${mdy[3]}-${month}-${mdy[2].padStart(2, "0")}`;
    }
  }

  // ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 10);
  }

  return null;
}

function cleanPlaceName(value: string | null): string | null {
  if (!value?.trim()) return null;
  return (
    value
      .replace(/\b(Province|City|Town|Country|Republic of South Africa)\b.*$/i, "")
      .replace(/[:|].*$/, "")
      .trim() || null
  );
}

function externalIdFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const slug = u.pathname.replace(/\/$/, "").split("/").filter(Boolean).pop();
    if (slug) return `bc_${slug.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)}`;
    return `bc_${Math.abs(hashString(u.pathname)).toString(16)}`;
  } catch {
    return `bc_${Date.now().toString(36)}`;
  }
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Extract listing fields from HTML. Never invents values — null when absent.
 */
export function extractBiddersChoiceListing(
  html: string,
  sourceUrl: string,
): ExtractedListing {
  const title =
    metaContent(html, "og:title") ||
    firstMatch(html, [/<h1[^>]*>([\s\S]*?)<\/h1>/i])?.replace(/<[^>]+>/g, "").trim() ||
    firstMatch(html, [/<title[^>]*>([\s\S]*?)<\/title>/i])?.replace(/\s*[|\-–].*$/, "").trim() ||
    null;

  const description =
    metaContent(html, "og:description") ||
    metaContent(html, "description") ||
    null;

  const text = stripTags(html);

  const province =
    normalizeProvince(
      firstMatch(text, [
        /Province[:\s]+([A-Za-z\s-]+)/i,
        /\b(Western Cape|Gauteng|KwaZulu-Natal|Eastern Cape|Free State|Limpopo|Mpumalanga|Northern Cape|North West)\b/i,
      ]),
    ) || null;

  const town = cleanPlaceName(
    firstMatch(text, [
      /City[:\s]+([A-Za-z\s'-]{2,40})/i,
      /Town[:\s]+([A-Za-z\s'-]{2,40})/i,
    ]),
  );

  const suburb = cleanPlaceName(
    firstMatch(text, [/Suburb[:\s]+([A-Za-z0-9\s'-]{2,40})/i]),
  );

  const streetAddress =
    cleanPlaceName(
      firstMatch(text, [
        /Address[:\s]+([A-Za-z0-9\s,'\-]{5,80}?)(?:\s+City:|\s+Province:|\s+Country:|$)/i,
        /Address[:\s]+(.{5,80}?)(?:Suburb|Town|Province|City|$)/i,
      ]),
    ) || null;

  const postalCode =
    firstMatch(text, [/Postal\s*Code[:\s]+(\d{4})/i]) || null;

  const bedrooms = parseNumber(
    firstMatch(text, [
      /(\d+)\s*bedroom\(s\)/i,
      /Bedrooms?[:\s]+(\d+)/i,
      /(\d+)\s*Bed/i,
    ]),
  );
  const bathrooms = parseNumber(
    firstMatch(text, [
      /(\d+)\s*bathroom\(s\)/i,
      /Bathrooms?[:\s]+(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*Bath/i,
    ]),
  );
  const garages = parseNumber(
    firstMatch(text, [/Garages?[:\s]+(\d+)/i, /(\d+)\s*Garage/i]),
  );

  const landSize = parseNumber(
    firstMatch(text, [/Erf\s*Size[:\s]+([\d\s]+)/i, /Land\s*Size[:\s]+([\d\s]+)/i]),
  );
  const buildingSize = parseNumber(
    firstMatch(text, [/Floor\s*Size[:\s]+([\d\s]+)/i, /Building\s*Size[:\s]+([\d\s]+)/i]),
  );

  const propertyType =
    normalizePropertyType(
      firstMatch(text, [
        /Property\s*Type[:\s]+([A-Za-z\s]+)/i,
        /\b(Guest\s*Farm|Farm|Guesthouse|House|Apartment|Industrial|Commercial)\b/i,
      ]),
    ) || null;

  const auctionDate = parseDate(
    firstMatch(text, [
      /Auction\s*Open[:\s]+([0-9A-Za-z\s,\/\-.]+?)(?:@|Auction|Closes|Viewing|$)/i,
      /Open\s*date[:\s]+([0-9A-Za-z\s,\/\-.]+)/i,
      /Opens\s+([0-9A-Za-z\s,\/\-.]+)/i,
      /Auction\s*Date[:\s]+([0-9A-Za-z\s,\/\-.]+)/i,
      /Date\s*of\s*Auction[:\s]+([0-9A-Za-z\s,\/\-.]+)/i,
      /Bids?\s*Open[:\s]+([0-9A-Za-z\s,\/\-.]+)/i,
    ]) || metaContent(html, "auction:date"),
  );

  const auctionTime =
    firstMatch(text, [/Auction\s*Time[:\s]+([0-9:.apm\s]+)/i, /Time[:\s]+(\d{1,2}:\d{2})/i]) ||
    null;

  const auctionVenue =
    firstMatch(text, [/Venue[:\s]+(.{5,120}?)(?:Viewing|Deposit|Terms|$)/i]) ||
    null;

  const viewingInformation =
    firstMatch(text, [/Viewing[:\s]+(.{5,200}?)(?:Deposit|Terms|Auction|$)/i]) ||
    null;

  const depositRequirements =
    firstMatch(text, [/Deposit[:\s]+(.{5,200}?)(?:Terms|Viewing|Auction|$)/i]) ||
    null;

  const lat = parseNumber(
    firstMatch(html, [/"latitude"\s*:\s*"?(-?\d+\.?\d*)"?/i, /lat["']?\s*[:=]\s*(-?\d+\.?\d*)/i]),
  );
  const lng = parseNumber(
    firstMatch(html, [/"longitude"\s*:\s*"?(-?\d+\.?\d*)"?/i, /lng["']?\s*[:=]\s*(-?\d+\.?\d*)/i]),
  );

  const auctionPrice = parseNumber(
    firstMatch(text, [
      /Guide\s*Price[:\s]+R?\s*([\d,\s]+)/i,
      /Auction\s*Price[:\s]+R?\s*([\d,\s]+)/i,
      /Starting\s*Bid[:\s]+R?\s*([\d,\s]+)/i,
    ]),
  );

  const imageUrls = extractImages(html, sourceUrl);
  const externalListingId = externalIdFromUrl(sourceUrl);

  const termsLink =
    firstMatch(html, [/href=["']([^"']*terms[^"']*)["']/i]) || null;
  const brochureLink =
    firstMatch(html, [/href=["']([^"']*(?:brochure|catalogue)[^"']*)["']/i]) ||
    null;
  const registrationLink =
    firstMatch(html, [/href=["']([^"']*regist[^"']*)["']/i]) || null;

  const listing: ExtractedListing = {
    title,
    streetAddress,
    suburb,
    town,
    province,
    postalCode,
    latitude: lat,
    longitude: lng,
    propertyType,
    bedrooms,
    bathrooms,
    garages,
    landSize,
    buildingSize,
    description,
    features: null,
    imageUrls,
    auctionDate,
    auctionTime,
    auctionVenue,
    viewingInformation,
    depositRequirements,
    termsLink: termsLink ? absolutize(termsLink, sourceUrl) : null,
    brochureLink: brochureLink ? absolutize(brochureLink, sourceUrl) : null,
    registrationLink: registrationLink
      ? absolutize(registrationLink, sourceUrl)
      : null,
    sourceUrl,
    externalListingId,
    auctionAgency: "Bidders Choice",
    agencyContact: null,
    agencyWebsite: "https://www.bidderschoice.co.za",
    auctionPrice,
    estimatedValue: null,
    listingStatus: "upcoming",
    contentHash: "",
  };
  listing.contentHash = listingContentHash(listing);
  return listing;
}

/** Map a licensed CSV/JSON row — only uses provided fields, never fabricates. */
export function mapLicensedPayload(
  row: Record<string, unknown>,
): ExtractedListing | null {
  const sourceUrl = String(row.source_url ?? row.sourceUrl ?? "").trim();
  const title = String(row.title ?? "").trim() || null;
  const externalListingId = String(
    row.external_listing_id ?? row.externalListingId ?? "",
  ).trim();
  if (!sourceUrl || !title || !externalListingId) return null;

  const imagesRaw = row.image_urls ?? row.imageUrls ?? row.images;
  const imageUrls = Array.isArray(imagesRaw)
    ? imagesRaw.filter((u): u is string => typeof u === "string" && /^https?:/i.test(u))
    : typeof imagesRaw === "string" && imagesRaw
      ? imagesRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const listing: ExtractedListing = {
    title,
    streetAddress: (row.street_address ?? row.address ?? null) as string | null,
    suburb: (row.suburb as string) ?? null,
    town: (row.town as string) ?? null,
    province: normalizeProvince((row.province as string) ?? null),
    postalCode: (row.postal_code as string) ?? null,
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
    propertyType: normalizePropertyType((row.property_type as string) ?? null),
    bedrooms: typeof row.bedrooms === "number" ? row.bedrooms : null,
    bathrooms: typeof row.bathrooms === "number" ? row.bathrooms : null,
    garages: typeof row.garages === "number" ? row.garages : null,
    landSize: typeof row.erf_size === "number" ? row.erf_size : null,
    buildingSize: typeof row.floor_size === "number" ? row.floor_size : null,
    description: (row.description as string) ?? null,
    features: (row.features as string) ?? null,
    imageUrls,
    auctionDate: (row.auction_date as string) ?? null,
    auctionTime: (row.auction_time as string) ?? null,
    auctionVenue: (row.auction_venue as string) ?? null,
    viewingInformation: (row.viewing_information as string) ?? null,
    depositRequirements: (row.deposit_requirements as string) ?? null,
    termsLink: (row.terms_link as string) ?? null,
    brochureLink: (row.brochure_link as string) ?? null,
    registrationLink: (row.registration_link as string) ?? null,
    sourceUrl,
    externalListingId: externalListingId.startsWith("bc_")
      ? externalListingId
      : `bc_${externalListingId}`,
    auctionAgency: "Bidders Choice",
    agencyContact: (row.agency_contact as string) ?? null,
    agencyWebsite:
      (row.agency_website as string) ?? "https://www.bidderschoice.co.za",
    auctionPrice: typeof row.auction_price === "number" ? row.auction_price : null,
    estimatedValue:
      typeof row.estimated_value === "number" ? row.estimated_value : null,
    listingStatus: (row.listing_status as string) ?? "upcoming",
    contentHash: "",
  };
  listing.contentHash = listingContentHash(listing);
  return listing;
}
