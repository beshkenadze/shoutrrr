// Faithful port of Go pkg/format enum formatter.
import type { EnumFormatter } from './types.js';

/**
 * Creates an EnumFormatter backed by an ordered list of names.
 * `aliases` maps additional input strings (case-insensitive) to canonical indices.
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
    names(): string[] {
      return names;
    },
  };
}
