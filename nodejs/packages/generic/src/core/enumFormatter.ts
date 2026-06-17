import type { EnumFormatter } from './types.js';

/**
 * createEnumFormatter builds an EnumFormatter from an ordered list of names and
 * an optional count of aliases (extra names that map onto existing values when parsing,
 * but are not returned by names()). Faithful port of Go `format.CreateEnumFormatter`.
 */
export function createEnumFormatter(names: string[], aliases = 0): EnumFormatter {
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
      return -1;
    },
    names(): string[] {
      return names.slice(0, names.length - aliases);
    },
  };
}
