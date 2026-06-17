import type { EnumFormatter } from './types.js';

/**
 * Creates an EnumFormatter from a list of names. names[0] is the offset (usually
 * the empty string / "None"). parse is case-insensitive and returns -1 if the
 * value is unknown.
 */
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, number> = {},
): EnumFormatter {
  return {
    print(e: number): string {
      if (e >= 0 && e < names.length) {
        return names[e] as string;
      }
      return 'Unknown';
    },
    parse(s: string): number {
      const lower = s.toLowerCase();
      for (let i = 0; i < names.length; i++) {
        if ((names[i] as string).toLowerCase() === lower) {
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
