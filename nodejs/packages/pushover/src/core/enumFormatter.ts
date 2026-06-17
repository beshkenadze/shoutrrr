import type { EnumFormatter } from './types.js';

/** EnumInvalid is the sentinel returned by parse when a value is not recognized. */
export const EnumInvalid = -1;

/**
 * createEnumFormatter builds an EnumFormatter from a list of names.
 * names[0] is the zero-offset value; parsing is case-insensitive and aliases
 * (which map onto the primary names by index) may be supplied. Unknown values
 * parse to EnumInvalid (-1).
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
      return 'Invalid';
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
      return EnumInvalid;
    },
    names(): string[] {
      return names;
    },
  };
}
