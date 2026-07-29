import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

export interface AISearchDTO {
  originalQuery: string;
  filters: PropertySearchDTO;
  confidence: number;
  suggestions: string[];
}
