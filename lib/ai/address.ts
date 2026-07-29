export function normalizeAddress(address: string | null): string | null {

    if (!address) return null;
  
    return address
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\bst\b/gi, "Street")
      .replace(/\brd\b/gi, "Road")
      .replace(/\bave\b/gi, "Avenue")
      .replace(/\bdr\b/gi, "Drive")
      .replace(/\bcl\b/gi, "Close")
      .replace(/\bcr\b/gi, "Crescent")
      .replace(/\bblvd\b/gi, "Boulevard")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  
  }