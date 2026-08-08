import type { ExtractionResult, FieldEvidence } from "@/lib/dueDiligence/extraction";
import type { ChangeClass, FieldChange, FieldChangeOutcome } from "./types";

/**
 * Compare previous vs new extraction — never silently overwrite VERIFIED.
 */
export function classifyFieldChange(input: {
  field: string;
  previous: FieldEvidence | undefined;
  next: FieldEvidence | undefined;
}): FieldChange | null {
  const prevVal = input.previous?.value ?? null;
  const nextVal = input.next?.value ?? null;
  const prevState = input.previous?.verification_state;

  if (prevVal == null && nextVal == null) return null;

  if (prevVal == null && nextVal != null) {
    return {
      field: input.field,
      previous: null,
      next: nextVal,
      outcome: "NEW",
      previousVerification: prevState ?? null,
      changeClass: mapFieldToClass(input.field),
    };
  }

  if (prevVal != null && nextVal == null) {
    const outcome: FieldChangeOutcome =
      prevState === "verified" ? "CONFLICT" : "REMOVED";
    return {
      field: input.field,
      previous: prevVal,
      next: null,
      outcome,
      previousVerification: prevState ?? null,
      changeClass:
        outcome === "CONFLICT"
          ? "CONFLICT_REVIEW_REQUIRED"
          : "SOURCE_VALUE_REMOVED",
    };
  }

  if (String(prevVal) === String(nextVal)) {
    return {
      field: input.field,
      previous: prevVal,
      next: nextVal,
      outcome: "UNCHANGED",
      previousVerification: prevState ?? null,
      changeClass: "NO_CHANGE",
    };
  }

  if (prevState === "verified") {
    return {
      field: input.field,
      previous: prevVal,
      next: nextVal,
      outcome: "CONFLICT",
      previousVerification: prevState,
      changeClass: "CONFLICT_REVIEW_REQUIRED",
    };
  }

  return {
    field: input.field,
    previous: prevVal,
    next: nextVal,
    outcome: "UPDATED",
    previousVerification: prevState ?? null,
    changeClass: mapFieldToClass(input.field),
  };
}

function mapFieldToClass(field: string): ChangeClass {
  if (field.includes("auction_date") || field.includes("auction_open") || field.includes("auction_close")) {
    return "AUCTION_DATE_CHANGED";
  }
  if (field.includes("auction") && field.includes("type")) {
    return "AUCTION_STATUS_CHANGED";
  }
  if (field.includes("land") || field.includes("hectare") || field.includes("erf")) {
    return "LAND_DATA_CHANGED";
  }
  if (field.includes("document") || field.includes("catalogue") || field.includes("conditions")) {
    return "DOCUMENT_ADDED";
  }
  if (field.includes("agency")) return "AGENCY_CHANGED";
  if (field.includes("zoning") || field.includes("servitude") || field.includes("lease")) {
    return "LEGAL_DATA_CHANGED";
  }
  return "PROPERTY_DATA_CHANGED";
}

export function detectExtractionChanges(
  previous: ExtractionResult | null,
  next: ExtractionResult,
): FieldChange[] {
  const prevMap = new Map(
    (previous?.fields ?? []).map((f) => [f.field, f]),
  );
  const nextMap = new Map(next.fields.map((f) => [f.field, f]));
  const keys = new Set([...prevMap.keys(), ...nextMap.keys()]);
  const out: FieldChange[] = [];
  for (const key of keys) {
    const change = classifyFieldChange({
      field: key,
      previous: prevMap.get(key),
      next: nextMap.get(key),
    });
    if (change && change.outcome !== "UNCHANGED") out.push(change);
  }
  return out;
}

export function summarizeChangeClasses(changes: FieldChange[]): ChangeClass[] {
  const set = new Set<ChangeClass>();
  for (const c of changes) {
    if (c.changeClass !== "NO_CHANGE") set.add(c.changeClass);
  }
  if (set.size === 0) set.add("NO_CHANGE");
  return [...set];
}

export function detectDocumentUrlChanges(
  previousUrls: string[],
  nextUrls: string[],
): FieldChange[] {
  const prev = new Set(previousUrls);
  const next = new Set(nextUrls);
  const out: FieldChange[] = [];
  for (const url of next) {
    if (!prev.has(url)) {
      out.push({
        field: "document_url",
        previous: null,
        next: url,
        outcome: "NEW",
        changeClass: "DOCUMENT_ADDED",
      });
    }
  }
  for (const url of prev) {
    if (!next.has(url)) {
      out.push({
        field: "document_url",
        previous: url,
        next: null,
        outcome: "REMOVED",
        changeClass: "DOCUMENT_REMOVED",
      });
    }
  }
  return out;
}
