import type { EnumFormatter } from './types.js';

/**
 * createEnumFormatter builds an EnumFormatter from an ordered list of names.
 * Port of Go format.CreateEnumFormatter. `aliases` maps additional spellings
 * to their numeric value.
 */
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, number> = {},
): EnumFormatter {
  return {
    names(): string[] {
      return names;
    },
    print(e: number): string {
      if (e < 0 || e >= names.length) {
        return 'Unknown';
      }
      return names[e] as string;
    },
    parse(s: string): number {
      const lower = s.toLowerCase();
      for (let i = 0; i < names.length; i++) {
        if ((names[i] as string).toLowerCase() === lower) {
          return i;
        }
      }
      if (Object.prototype.hasOwnProperty.call(aliases, lower)) {
        return aliases[lower] as number;
      }
      return -1;
    },
  };
}
