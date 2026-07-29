import { SavedSearchRepository } from "@/lib/repositories/SavedSearchRepository";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

export class SavedSearchService {
  static getUserSearches(userId: string) {
    return SavedSearchRepository.getUserSearches(userId);
  }

  static async createSearch(data: {
    userId: string;
    name: string;
    filters: PropertySearchDTO;
    active: boolean;
  }) {
    const exists = await SavedSearchRepository.exists(
      data.userId,
      data.filters,
    );

    if (exists) {
      throw new Error("This search already exists.");
    }

    return SavedSearchRepository.create(data);
  }

  static rename(id: string, name: string) {
    return SavedSearchRepository.rename(id, name);
  }

  static setActive(id: string, active: boolean) {
    return SavedSearchRepository.setActive(id, active);
  }

  static delete(id: string) {
    return SavedSearchRepository.delete(id);
  }
}
