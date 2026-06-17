import type { EnumFormatter } from './types.js';

/**
 * createEnumFormatter builds an EnumFormatter for a fixed set of names.
 * `names[i]` maps to enum value `i`. Optional `aliases` map extra strings to values.
 * Faithful port of Go format.CreateEnumFormatter.
 */
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, number> = {},
): EnumFormatter {
  return {
    print(e: number): string {
      if (e < 0 || e >= names.length) {
        return 'Unknown';
      }
      return names[e]!;
    },
    parse(s: string): number {
      const lower = s.toLowerCase();
      for (let i = 0; i < names.length; i++) {
        if (names[i]!.toLowerCase() === lower) {
          return i;
        }
      }
      for (const [alias, value] of Object.entries(aliases)) {
        if (alias.toLowerCase() === lower) {
          return value;
        }
      }
      return -1;
    },
    names(): string[] {
      return names;
    },
  };
}
