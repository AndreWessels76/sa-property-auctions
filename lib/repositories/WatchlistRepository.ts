import { BaseRepository } from "./BaseRepository";

export type WatchlistItem = {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
};

export class WatchlistRepository extends BaseRepository {
  static async add(userId: string, propertyId: string): Promise<WatchlistItem> {
    const db = await this.db();

    const { data, error } = await db
      .from("watchlist")
      .insert({
        user_id: userId,
        property_id: propertyId,
      })
      .select()
      .single();

    if (error) {
      this.handleError("WatchlistRepository.add", error);
    }

    return data as WatchlistItem;
  }

  static async remove(userId: string, propertyId: string): Promise<void> {
    const db = await this.db();

    const { error } = await db
      .from("watchlist")
      .delete()
      .eq("user_id", userId)
      .eq("property_id", propertyId);

    if (error) {
      this.handleError("WatchlistRepository.remove", error);
    }
  }

  static async exists(userId: string, propertyId: string): Promise<boolean> {
    const db = await this.db();

    const { data, error } = await db
      .from("watchlist")
      .select("id")
      .eq("user_id", userId)
      .eq("property_id", propertyId)
      .maybeSingle();

    if (error) {
      this.handleError("WatchlistRepository.exists", error);
    }

    return Boolean(data);
  }

  static async list(userId: string): Promise<WatchlistItem[]> {
    const db = await this.db();

    const { data, error } = await db
      .from("watchlist")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      this.handleError("WatchlistRepository.list", error);
    }

    return (data as WatchlistItem[]) ?? [];
  }
}
