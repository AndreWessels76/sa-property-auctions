import type { PropertyDTO } from "@/lib/dto/PropertyDTO";
import type { SavedSearchDTO } from "@/lib/dto/SavedSearchDTO";
import { AlertEngine } from "@/lib/alerts";
import {
  AlertRepository,
  type AlertType,
} from "@/lib/repositories/AlertRepository";
import { SavedSearchRepository } from "@/lib/repositories/SavedSearchRepository";

export class AlertService {
  static async processProperty(
    property: PropertyDTO,
    options?: {
      savedSearches?: SavedSearchDTO[];
      previousPrice?: number | null;
    },
  ): Promise<number> {
    const searches =
      options?.savedSearches ?? (await SavedSearchRepository.listAllActive());

    const { matches } = AlertEngine.evaluate(property, searches, {
      previousPrice: options?.previousPrice,
    });

    let created = 0;

    for (const match of matches) {
      if (
        await shouldSkipAlert(
          match.userId,
          match.propertyId,
          match.type,
          match.message,
        )
      ) {
        continue;
      }

      await AlertRepository.create({
        userId: match.userId,
        propertyId: match.propertyId,
        alertType: match.type,
        title: match.title,
        message: match.message,
      });

      created += 1;
    }

    return created;
  }

  static evaluate(
    property: PropertyDTO,
    savedSearches: SavedSearchDTO[],
    previousPrice?: number | null,
  ) {
    return AlertEngine.evaluate(property, savedSearches, { previousPrice });
  }
}

async function shouldSkipAlert(
  userId: string,
  propertyId: string,
  alertType: AlertType,
  message: string,
): Promise<boolean> {
  const exists = await AlertRepository.exists(
    userId,
    propertyId,
    alertType,
  );

  if (!exists) {
    return false;
  }

  if (alertType === "PRICE_DROP") {
    const prior = await AlertRepository.listByUserAndType(
      userId,
      propertyId,
      alertType,
    );

    return prior.some((alert) => alert.message === message);
  }

  return true;
}
