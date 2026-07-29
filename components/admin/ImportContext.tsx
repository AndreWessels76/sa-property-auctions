"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getLatestImportJobs } from "@/lib/importJobs";

export type ImportStatus =
  | "Ready"
  | "Running"
  | "Completed"
  | "Failed";

export interface ImportSourceState {
  status: ImportStatus;
  lastRun: string;
  imported: number;
  updated: number;
  properties: number;
}

type ImportContextType = {
  imports: Record<string, ImportSourceState>;

  updateImport: (
    source: string,
    data: Partial<ImportSourceState>
  ) => void;
};

const ImportContext = createContext<ImportContextType | null>(null);

const defaultState: ImportSourceState = {
  status: "Ready",
  lastRun: "Never",
  imported: 0,
  updated: 0,
  properties: 0,
};

export function ImportProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [imports, setImports] = useState({
    Sheriff: { ...defaultState },
    Bank: { ...defaultState },
    Auctioneers: { ...defaultState },
    CSV: { ...defaultState },
  });

  function updateImport(
    source: string,
    data: Partial<ImportSourceState>
  ) {
    setImports((prev) => ({
      ...prev,
      [source]: {
        ...prev[source as keyof typeof prev],
        ...data,
      },
    }));
  }

  useEffect(() => {
    async function load() {
      const jobs = await getLatestImportJobs();

      jobs.forEach((job) => {
        updateImport(job.source, {
          status: job.status,
          imported: job.imported,
          updated: job.updated,
          properties: job.properties,
          lastRun: new Date(job.last_run).toLocaleString(),
        });
      });
    }

    load();
  }, []);

  return (
    <ImportContext.Provider
      value={{
        imports,
        updateImport,
      }}
    >
      {children}
    </ImportContext.Provider>
  );
}

export function useImportContext() {
  const context = useContext(ImportContext);

  if (!context)
    throw new Error("Missing ImportProvider");

  return context;
}
