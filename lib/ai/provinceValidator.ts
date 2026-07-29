const townProvinceMap: Record<string, string> = {

    // Gauteng
    "Pretoria": "Gauteng",
    "Johannesburg": "Gauteng",
    "Centurion": "Gauteng",
    "Midrand": "Gauteng",
    "Benoni": "Gauteng",
    "Boksburg": "Gauteng",
    "Kempton Park": "Gauteng",
    "Germiston": "Gauteng",
    "Roodepoort": "Gauteng",
    "Randburg": "Gauteng",
  
    // Western Cape
    "Cape Town": "Western Cape",
    "Bellville": "Western Cape",
    "Paarl": "Western Cape",
    "Stellenbosch": "Western Cape",
    "George": "Western Cape",
  
    // KwaZulu-Natal
    "Durban": "KwaZulu-Natal",
    "Pietermaritzburg": "KwaZulu-Natal",
    "Richards Bay": "KwaZulu-Natal",
  
    // Eastern Cape
    "Gqeberha": "Eastern Cape",
    "East London": "Eastern Cape",
    "Mthatha": "Eastern Cape",
  
    // Free State
    "Bloemfontein": "Free State",
    "Welkom": "Free State",
  
    // Limpopo
    "Polokwane": "Limpopo",
    "Tzaneen": "Limpopo",
  
    // Mpumalanga
    "Mbombela": "Mpumalanga",
    "Witbank": "Mpumalanga",
    "eMalahleni": "Mpumalanga",
  
    // North West
    "Rustenburg": "North West",
    "Mahikeng": "North West",
  
    // Northern Cape
    "Kimberley": "Northern Cape",
  
  };
  
  export function validateProvince(
    town: string,
    province: string
  ): string {

    const correctProvince = townProvinceMap[town];

    if (!correctProvince) {
      return province;
    }

    if (correctProvince !== province) {
      console.warn(
        `Province corrected: ${town} (${province} → ${correctProvince})`
      );
    }

    return correctProvince;
  }