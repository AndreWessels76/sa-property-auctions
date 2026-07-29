import { findDuplicate } from "@/lib/imports/findDuplicate";
import { updateProperty } from "@/lib/imports/updateProperty";
import { logMergeHistory } from "@/lib/imports/mergeHistory";
import { getPropertyChanges } from "@/lib/ai/getPropertyChanges";
import { mergeProperty } from "@/lib/ai/mergeProperty";
import { saveProperty } from "./database";
import type { Property } from "@/lib/types/property";
import type { ImportResult, PropertyImporter } from "./types";

export class BankImporter implements PropertyImporter {
  source = "Bank";

  async importProperties(): Promise<Property[]> {
    return [];
  }

  async sync(): Promise<ImportResult> {
    const properties = await this.importProperties();

    let inserted = 0;
    let updated = 0;

    for (const property of properties) {
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

        updated++;
      } else {
        await saveProperty(property);

        await logMergeHistory(
          property.id,
          property.source ?? this.source,
          "Created",
          "Property imported",
        );

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
