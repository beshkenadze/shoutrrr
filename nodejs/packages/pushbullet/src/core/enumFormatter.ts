// Vendored core kit — faithful port of Go pkg/format enum handling.

import type { EnumFormatter } from './types.js';

/**
 * Creates an EnumFormatter from an ordered list of canonical names.
 * `aliases` maps lowercase alternative input strings to the canonical index.
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
      if (lower in aliases) {
        return aliases[lower] as number;
      }
      return -1;
    },
    names(): string[] {
      return names;
    },
  };
}
