/**
 * Address verification checklist — never fabricate missing parts.
 */

export type AddressVerificationResult = {
  street: string | null;
  suburb: string | null;
  town: string | null;
  province: string | null;
  postalCode: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  gps: { latitude: number; longitude: number } | null;
  municipality: string | null;
  ward: string | null;
  region: string | null;
  complete: boolean;
  unavailabilityReason: string | null;
  score: number;
  missing: string[];
};

export function verifyAddressFields(input: {
  street?: string | null;
  address?: string | null;
  suburb?: string | null;
  town?: string | null;
  province?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  municipality?: string | null;
  ward?: string | null;
  region?: string | null;
  unavailabilityReason?: string | null;
}): AddressVerificationResult {
  const street = input.street?.trim() || input.address?.trim() || null;
  const suburb = input.suburb?.trim() || null;
  const town = input.town?.trim() || null;
  const province = input.province?.trim() || null;
  const postalCode = input.postalCode?.trim() || null;
  const hasCoords =
    input.latitude != null &&
    input.longitude != null &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude);
  const coordinates = hasCoords
    ? { latitude: input.latitude as number, longitude: input.longitude as number }
    : null;

  const missing: string[] = [];
  if (!street) missing.push("street");
  if (!suburb) missing.push("suburb");
  if (!town) missing.push("town");
  if (!province) missing.push("province");
  if (!postalCode) missing.push("postal_code");
  if (!coordinates) missing.push("coordinates");

  let score = 0;
  if (street) score += 20;
  if (suburb) score += 20;
  if (town) score += 20;
  if (province) score += 20;
  if (postalCode) score += 10;
  if (coordinates) score += 10;

  const complete = Boolean(street && suburb && town && province);
  const unavailabilityReason =
    !street && !suburb
      ? input.unavailabilityReason?.trim() ||
        "Address unavailable from source — not fabricated"
      : input.unavailabilityReason?.trim() || null;

  return {
    street,
    suburb,
    town,
    province,
    postalCode,
    coordinates,
    gps: coordinates,
    municipality: input.municipality?.trim() || null,
    ward: input.ward?.trim() || null,
    region: input.region?.trim() || null,
    complete,
    unavailabilityReason,
    score,
    missing,
  };
}
