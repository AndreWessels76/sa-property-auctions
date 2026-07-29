import { BaseRepository } from "./BaseRepository";
import type { SavedSearchDTO } from "@/lib/dto/SavedSearchDTO";
import type { PropertySearchDTO } from "@/lib/dto/PropertySearchDTO";

export type SavedSearch = {
  id: string;
  user_id: string;
  name: string;
  filters: PropertySearchDTO;
  active: boolean;
  created_at: string;
};

export type UpdateSavedSearchInput = Partial<
  Pick<SavedSearchDTO, "name" | "filters" | "active">
>;

export class SavedSearchRepository extends BaseRepository {
  static toDTO(row: SavedSearch): SavedSearchDTO {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      filters: row.filters ?? {},
      active: row.active,
      createdAt: row.created_at,
    };
  }

  static async exists(
    userId: string,
    filters: PropertySearchDTO,
  ): Promise<boolean> {
    const db = await this.db();

    const { count, error } = await db
      .from("saved_searches")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId)
      .eq("filters", filters);

    if (error) {
      this.handleError("SavedSearchRepository.exists", error);
    }

    return (count ?? 0) > 0;
  }

  static async findById(id: string): Promise<SavedSearchDTO | null> {
    const db = await this.db();

    const { data, error } = await db
      .from("saved_searches")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.handleError("SavedSearchRepository.findById", error);
    }

    if (!data) {
      return null;
    }

    return this.toDTO(data as SavedSearch);
  }

  static async update(
    id: string,
    data: UpdateSavedSearchInput,
  ): Promise<SavedSearchDTO> {
    const db = await this.db();
    const updates: Record<string, unknown> = {};

    if (data.name != null) {
      updates.name = data.name;
    }

    if (data.filters != null) {
      updates.filters = data.filters;
    }

    if (data.active != null) {
      updates.active = data.active;
    }

    const { data: row, error } = await db
      .from("saved_searches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.handleError("SavedSearchRepository.update", error);
    }

    return this.toDTO(row as SavedSearch);
  }

  static async rename(id: string, name: string): Promise<void> {
    const db = await this.db();

    const { error } = await db
      .from("saved_searches")
      .update({ name })
      .eq("id", id);

    if (error) {
      this.handleError("SavedSearchRepository.rename", error);
    }
  }

  static async setActive(id: string, active: boolean): Promise<void> {
    const db = await this.db();

    const { error } = await db
      .from("saved_searches")
      .update({ active })
      .eq("id", id);

    if (error) {
      this.handleError("SavedSearchRepository.setActive", error);
    }
  }

  static async delete(id: string): Promise<void> {
    const db = await this.db();

    const { error } = await db
      .from("saved_searches")
      .delete()
      .eq("id", id);

    if (error) {
      this.handleError("SavedSearchRepository.delete", error);
    }
  }

  static async listAllActive(): Promise<SavedSearchDTO[]> {
    const db = await this.db();

    const { data, error } = await db
      .from("saved_searches")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      this.handleError("SavedSearchRepository.listAllActive", error);
    }

    return ((data as SavedSearch[]) ?? []).map((row) => this.toDTO(row));
  }

  static async getUserSearches(userId: string): Promise<SavedSearchDTO[]> {
    const db = await this.db();

    const { data, error } = await db
      .from("saved_searches")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      this.handleError("SavedSearchRepository.getUserSearches", error);
    }

    return ((data as SavedSearch[]) ?? []).map((row) => this.toDTO(row));
  }

  static async create(
    search: Omit<SavedSearchDTO, "id" | "createdAt">,
  ): Promise<SavedSearchDTO> {
    const db = await this.db();

    const { data, error } = await db
      .from("saved_searches")
      .insert({
        user_id: search.userId,
        name: search.name,
        filters: search.filters,
        active: search.active,
      })
      .select()
      .single();

    if (error) {
      this.handleError("SavedSearchRepository.create", error);
    }

    return this.toDTO(data as SavedSearch);
  }
}
