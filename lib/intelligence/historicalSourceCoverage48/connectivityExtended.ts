/**
 * HSA 4.9 — extended connectivity with QUERY_ERROR distinction.
 */

import {
  diagnoseConnectivity,
  type ConnectivityDiagnostic,
  type ConnectivityProbe,
} from "@/lib/intelligence/investorIntelligence47/connectivityDiagnostic";

export type ExtendedConnectivityStatus =
  | "CONNECTED"
  | "LIVE_DATA_UNAVAILABLE"
  | "EMPTY_DATABASE"
  | "AUTH_ERROR"
  | "QUERY_ERROR";

export type ExtendedConnectivityDiagnostic = ConnectivityDiagnostic & {
  extendedStatus: ExtendedConnectivityStatus;
};

export function diagnoseConnectivityExtended(
  probe: ConnectivityProbe,
): ExtendedConnectivityDiagnostic {
  const base = diagnoseConnectivity(probe);
  const errors = [probe.propertiesError, probe.eventsError].filter(Boolean) as string[];

  if (base.status === "AUTH_ERROR") {
    return { ...base, extendedStatus: "AUTH_ERROR" };
  }
  if (base.status === "LIVE_DATA_UNAVAILABLE") {
    return { ...base, extendedStatus: "LIVE_DATA_UNAVAILABLE" };
  }
  if (base.status === "EMPTY_DATABASE") {
    return { ...base, extendedStatus: "EMPTY_DATABASE" };
  }

  if (
    errors.length > 0 &&
    (probe.propertiesCount === null || probe.eventsCount === null)
  ) {
    return {
      ...base,
      status: "LIVE_DATA_UNAVAILABLE",
      extendedStatus: "QUERY_ERROR",
      message: `Query error — do not interpret as empty database: ${errors[0]}`,
      genuinelyEmpty: false,
    };
  }

  return { ...base, extendedStatus: "CONNECTED" };
}
