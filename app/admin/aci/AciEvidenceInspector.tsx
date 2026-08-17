"use client";

export default function AciEvidenceInspector({
  inspector,
}: {
  inspector: {
    source: string | null;
    sourceUrl: string | null;
    snapshotId: string | null;
    extractionId: string | null;
    observationType: string;
    observationId: string;
    rawClassification: string;
    resolvedClassification: string;
    confidence: string | null;
    createdAt: string | null;
    secrets: { url: string; credentials: string };
  };
}) {
  return (
    <details className="rounded-2xl border bg-white p-5 shadow-sm">
      <summary className="cursor-pointer font-semibold">Evidence Inspector</summary>
      <dl className="mt-3 space-y-1 text-sm">
        <Row label="Source" value={inspector.source} />
        <Row label="URL / reference" value={inspector.sourceUrl} />
        <Row label="Snapshot ID" value={inspector.snapshotId} />
        <Row label="Extraction ID" value={inspector.extractionId} />
        <Row label="Observation type" value={inspector.observationType} />
        <Row label="Observation ID" value={inspector.observationId} />
        <Row label="Raw classification" value={inspector.rawClassification} />
        <Row label="Resolved classification" value={inspector.resolvedClassification} />
        <Row label="Confidence / quality" value={inspector.confidence} />
        <Row label="Created" value={inspector.createdAt} />
        <Row label="URL secret" value={inspector.secrets.url} />
        <Row label="Credentials" value={inspector.secrets.credentials} />
      </dl>
    </details>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{value ?? "UNKNOWN"}</dd>
    </div>
  );
}
