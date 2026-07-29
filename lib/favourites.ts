const GUEST_KEY = "sa-property-favourites:guest";

let activeUserId: string | null = null;

function storageKey(userId?: string | null) {
  return userId ? `sa-property-favourites:${userId}` : GUEST_KEY;
}

function readFavourites(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const data = localStorage.getItem(key);

  if (!data) {
    return [];
  }

  try {
    const parsed = JSON.parse(data) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeFavourites(key: string, favourites: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(key, JSON.stringify(favourites));
  window.dispatchEvent(new Event("favouritesUpdated"));
}

function currentKey() {
  return storageKey(activeUserId);
}

export function setFavouritesUser(userId: string | null) {
  if (typeof window === "undefined") {
    activeUserId = userId;
    return;
  }

  if (userId) {
    const guestFavourites = readFavourites(GUEST_KEY);
    const userFavourites = readFavourites(storageKey(userId));
    const merged = [...new Set([...userFavourites, ...guestFavourites])];

    writeFavourites(storageKey(userId), merged);
    localStorage.removeItem(GUEST_KEY);
  }

  activeUserId = userId;
  window.dispatchEvent(new Event("favouritesUpdated"));
}

export function getFavourites(): string[] {
  return readFavourites(currentKey());
}

export function isFavourite(id: string): boolean {
  return getFavourites().includes(id);
}

export function toggleFavourite(id: string): boolean {
  const favourites = getFavourites();
  const exists = favourites.includes(id);
  const updated = exists
    ? favourites.filter((item) => item !== id)
    : [...favourites, id];

  writeFavourites(currentKey(), updated);

  return !exists;
}

export function favouriteCount(): number {
  return getFavourites().length;
}

export function clearFavourites() {
  writeFavourites(currentKey(), []);
}

export function getFavouriteProperties<T extends { id: string }>(
  properties: T[],
): T[] {
  const favourites = getFavourites();

  return properties.filter((property) => favourites.includes(property.id));
}
