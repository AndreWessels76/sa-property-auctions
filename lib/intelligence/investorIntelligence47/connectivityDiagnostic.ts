/**
 * Production connectivity diagnostic — distinguishes empty DB from unreachable DB.
 * Never treat silent fetch failures as "0 properties".
 */

export type ConnectivityStatus =
  | "CONNECTED"
  | "LIVE_DATA_UNAVAILABLE"
  | "EMPTY_DATABASE"
  | "AUTH_ERROR";

export type ConnectivityProbe = {
  propertiesCount: number | null;
  eventsCount: number | null;
  propertiesError: string | null;
  eventsError: string | null;
  envPresent: boolean;
};

export type ConnectivityDiagnostic = {
  status: ConnectivityStatus;
  message: string;
  probe: ConnectivityProbe;
  genuinelyEmpty: boolean;
};

function isAuthError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("invalid api key") ||
    m.includes("jwt") ||
    m.includes("unauthorized") ||
    m.includes("permission denied")
  );
}

function isNetworkError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("fetch failed") ||
    m.includes("network") ||
    m.includes("econnrefused") ||
    m.includes("enotfound") ||
    m.includes("certificate") ||
    m.includes("tls") ||
    m.includes("unable to verify")
  );
}

export function diagnoseConnectivity(probe: ConnectivityProbe): ConnectivityDiagnostic {
  if (!probe.envPresent) {
    return {
      status: "LIVE_DATA_UNAVAILABLE",
      message:
        "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
      probe,
      genuinelyEmpty: false,
    };
  }

  const errors = [probe.propertiesError, probe.eventsError].filter(Boolean) as string[];

  if (errors.some(isAuthError)) {
    return {
      status: "AUTH_ERROR",
      message: "Supabase authentication failed — check service role key",
      probe,
      genuinelyEmpty: false,
    };
  }

  if (
    errors.length > 0 &&
    errors.every((e) => isNetworkError(e) || e.includes("does not exist"))
  ) {
    return {
      status: "LIVE_DATA_UNAVAILABLE",
      message: `Production database unreachable: ${errors[0]}`,
      probe,
      genuinelyEmpty: false,
    };
  }

  if (probe.propertiesCount === null || probe.eventsCount === null) {
    const err = errors[0] ?? "Query failed without error detail";
    return {
      status: "LIVE_DATA_UNAVAILABLE",
      message: `Could not read authoritative tables: ${err}`,
      probe,
      genuinelyEmpty: false,
    };
  }

  if (probe.propertiesCount === 0 && probe.eventsCount === 0) {
    return {
      status: "EMPTY_DATABASE",
      message: "Connected — both properties and auction_events returned zero rows",
      probe,
      genuinelyEmpty: true,
    };
  }

  return {
    status: "CONNECTED",
    message: "Production database reachable via authoritative tables",
    probe,
    genuinelyEmpty: false,
  };
}
