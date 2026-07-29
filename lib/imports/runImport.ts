import type { ImportConnector } from "@/lib/connectors/baseConnector";

export async function runImport(connector: ImportConnector) {
  const result = await connector.import();
  return result;
}
