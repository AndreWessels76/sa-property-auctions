import { levenshtein } from "./levenshtein";

export function fuzzyMatch(
  left: string,
  right: string
): number {

  if (!left || !right) {

    return 0;

  }

  const distance =
    levenshtein(left, right);

  const max =
    Math.max(
      left.length,
      right.length
    );

  return Math.round(
    (1 - distance / max) * 100
  );

}