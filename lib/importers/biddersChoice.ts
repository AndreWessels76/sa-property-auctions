import { PropertyAcquisitionEngine } from "@/lib/acquisition/PropertyAcquisitionEngine";
import { BiddersChoiceConnector } from "@/lib/connectors/biddersChoice/BiddersChoiceConnector";
import { mapLicensedPayload } from "@/lib/connectors/biddersChoice/extractListing";
import type { ImportResult, PropertyImporter } from "./types";
import type { Property } from "@/lib/types/property";

export type BiddersChoiceSyncOptions = {
  listingUrls?: string[];
  licensedRows?: Record<string, unknown>[];
  allowPublicFetch?: boolean;
  maxListings?: number;
};

/**
 * Admin/importer adapter for Bidders Choice acquisition engine.
 */
export class BiddersChoiceImporter implements PropertyImporter {
  source = "BiddersChoice";

  async importProperties(): Promise<Property[]> {
    return [];
  }

  async sync(options: BiddersChoiceSyncOptions = {}): Promise<ImportResult> {
    const engine = new PropertyAcquisitionEngine(new BiddersChoiceConnector());
    const licensedPayloads = options.licensedRows
      ?.map((row) => mapLicensedPayload(row))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const result = await engine.run({
      listingUrls: options.listingUrls,
      licensedPayloads,
      allowPublicFetch: options.allowPublicFetch === true,
      maxListings: options.maxListings ?? 40,
    });

    return {
      source: this.source,
      imported: result.imported,
      updated: result.updated,
      skipped: result.rejected,
      errors: result.errors,
    };
  }
}
