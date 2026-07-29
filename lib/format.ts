export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAuctionDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function formatStatus(status: string): string {
  return status
    .split(/[_\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function calcSavingPercent(
  marketValue: number,
  auctionPrice: number,
): number {
  if (marketValue <= 0) return 0;
  return Math.round(((marketValue - auctionPrice) / marketValue) * 100);
}

const PROPERTY_IMAGES: Record<string, string> = {
  House:
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85",
  Apartment:
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=85",
  Townhouse:
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85",
  Commercial:
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=85",
  "Vacant Land":
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=85",
  Farm: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=85",
};

const DEFAULT_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=85";

export function getPropertyImage(propertyType: string): string {
  return PROPERTY_IMAGES[propertyType] ?? DEFAULT_PROPERTY_IMAGE;
}

export function getStatusStyle(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized === "upcoming") {
    return "bg-navy-900/90 text-white backdrop-blur-sm";
  }
  if (normalized.includes("sheriff")) {
    return "bg-navy-900/90 text-white backdrop-blur-sm";
  }
  if (normalized.includes("bank")) {
    return "bg-amber-600/90 text-white backdrop-blur-sm";
  }
  if (normalized.includes("public")) {
    return "bg-emerald-700/90 text-white backdrop-blur-sm";
  }

  return "bg-slate-700/90 text-white backdrop-blur-sm";
}
