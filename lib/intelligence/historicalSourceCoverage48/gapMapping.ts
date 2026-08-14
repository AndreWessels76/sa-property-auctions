/**
 * Map HSC 4.8 diagnostics to existing II 4.6 acquisition gap codes.
 * Does not create a new gap system.
 */

import type { AcquisitionGapCode } from "@/lib/intelligence/investorIntelligence46/types";
import type { Hsc48DiagnosticState } from "./diagnosticStates";

export function gapCodesForDiagnostic(state: Hsc48DiagnosticState): AcquisitionGapCode[] {
  switch (state) {
    case "SOURCE_NOT_FOUND":
    case "SOURCE_INELIGIBLE":
      return ["SOURCE_MISSING"];
    case "SOURCE_LICENSE_BLOCKED":
    case "SOURCE_NOT_LICENSED":
      return ["SOURCE_MISSING"];
    case "FETCH_NOT_ATTEMPTED":
    case "FETCH_NETWORK_ERROR":
    case "FETCH_TLS_ERROR":
    case "FETCH_DNS_ERROR":
    case "FETCH_TIMEOUT":
    case "FETCH_HTTP_ERROR":
    case "FETCH_HTTP_403":
    case "FETCH_HTTP_404":
    case "FETCH_HTTP_429":
    case "FETCH_HTTP_5XX":
    case "FETCH_REDIRECT_ERROR":
      return ["SOURCE_MISSING"];
    case "SNAPSHOT_NOT_CREATED":
      return ["SOURCE_MISSING"];
    case "EXTRACTION_NOT_RUN":
    case "EXTRACTION_FAILED":
      return ["SALE_OUTCOME_MISSING"];
    case "EXTRACTION_SUCCESS_NO_EVIDENCE":
    case "OUTCOME_NOT_FOUND":
      return ["SALE_OUTCOME_MISSING"];
    case "SALE_PRICE_NOT_FOUND":
      return ["SALE_PRICE_MISSING"];
    case "IDENTITY_REVIEW_REQUIRED":
      return ["IDENTITY_REVIEW_REQUIRED"];
    case "CONFLICT_REVIEW_REQUIRED":
      return ["IDENTITY_REVIEW_REQUIRED"];
    case "INSUFFICIENT_DATA":
      return ["SALE_OUTCOME_MISSING", "SALE_PRICE_MISSING"];
    case "READY_FOR_INTELLIGENCE":
      return [];
    case "FETCH_SUCCESS_NO_CONTENT":
    case "FETCH_SUCCESS":
    case "SNAPSHOT_CREATED":
    case "NO_CHANGE":
    case "EXTRACTION_COMPLETED":
      return ["SALE_OUTCOME_MISSING"];
    default:
      return [];
  }
}

export function acquisitionWouldReduceGap(state: Hsc48DiagnosticState): boolean {
  return [
    "FETCH_NOT_ATTEMPTED",
    "FETCH_HTTP_429",
    "FETCH_HTTP_5XX",
    "FETCH_TIMEOUT",
    "SNAPSHOT_NOT_CREATED",
    "EXTRACTION_NOT_RUN",
  ].includes(state);
}
