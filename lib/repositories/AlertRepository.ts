import { BaseRepository } from "./BaseRepository";

export type AlertType =
  | "NEW_MATCH"
  | "PRICE_DROP"
  | "HIDDEN_GEM"
  | "HIGH_SCORE";

export type Alert = {
  id: string;
  user_id: string;
  property_id: string | null;
  alert_type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
};

export type CreateAlertInput = {
  userId: string;
  propertyId?: string | null;
  alertType: string;
  title: string;
  message: string;
};

export class AlertRepository extends BaseRepository {
  static async create(alert: CreateAlertInput): Promise<void> {
    const db = await this.db();

    const { error } = await db.from("alerts").insert({
      user_id: alert.userId,
      property_id: alert.propertyId ?? null,
      alert_type: alert.alertType,
      title: alert.title,
      message: alert.message,
      read: false,
    });

    if (error) {
      this.handleError("AlertRepository.create", error);
    }
  }

  static async unread(userId: string): Promise<Alert[]> {
    const db = await this.db();

    const { data, error } = await db
      .from("alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false });

    if (error) {
      this.handleError("AlertRepository.unread", error);
    }

    return (data as Alert[]) ?? [];
  }

  static async markRead(id: string): Promise<void> {
    const db = await this.db();

    const { error } = await db
      .from("alerts")
      .update({ read: true })
      .eq("id", id);

    if (error) {
      this.handleError("AlertRepository.markRead", error);
    }
  }

  static async exists(
    userId: string,
    propertyId: string,
    alertType: string,
  ): Promise<boolean> {
    const db = await this.db();

    const { data, error } = await db
      .from("alerts")
      .select("id")
      .eq("user_id", userId)
      .eq("property_id", propertyId)
      .eq("alert_type", alertType)
      .maybeSingle();

    if (error) {
      this.handleError("AlertRepository.exists", error);
    }

    return Boolean(data);
  }

  static async listByUserAndType(
    userId: string,
    propertyId: string,
    alertType: string,
  ): Promise<Alert[]> {
    const db = await this.db();

    const { data, error } = await db
      .from("alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("property_id", propertyId)
      .eq("alert_type", alertType)
      .order("created_at", { ascending: false });

    if (error) {
      this.handleError("AlertRepository.listByUserAndType", error);
    }

    return (data as Alert[]) ?? [];
  }

  static async listRecent(userId: string, limit = 12): Promise<Alert[]> {
    const db = await this.db();

    const { data, error } = await db
      .from("alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      if (error.code === "42P01" || msg.includes("does not exist")) {
        return [];
      }
      this.handleError("AlertRepository.listRecent", error);
    }

    return (data as Alert[]) ?? [];
  }
}
