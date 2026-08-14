import type { Hi50GapEntry } from "./types";

export function buildGapEntries(entries: Hi50GapEntry[]): Record<string, Hi50GapEntry[]> {
  const grouped: Record<string, Hi50GapEntry[]> = {
    P1: [],
    P2: [],
    P3: [],
    P4: [],
    REVIEW_REQUIRED: [],
    VERIFIED: [],
  };

  for (const entry of entries) {
    grouped[entry.group]?.push(entry);
  }

  return grouped;
}

export function renderGapReportMarkdown(input: {
  generatedAt: string;
  entries: Hi50GapEntry[];
}): string {
  const grouped = buildGapEntries(input.entries);
  const sections = ["P1", "P2", "P3", "P4", "REVIEW_REQUIRED", "VERIFIED"] as const;

  let md = `# Historical Intelligence 5.0 — Gap Report\n\nGenerated: ${input.generatedAt}\n\n`;

  for (const section of sections) {
    const items = grouped[section] ?? [];
    md += `## ${section.replace(/_/g, " ")} (${items.length})\n\n`;
    if (items.length === 0) {
      md += "- (none)\n\n";
      continue;
    }
    for (const e of items) {
      md += `### ${e.property}${e.town ? ` — ${e.town}` : ""}\n\n`;
      md += `- Event ID: ${e.eventId}\n`;
      md += `- Source: ${e.source ?? "—"}\n`;
      md += `- Current state: ${e.currentState}\n`;
      md += `- Last attempt: ${e.lastAttempt ?? "—"}\n`;
      md += `- Failure: ${e.failure ?? "—"}\n`;
      md += `- Next action: ${e.nextAction}\n`;
      md += `- Priority: P${e.priority}\n\n`;
    }
  }

  return md;
}
