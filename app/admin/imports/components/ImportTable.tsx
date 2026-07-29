import { getImportSources } from "@/lib/imports/sourceService";
import ImportTableClient from "./ImportTableClient";

export default async function ImportTable() {
  const sources = await getImportSources();

  return (
    <ImportTableClient
      sources={sources.map((source) => ({
        id: String(source.id),
        name: String(source.name ?? ""),
        status: source.status,
        last_run: source.last_run,
        next_run: source.next_run,
      }))}
    />
  );
}
