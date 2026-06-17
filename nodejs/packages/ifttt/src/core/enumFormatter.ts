import type { EnumFormatter } from "./types.js";

/**
 * createEnumFormatter builds an EnumFormatter from an ordered list of names
 * and an optional alias map (alias -> canonical index).
 *
 * Ported from Go pkg/format enumFormatter. Parsing is case-insensitive and
 * returns -1 for unknown values (matching Go's "not found" sentinel).
 */
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, number> = {},
): EnumFormatter {
  return {
    print(e: number): string {
      if (e < 0 || e >= names.length) {
        return "Unknown";
      }
      return names[e] as string;
    },
    parse(s: string): number {
      const needle = s.toLowerCase();
      for (let i = 0; i < names.length; i++) {
        if ((names[i] as string).toLowerCase() === needle) {
          return i;
        }
      }
      for (const [alias, index] of Object.entries(aliases)) {
        if (alias.toLowerCase() === needle) {
          return index;
        }
      }
      return -1;
    },
    names(): string[] {
      return [...names];
    },
  };
}
