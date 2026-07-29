import type { PropertySearchDTO } from "./PropertySearchDTO";

export interface SavedSearchDTO {
  id: string;
  userId: string;
  name: string;
  filters: PropertySearchDTO;
  active: boolean;
  createdAt: string;
}