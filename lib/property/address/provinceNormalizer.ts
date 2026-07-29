const MAP: Record<string, string> = {
  gp: "Gauteng",
  gauteng: "Gauteng",
  wc: "Western Cape",
  "western cape": "Western Cape",
  kzn: "KwaZulu-Natal",
  "kwazulu natal": "KwaZulu-Natal",
  fs: "Free State",
  ec: "Eastern Cape",
  nc: "Northern Cape",
  lp: "Limpopo",
  mp: "Mpumalanga",
  nw: "North West",
};

export function normalizeProvince(province: string | null) {
  if (!province) {
    return null;
  }

  return MAP[province.toLowerCase()] ?? province;
}
