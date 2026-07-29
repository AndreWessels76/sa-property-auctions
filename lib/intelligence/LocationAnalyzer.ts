import type { PropertyDTO } from "@/lib/dto/PropertyDTO";

export class LocationAnalyzer {
  static analyse(property: PropertyDTO): {
    strengths: string[];
    risks: string[];
  } {
    const strengths: string[] = [];
    const risks: string[] = [];

    if (property.town) {
      strengths.push(`Located in ${property.town}.`);
    } else {
      risks.push("Town is missing from the listing.");
    }

    if (property.suburb) {
      strengths.push(`Suburb: ${property.suburb}.`);
    }

    if (property.latitude == null || property.longitude == null) {
      risks.push("No GPS coordinates for location validation.");
    }

    return { strengths, risks };
  }
}
