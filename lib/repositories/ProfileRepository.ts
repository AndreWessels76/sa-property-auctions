import { BaseRepository } from "./BaseRepository";
import type { CurrentProfile } from "@/lib/auth/profileTypes";

export class ProfileRepository extends BaseRepository {
  static async findById(id: string): Promise<CurrentProfile | null> {
    const db = await this.db();

    const { data, error } = await db
      .from("profiles")
      .select(
        `
        id,
        first_name,
        last_name,
        avatar_url,
        role,
        subscription_status
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.handleError("ProfileRepository.findById", error);
    }

    return data;
  }

  static async upsert(
    id: string,
    values: Record<string, unknown>,
  ): Promise<CurrentProfile> {
    const db = await this.db();

    const { data, error } = await db
      .from("profiles")
      .upsert(
        {
          id,
          ...values,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select(
        `
        id,
        first_name,
        last_name,
        avatar_url,
        role,
        subscription_status
      `,
      )
      .single();

    if (error) {
      this.handleError("ProfileRepository.upsert", error);
    }

    return data;
  }

  static async update(
    id: string,
    updates: Record<string, unknown>,
  ): Promise<CurrentProfile> {
    const db = await this.db();

    const { data, error } = await db
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        `
        id,
        first_name,
        last_name,
        avatar_url,
        role,
        subscription_status
      `,
      )
      .single();

    if (error) {
      this.handleError("ProfileRepository.update", error);
    }

    return data;
  }

  static async exists(id: string): Promise<boolean> {
    const db = await this.db();

    const { count, error } = await db
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("id", id);

    if (error) {
      this.handleError("ProfileRepository.exists", error);
    }

    return (count ?? 0) > 0;
  }
}
