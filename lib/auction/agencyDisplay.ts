export type AuctionAgencyInfo = {
  name: string | null;
  contact: string | null;
  website: string | null;
  sourceLabel: string | null;
};

const KNOWN_AGENCIES: Array<{
  match: RegExp;
  name: string;
  contact?: string;
  website?: string;
}> = [
  {
    match: /high\s*street/i,
    name: "High Street Auctions",
    website: "https://www.highstreetauctions.com",
  },
  {
    match: /bidders?\s*choice/i,
    name: "Bidders Choice",
    website: "https://www.bidderschoice.co.za",
  },
  {
    match: /claremart/i,
    name: "Claremart",
    website: "https://www.claremart.co.za",
  },
  {
    match: /in2assets|in\s*2\s*assets/i,
    name: "In2Assets",
    website: "https://www.in2assets.co.za",
  },
  {
    match: /park\s*village/i,
    name: "Park Village Auctions",
    website: "https://www.parkvillageauctions.co.za",
  },
  {
    match: /standard\s*bank|easysell/i,
    name: "Standard Bank EasySell",
    website: "https://www.standardbank.co.za",
  },
  {
    match: /absa/i,
    name: "Absa Property Sales",
    website: "https://www.absa.co.za",
  },
  {
    match: /sheriff/i,
    name: "Sheriff of the Court",
  },
];

/**
 * Derive auction agency display fields from the property `source` string.
 * Supports free-text sources and "Name · contact · website" seed format.
 */
export function resolveAuctionAgency(
  source: string | null | undefined,
): AuctionAgencyInfo {
  const raw = source?.trim() || "";
  if (!raw) {
    return {
      name: null,
      contact: null,
      website: null,
      sourceLabel: null,
    };
  }

  const parts = raw
    .split(/\s*[·|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  let name: string | null = parts[0] ?? raw;
  let contact: string | null = null;
  let website: string | null = null;

  for (const part of parts.slice(1)) {
    if (/^https?:\/\//i.test(part) || /\.(co\.za|com|net|org)\b/i.test(part)) {
      website = part.startsWith("http") ? part : `https://${part}`;
    } else if (/@/.test(part) || /^(\+?\d[\d\s()-]{6,})$/.test(part)) {
      contact = part;
    }
  }

  for (const known of KNOWN_AGENCIES) {
    if (known.match.test(raw)) {
      name = known.name;
      website = website ?? known.website ?? null;
      contact = contact ?? known.contact ?? null;
      break;
    }
  }

  return {
    name,
    contact,
    website,
    sourceLabel: raw,
  };
}

export function hasAgencyDetails(info: AuctionAgencyInfo): boolean {
  return Boolean(info.name || info.contact || info.website || info.sourceLabel);
}
