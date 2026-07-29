export function normalizeProvince(value: string): string {

    const province = value.trim().toLowerCase();
  
    const map: Record<string, string> = {
  
      "gp": "Gauteng",
      "gauteng": "Gauteng",
  
      "wc": "Western Cape",
      "western cape": "Western Cape",
  
      "ec": "Eastern Cape",
      "eastern cape": "Eastern Cape",
  
      "kzn": "KwaZulu-Natal",
      "kwazulu natal": "KwaZulu-Natal",
  
      "lp": "Limpopo",
      "limpopo": "Limpopo",
  
      "fs": "Free State",
      "free state": "Free State",
  
      "mp": "Mpumalanga",
      "mpumalanga": "Mpumalanga",
  
      "nw": "North West",
      "north west": "North West",
  
      "nc": "Northern Cape",
      "northern cape": "Northern Cape",
  
    };
  
    return map[province] ?? value;
  
  }
  
  export function normalizePropertyType(value: string) {
  
    const type = value.trim().toLowerCase();
  
    if (type.includes("house"))
      return "House";
  
    if (type.includes("home"))
      return "House";
  
    if (type.includes("flat"))
      return "Apartment";
  
    if (type.includes("apartment"))
      return "Apartment";
  
    if (type.includes("vacant"))
      return "Vacant Land";
  
    if (type.includes("farm"))
      return "Farm";
  
    if (type.includes("commercial"))
      return "Commercial";
  
    return value;
  
  }
  
  export function titleCase(text: string) {
  
    return text
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  
  }

  export function normalizeTitle(value: string) {
    return titleCase(value.trim().replace(/\s+/g, " "));
  }