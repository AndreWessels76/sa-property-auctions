const townMap: Record<string, string> = {

    // Gauteng
    "pta": "Pretoria",
    "pretoria": "Pretoria",
    "pretoria east": "Pretoria",
    "pretoria west": "Pretoria",
    "pretoria north": "Pretoria",
    "pretoria cbd": "Pretoria",
  
    "jhb": "Johannesburg",
    "joburg": "Johannesburg",
    "jozi": "Johannesburg",
    "johannesburg": "Johannesburg",
  
    "centurion": "Centurion",
    "midrand": "Midrand",
    "benoni": "Benoni",
    "boksburg": "Boksburg",
    "kempton park": "Kempton Park",
    "germiston": "Germiston",
    "springs": "Springs",
    "randburg": "Randburg",
    "roodepoort": "Roodepoort",
  
    // Western Cape
    "cpt": "Cape Town",
    "cape town": "Cape Town",
    "kaapstad": "Cape Town",
    "bellville": "Bellville",
    "paarl": "Paarl",
    "stellenbosch": "Stellenbosch",
  
    // KwaZulu-Natal
    "dbn": "Durban",
    "durban": "Durban",
    "pmb": "Pietermaritzburg",
    "pietermaritzburg": "Pietermaritzburg",
  
    // Free State
    "bloem": "Bloemfontein",
    "bloemfontein": "Bloemfontein",
  
    // Eastern Cape
    "pe": "Gqeberha",
    "port elizabeth": "Gqeberha",
    "gqeberha": "Gqeberha",
    "east london": "East London",
  
    // Limpopo
    "polokwane": "Polokwane",
  
    // Mpumalanga
    "nelspruit": "Mbombela",
    "mbombela": "Mbombela",
  
    // North West
    "rustenburg": "Rustenburg",
  
    // Northern Cape
    "kimberley": "Kimberley",
  
  };
  
  export function findTownInQuery(query: string): string | undefined {
    const lower = query.toLowerCase();
    const keys = Object.keys(townMap).sort((a, b) => b.length - a.length);

    for (const key of keys) {
      if (lower.includes(key)) {
        return townMap[key];
      }
    }

    return undefined;
  }

  export function normalizeTown(value: string): string {
  
    const town = value.trim().toLowerCase();
  
    return townMap[town] ?? titleCase(value);
  
  }
  
  function titleCase(text: string) {
  
    return text
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  
  }