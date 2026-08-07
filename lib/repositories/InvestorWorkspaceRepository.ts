import { BaseRepository } from "./BaseRepository";
import type { SmartAlertRule } from "@/lib/alerts/smartAlertRules";

function missingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export class InvestorWorkspaceRepository extends BaseRepository {
  static async listNotes(userId: string, propertyId?: string) {
    const db = await this.db();
    let q = db
      .from("investor_workspace_notes")
      .select("*")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });
    if (propertyId) q = q.eq("property_id", propertyId);
    const { data, error } = await q;
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("InvestorWorkspaceRepository.listNotes", error);
    }
    return data ?? [];
  }

  static async createNote(input: {
    userId: string;
    propertyId?: string | null;
    title?: string | null;
    body: string;
    noteType?: string;
  }) {
    const db = await this.db();
    const { data, error } = await db
      .from("investor_workspace_notes")
      .insert({
        user_id: input.userId,
        property_id: input.propertyId ?? null,
        title: input.title ?? null,
        body: input.body,
        note_type: input.noteType ?? "general",
      })
      .select("*")
      .maybeSingle();
    if (error) {
      if (missingRelation(error)) return null;
      this.handleError("InvestorWorkspaceRepository.createNote", error);
    }
    return data;
  }

  static async listDocuments(userId: string, propertyId?: string) {
    const db = await this.db();
    let q = db
      .from("investor_workspace_documents")
      .select("*")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });
    if (propertyId) q = q.eq("property_id", propertyId);
    const { data, error } = await q;
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("InvestorWorkspaceRepository.listDocuments", error);
    }
    return data ?? [];
  }

  static async upsertTracker(input: {
    userId: string;
    propertyId: string;
    viewingDate?: string | null;
    registrationStatus?: string | null;
    legalStatus?: string | null;
    settlementStatus?: string | null;
    archived?: boolean;
  }) {
    const db = await this.db();
    const { data, error } = await db
      .from("investor_workspace_trackers")
      .upsert(
        {
          user_id: input.userId,
          property_id: input.propertyId,
          viewing_date: input.viewingDate ?? null,
          registration_status: input.registrationStatus ?? null,
          legal_status: input.legalStatus ?? null,
          settlement_status: input.settlementStatus ?? null,
          archived: input.archived ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,property_id" },
      )
      .select("*")
      .maybeSingle();
    if (error) {
      if (missingRelation(error)) return null;
      this.handleError("InvestorWorkspaceRepository.upsertTracker", error);
    }
    return data;
  }

  static async listTrackers(userId: string) {
    const db = await this.db();
    const { data, error } = await db
      .from("investor_workspace_trackers")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("updated_at", { ascending: false });
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("InvestorWorkspaceRepository.listTrackers", error);
    }
    return data ?? [];
  }
}

export class SmartAlertRepository extends BaseRepository {
  static async listByUser(userId: string): Promise<SmartAlertRule[]> {
    const db = await this.db();
    const { data, error } = await db
      .from("smart_alert_rules")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("SmartAlertRepository.listByUser", error);
    }
    return (data as SmartAlertRule[]) ?? [];
  }

  static async listActive(): Promise<SmartAlertRule[]> {
    const db = this.adminDb();
    const { data, error } = await db
      .from("smart_alert_rules")
      .select("*")
      .eq("is_active", true);
    if (error) {
      if (missingRelation(error)) return [];
      this.handleError("SmartAlertRepository.listActive", error);
    }
    return (data as SmartAlertRule[]) ?? [];
  }

  static async create(
    userId: string,
    rule: Omit<SmartAlertRule, "id" | "user_id">,
  ): Promise<SmartAlertRule | null> {
    const db = await this.db();
    const { data, error } = await db
      .from("smart_alert_rules")
      .insert({
        user_id: userId,
        name: rule.name,
        is_active: rule.is_active ?? true,
        province: rule.province ?? null,
        town: rule.town ?? null,
        agency: rule.agency ?? null,
        property_type: rule.property_type ?? null,
        max_price: rule.max_price ?? null,
        days_until_auction: rule.days_until_auction ?? null,
        channels: rule.channels ?? ["email"],
      })
      .select("*")
      .maybeSingle();
    if (error) {
      if (missingRelation(error)) return null;
      this.handleError("SmartAlertRepository.create", error);
    }
    return data as SmartAlertRule | null;
  }
}
