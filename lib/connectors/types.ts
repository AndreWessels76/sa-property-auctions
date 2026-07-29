import type { Property } from "@/lib/types/property";

export interface RawProperty {
  [key: string]: unknown;
}

export interface ImportConnector {
  source: string;

  fetch(): Promise<RawProperty[]>;

  map(data: RawProperty): Property;
}
