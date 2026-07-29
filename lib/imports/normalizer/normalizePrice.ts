export function normalizePrice(value: unknown): number | null {

    if (value === null || value === undefined) {
      return null;
    }
  
    if (typeof value === "number") {
      return value;
    }
  
    const cleaned = String(value).replace(/[^\d.]/g, "");
  
    const parsed = Number(cleaned);
  
    return Number.isNaN(parsed) ? null : parsed;
  }