import type { Property } from "@/lib/types/property";

export interface ImportResult {
  source: string;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface PropertyImporter {
  source: string;

  importProperties(): Promise<Property[]>;

  sync(): Promise<ImportResult>;
}