"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { importers } from "@/lib/importers";
import { useImportContext } from "./ImportContext";
import { saveImportJob } from "@/lib/importJobs";

type Props = {
  source: string;
};

export default function ImportButton({ source }: Props) {
  const [loading, setLoading] = useState(false);
  const { updateImport } = useImportContext();

  async function runImport() {
    setLoading(true);
    updateImport(source, { status: "Running" });

    try {
      const importer = importers[source as keyof typeof importers];

      if (!importer) {
        throw new Error("Importer not found.");
      }

      const response = await fetch("/api/imports/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error);
      }
      await saveImportJob({

        source,
    
        status:"Completed",
    
        imported:result.imported,
    
        updated:result.updated,
    
        properties:
            result.imported + result.updated
    
    });

      updateImport(source, {
        status: "Completed",
        lastRun: new Date().toLocaleString(),
        imported: result.imported,
        updated: result.updated,
        properties: result.imported + result.updated,
      });

      toast.success(
        `${result.source}: imported ${result.imported}, updated ${result.updated}`,
      );
    } catch (error) {
      updateImport(source, { status: "Failed" });

      toast.error(
        error instanceof Error ? error.message : "Import failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={runImport}
      disabled={loading}
      className="mt-6 flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-3 font-bold text-navy-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Running...
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          Run Import
        </>
      )}
    </button>
  );
}
