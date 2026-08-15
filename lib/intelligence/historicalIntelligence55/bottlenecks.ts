import {
  primaryBottleneck54,
  rankBottlenecks54,
} from "@/lib/intelligence/historicalIntelligence54";
import type { Hi50EventRow } from "@/lib/intelligence/historicalIntelligence50/types";
import type { Hi55Bottleneck } from "./types";

/** Reuse HI 5.4 bottleneck ranking — no parallel bottleneck engine. */
export function rankBottlenecks55(events: Hi50EventRow[]): Hi55Bottleneck[] {
  return rankBottlenecks54(events);
}

export function primaryBottleneck55(events: Hi50EventRow[]): Hi55Bottleneck {
  return primaryBottleneck54(events);
}
