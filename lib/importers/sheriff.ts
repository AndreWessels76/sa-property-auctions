import { findDuplicate } from "@/lib/imports/findDuplicate";
import { updateProperty } from "@/lib/imports/updateProperty";
import { logMergeHistory } from "@/lib/imports/mergeHistory";
import { getPropertyChanges } from "@/lib/ai/getPropertyChanges";
import { mergeProperty } from "@/lib/ai/mergeProperty";
import { cleanProperty } from "@/lib/ai/cleaner";
import { SheriffConnector } from "@/lib/connectors/sheriff/connector";
import { processImage } from "@/lib/images/processImage";
import { markHeroAsPrimary } from "@/lib/images/markHeroAsPrimary";
import { saveProperty } from "./database";
import type { Property } from "@/lib/types/property";
import type { ImportResult, PropertyImporter } from "./types";

type ImportItem = {
  property: Property;
  imageUrls: string[];
};

function getImageUrls(item: Record<string, unknown>): string[] {
  if (Array.isArray(item.image_urls)) {
    return item.image_urls.filter(
      (url): url is string => typeof url === "string",
    );
  }

  if (typeof item.image_url === "string") {
    return [item.image_url];
  }

  return [];
}

async function processPropertyImages(
  propertyId: string,
  imageUrls: string[],
) {
  for (const image of imageUrls) {
    try {
      await processImage(propertyId, image, "Sheriff");
    } catch (error) {
      console.error("Image import failed", image, error);
    }
  }

  if (imageUrls.length > 0) {
    await markHeroAsPrimary(propertyId);
  }
}

export class SheriffImporter implements PropertyImporter {
  source = "Sheriff";

  async importProperties(): Promise<Property[]> {
    const items = await this.importItems();
    return items.map((item) => item.property);
  }

  async importItems(): Promise<ImportItem[]> {
    const connector = new SheriffConnector();
    const raw = await connector.fetch();

    return raw.map((item) => ({
      property: cleanProperty(connector.map(item)),
      imageUrls: getImageUrls(item),
    }));
  }

  async sync(): Promise<ImportResult> {
    const items = await this.importItems();

    let inserted = 0;
    let updated = 0;

    for (const { property, imageUrls } of items) {
      const duplicate = await findDuplicate(property);

      if (duplicate) {
        const existing = duplicate as Property;
        const merged = mergeProperty(existing, property);
        const changes = getPropertyChanges(existing, merged);

        await updateProperty(merged);

        await logMergeHistory(
          merged.id,
          property.source ?? this.source,
          "Merged",
          JSON.stringify(changes),
        );

        await processPropertyImages(merged.id, imageUrls);

        updated++;
      } else {
        await saveProperty(property);

        await logMergeHistory(
          property.id,
          property.source ?? this.source,
          "Created",
          "Property imported",
        );

        await processPropertyImages(property.id, imageUrls);

        inserted++;
      }
    }

    return {
      source: this.source,
      imported: inserted,
      updated,
      skipped: 0,
      errors: [],
    };
  }
}
