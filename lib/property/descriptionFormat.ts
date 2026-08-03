type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: number; text: string }
  | { type: "list"; items: string[] };

function isBulletLine(line: string): boolean {
  return /^[-*•]\s+/.test(line.trim());
}

function isNumberedLine(line: string): boolean {
  return /^\d+[.)]\s+/.test(line.trim());
}

function stripBulletPrefix(line: string): string {
  return line
    .trim()
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+[.)]\s+/, "");
}

export function parseDescriptionBlocks(
  description: string | null | undefined,
): Block[] {
  if (!description?.trim()) return [];

  const normalized = description.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const blocks: Block[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let listMode: "bullet" | "numbered" | null = null;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    blocks.push({
      type: "paragraph",
      text: paragraphBuffer.join(" ").replace(/\s+/g, " ").trim(),
    });
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push({ type: "list", items: [...listBuffer] });
    listBuffer = [];
    listMode = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushParagraph();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    if (isBulletLine(trimmed) || isNumberedLine(trimmed)) {
      flushParagraph();
      const mode = isNumberedLine(trimmed) ? "numbered" : "bullet";
      if (listMode && listMode !== mode) flushList();
      listMode = mode;
      listBuffer.push(stripBulletPrefix(trimmed));
      continue;
    }

    flushList();
    paragraphBuffer.push(trimmed);
  }

  flushList();
  flushParagraph();
  return blocks;
}

export function hasFormattedDescription(
  description: string | null | undefined,
): boolean {
  return parseDescriptionBlocks(description).length > 0;
}
