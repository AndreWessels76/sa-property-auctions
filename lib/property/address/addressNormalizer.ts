import { ADDRESS_REPLACEMENTS } from "./addressAbbreviations";

export function normalizeAddress(address: string): string {
  let result = ` ${address.toLowerCase()} `;

  result = result.replace(/[.,]/g, " ");

  for (const [from, to] of Object.entries(ADDRESS_REPLACEMENTS)) {
    result = result.replaceAll(from, to);
  }

  result = result.replace(/\s+/g, " ");

  return result.trim();
}
