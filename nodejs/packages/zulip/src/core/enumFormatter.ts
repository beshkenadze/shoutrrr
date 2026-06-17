import type { EnumFormatter } from './types.js';

/**
 * Creates an EnumFormatter from an ordered list of names and optional aliases.
 * `names` are indexed from 0; `print` returns the name for an index (or "Unknown")
 * and `parse` resolves a case-insensitive name/alias back to its index (or 0).
 */
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, number> = {},
): EnumFormatter {
  return {
    print(e: number): string {
      if (e >= 0 && e < names.length) {
        return names[e]!;
      }
      return 'Unknown';
    },
    parse(s: string): number {
      const lower = s.toLowerCase();
      for (let i = 0; i < names.length; i++) {
        if (names[i]!.toLowerCase() === lower) {
          return i;
        }
      }
      for (const [alias, index] of Object.entries(aliases)) {
        if (alias.toLowerCase() === lower) {
          return index;
        }
      }
      return 0;
    },
    names(): string[] {
      return names;
    },
  };
}
