const replacements: Record<string, string> = {
    street: "st",
    straat: "st",
    avenue: "ave",
    road: "rd",
    drive: "dr",
    lane: "ln",
    close: "cl",
  };
  
  export function normalizeAddress(address: string): string {
    let value = address.toLowerCase();
  
    Object.entries(replacements).forEach(([key, replacement]) => {
      value = value.replaceAll(key, replacement);
    });
  
    return value
      .replace(/[.,]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }