import type { EnumFormatter } from './types.js';

/** Sentinel returned by parse() when the input does not match any enum value. */
export const EnumInvalid = -1;

/**
 * createEnumFormatter builds an EnumFormatter from an ordered list of names and
 * an optional alias map (alias -> canonical index). Faithful port of Go's
 * format.CreateEnumFormatter.
 */
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, number> = {},
): EnumFormatter {
  return {
    print(e: number): string {
      if (e < 0 || e >= names.length) {
        return 'Invalid';
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
      for (const [alias, index] of Object.entries(aliases)) {
        if (alias.toLowerCase() === lower) {
          return index;
        }
      }
      return EnumInvalid;
    },
    names(): string[] {
      return names;
    },
  };
}
