export const provinces = [
  "All Provinces",
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

export const propertyTypes = [
  "All Types",
  "House",
  "Apartment",
  "Townhouse",
  "Commercial",
  "Vacant Land",
  "Farm",
];

export const priceRanges = [
  "Any Price",
  "Under R500 000",
  "R500 000 – R1 000 000",
  "R1 000 000 – R2 000 000",
  "R2 000 000 – R5 000 000",
  "Over R5 000 000",
];

export type AuctionStatus = "Sheriff Sale" | "Bank Repossession" | "Public Auction";

export type FeaturedAuction = {
  id: string;
  town: string;
  province: string;
  auctionDate: string;
  auctionDateISO: string;
  propertyType: string;
  marketValue: number;
  auctionPrice: number;
  status: AuctionStatus;
  image: string;
};

export function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA")}`;
}

export function calcSavingPercent(marketValue: number, auctionPrice: number): number {
  return Math.round(((marketValue - auctionPrice) / marketValue) * 100);
}

export const featuredAuctions: FeaturedAuction[] = [
  {
    id: "1",
    town: "Sandton",
    province: "Gauteng",
    auctionDate: "15 Jul 2026",
    auctionDateISO: "2026-07-15T10:00:00",
    propertyType: "House",
    marketValue: 2450000,
    auctionPrice: 1715000,
    status: "Sheriff Sale",
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85",
  },
  {
    id: "2",
    town: "Sea Point",
    province: "Western Cape",
    auctionDate: "22 Jul 2026",
    auctionDateISO: "2026-07-22T10:00:00",
    propertyType: "Apartment",
    marketValue: 890000,
    auctionPrice: 623000,
    status: "Bank Repossession",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=85",
  },
  {
    id: "3",
    town: "Umhlanga",
    province: "KwaZulu-Natal",
    auctionDate: "29 Jul 2026",
    auctionDateISO: "2026-07-29T10:00:00",
    propertyType: "Commercial",
    marketValue: 4200000,
    auctionPrice: 2940000,
    status: "Public Auction",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=85",
  },
  {
    id: "4",
    town: "Menlyn",
    province: "Gauteng",
    auctionDate: "5 Aug 2026",
    auctionDateISO: "2026-08-05T10:00:00",
    propertyType: "Townhouse",
    marketValue: 1150000,
    auctionPrice: 805000,
    status: "Bank Repossession",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85",
  },
  {
    id: "5",
    town: "Stellenbosch",
    province: "Western Cape",
    auctionDate: "12 Aug 2026",
    auctionDateISO: "2026-08-12T10:00:00",
    propertyType: "House",
    marketValue: 3500000,
    auctionPrice: 2450000,
    status: "Sheriff Sale",
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=85",
  },
  {
    id: "6",
    town: "Gqeberha",
    province: "Eastern Cape",
    auctionDate: "19 Aug 2026",
    auctionDateISO: "2026-08-19T10:00:00",
    propertyType: "Vacant Land",
    marketValue: 650000,
    auctionPrice: 455000,
    status: "Public Auction",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=85",
  },
];

export const whyChooseFeatures = [
  {
    title: "Auction-focused catalogue",
    description:
      "Browse sheriff, bank and public auction-style listings compiled for South African buyers and investors.",
    icon: "ShieldCheck",
  },
  {
    title: "Alerts & saved searches",
    description:
      "Save searches and receive alerts when matching properties appear — subject to your plan limits.",
    icon: "BellRing",
  },
  {
    title: "Growing coverage",
    description:
      "Coverage is expanding across provinces and towns as trusted data sources are onboarded.",
    icon: "MapPinned",
  },
  {
    title: "Market intelligence",
    description:
      "Estimated values and savings indicators help you compare auction price versus estimated value.",
    icon: "TrendingUp",
  },
  {
    title: "Mobile friendly",
    description:
      "Browse, save favourites, and manage your account on phone, tablet, or desktop.",
    icon: "Smartphone",
  },
  {
    title: "Privacy minded",
    description:
      "Built with POPIA-aligned practices. Review our Privacy Policy and POPIA notice for details.",
    icon: "Lock",
  },
];

export const testimonials = [
  {
    id: "1",
    quote:
      "Investors typically look for clear auction dates, estimated values, and timely alerts before a sale.",
    name: "Investor workflow",
    role: "Illustrative scenario",
    location: "Public beta",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    rating: 5,
  },
  {
    id: "2",
    quote:
      "First-time buyers often need plain-language listings and savings context before speaking to a sheriff or auctioneer.",
    name: "First-time buyer journey",
    role: "Illustrative scenario",
    location: "Public beta",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    rating: 5,
  },
  {
    id: "3",
    quote:
      "Agents and researchers benefit from province filters and a single place to track upcoming auction opportunities.",
    name: "Research workflow",
    role: "Illustrative scenario",
    location: "Public beta",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    rating: 5,
  },
];

/** Source categories — not claimed contractual partners. */
export const partners = [
  "Sheriff sales",
  "Bank repossessions",
  "Public auctions",
  "Auctioneer notices",
  "Partner CSV feeds",
  "Admin-verified imports",
];

export const mapProvinces = [
  { name: "Western Cape", auctions: null as number | null, x: 18, y: 78 },
  { name: "Eastern Cape", auctions: null, x: 42, y: 72 },
  { name: "Northern Cape", auctions: null, x: 22, y: 48 },
  { name: "Free State", auctions: null, x: 42, y: 52 },
  { name: "KwaZulu-Natal", auctions: null, x: 58, y: 68 },
  { name: "Gauteng", auctions: null, x: 48, y: 38 },
  { name: "Mpumalanga", auctions: null, x: 58, y: 48 },
  { name: "Limpopo", auctions: null, x: 52, y: 22 },
  { name: "North West", auctions: null, x: 36, y: 36 },
];

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=90";
