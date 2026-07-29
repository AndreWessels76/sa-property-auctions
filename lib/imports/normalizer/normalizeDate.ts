export function normalizeDate(value: unknown): string | null {

    if (!value) return null;
  
    const date = new Date(String(value));
  
    if (Number.isNaN(date.getTime())) {
      return null;
    }
  
    return date.toISOString();
  }