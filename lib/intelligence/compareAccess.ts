export const FREE_COMPARE_LIMIT = 2;
export const PREMIUM_COMPARE_LIMIT = 6;

export function compareLimit(premium: boolean): number {
  return premium ? PREMIUM_COMPARE_LIMIT : FREE_COMPARE_LIMIT;
}

export function applyCompareAccess<T>(items: T[], premium: boolean): T[] {
  return items.slice(0, compareLimit(premium));
}
