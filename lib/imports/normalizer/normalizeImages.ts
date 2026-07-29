export function normalizeImages(value: unknown): string[] {

    if (!value) {
      return [];
    }
  
    if (Array.isArray(value)) {
      return value.filter(Boolean).map(String);
    }
  
    return [String(value)];
  }