import { NextResponse } from "next/server";
import { PermissionService } from "@/lib/auth/PermissionService";
import { refreshPropertyCache } from "@/lib/services";
import { importers } from "@/lib/importers";
import {
  createImportJob,
  finishImportJob,
} from "@/lib/imports/jobService";
import { logJob } from "@/lib/imports/jobLogger";
import {
  getImportSources,
  updateImportSource,
} from "@/lib/imports/sourceService";
import { jsonError } from "@/lib/api/http";
import { clientIp, rateLimit } from "@/lib/api/rateLimit";
import { LoggerService } from "@/lib/logger";

export async function POST(request: Request) {
  let sourceId: string | undefined;
  let job: { id: string } | undefined;

  try {
    await PermissionService.requireAdmin();

    const limited = rateLimit({
      key: `imports:run:${clientIp(request)}`,
      limit: 5,
      windowMs: 60_000,
    });

    if (limited) {
      return limited;
    }

    const body = (await request.json()) as {
      source?: string;
      sourceId?: string;
    };

    const sourceName = body.source?.trim();
    sourceId = body.sourceId?.trim();
    const sources = await getImportSources();

    let source = sourceId
      ? sources.find((item) => item.id === sourceId)
      : undefined;

    if (!source && sourceName) {
      source = sources.find(
        (item) =>
          item.name === sourceName ||
          item.name?.toLowerCase().includes(sourceName.toLowerCase()),
      );
      sourceId = source?.id;
    }

    if (!sourceName && !sourceId) {
      return NextResponse.json(
        { error: "Missing source" },
        { status: 400 },
      );
    }

    if (sourceId) {
      await updateImportSource(sourceId, {
        status: "Running",
        last_run: new Date().toISOString(),
      });
    }

    if (source?.id) {
      job = await createImportJob(source.id);

      await logJob(
        job!.id,
        "INFO",
        `Starting ${source.name ?? sourceName ?? "Import"} Import`,
      );
    }

    const importerKey =
      sourceName && sourceName in importers
        ? sourceName
        : Object.keys(importers).find((key) =>
            sourceName?.toLowerCase().includes(key.toLowerCase()),
          );

    const importer =
      importers[(importerKey ?? sourceName) as keyof typeof importers];

    if (!importer) {
      if (sourceId) {
        await updateImportSource(sourceId, {
          status: "Failed",
          last_error: "Importer not found.",
        });
      }

      return NextResponse.json(
        { error: "Importer not found." },
        { status: 404 },
      );
    }

    if (job) {
      await logJob(
        job.id,
        "INFO",
        "Downloading property images",
      );

      await logJob(
        job.id,
        "INFO",
        "Merge Engine Started",
      );
    }

    const result = await importer.sync();

    const importedCount = result.imported ?? 0;
    const imageCount = 0;
    const duplicates = result.skipped ?? 0;
    const merges = result.updated ?? 0;
    const errors = result.errors?.length ?? 0;

    if (job) {
      await finishImportJob(job.id, {
        properties: importedCount,
        images: imageCount,
        duplicates,
        merges,
        errors,
      });

      await logJob(
        job.id,
        "SUCCESS",
        "Import completed successfully",
      );
    }

    if (sourceId && source) {
      await updateImportSource(sourceId, {
        status: "Online",
        properties_imported:
          (source.properties_imported ?? 0) + importedCount,
        images_imported: (source.images_imported ?? 0) + imageCount,
        duplicate_count: (source.duplicate_count ?? 0) + duplicates,
        merge_count: (source.merge_count ?? 0) + merges,
      });
    }

    await refreshPropertyCache();

    return NextResponse.json(result);
  } catch (error) {
    if (job) {
      await logJob(
        job.id,
        "ERROR",
        error instanceof Error ? error.message : "Unknown error",
      );
    }

    if (sourceId) {
      await updateImportSource(sourceId, {
        status: "Failed",
        last_error:
          error instanceof Error ? error.message : "Unknown error",
      });
    }

    LoggerService.import("Import run failed", {
      sourceId,
      error: error instanceof Error ? error.message : "unknown",
    });

    return jsonError(error, "Import failed");
  }
}
