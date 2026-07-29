export function normalizeAddress(value: unknown): string {

    if (!value) {
  
      return "";
  
    }
  
    return String(value)
  
      .replace(/\s+/g, " ")
  
      .trim();
  
  }