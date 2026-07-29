export interface AlertDTO {
  id: string;

  userId: string;

  propertyId: string | null;

  alertType:
    | "NEW_MATCH"
    | "PRICE_DROP"
    | "HIDDEN_GEM"
    | "HIGH_SCORE";

  title: string;

  message: string;

  read: boolean;

  createdAt: string;
}