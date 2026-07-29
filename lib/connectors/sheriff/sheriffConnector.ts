import {
  ImportConnector,
  PropertyImportResult,
} from "../baseConnector";
import { normalizeProperty } from "@/lib/imports/normalizer/normalizeProperty";

export class SheriffConnector implements ImportConnector {
  name = "Sheriff";

  async import(): Promise<PropertyImportResult> {
    const rawProperties: Record<string, any>[] = [];

    const normalized = rawProperties.map((property) =>
      normalizeProperty("Sheriff", property),
    );

    return {
      success: true,
      properties: normalized,
      errors: [],
    };
  }
}
