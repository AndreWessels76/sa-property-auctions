/**
 * Agency intelligence 4.5 — evidence-backed activity only.
 */

import { buildAreaIntelligence45 } from "./areaIntelligence";
import type { AgencyIntelligence45, BuildContext } from "./types";

export function buildAgencyIntelligence45(
  ctx: BuildContext,
  agency: string,
): AgencyIntelligence45 {
  const base = buildAreaIntelligence45(ctx, ctx.town ?? "all");
  return {
    ...base,
    agency,
  };
}
