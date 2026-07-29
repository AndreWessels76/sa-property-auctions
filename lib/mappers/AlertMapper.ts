import type { AlertDTO } from "@/lib/dto/AlertDTO";
import type { Alert } from "@/lib/repositories/AlertRepository";

export class AlertMapper {
  static toDTO(alert: Alert): AlertDTO {
    return {
      id: alert.id,
      userId: alert.user_id,
      propertyId: alert.property_id,
      alertType: alert.alert_type as AlertDTO["alertType"],
      title: alert.title,
      message: alert.message ?? "",
      read: alert.read,
      createdAt: alert.created_at,
    };
  }
}
