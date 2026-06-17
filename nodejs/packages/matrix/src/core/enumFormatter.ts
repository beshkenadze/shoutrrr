import type { EnumFormatter } from './types.js';

// createEnumFormatter — faithful port of Go pkg/format enum formatter.
// names are the canonical 1-based enum value labels (index 0 reserved as "Unknown"/none).
// aliases maps an alternative input string -> canonical name.
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, string> = {},
): EnumFormatter {
  return {
    print(e: number): string {
      if (e < 0 || e >= names.length) {
        return 'Unknown';
      }
      return names[e]!;
    },
    parse(s: string): number {
      const target = (aliases[s.toLowerCase()] ?? s).toLowerCase();
      for (let i = 0; i < names.length; i++) {
        if (names[i]!.toLowerCase() === target) {
          return i;
        }
      }
      return -1;
    },
    names(): string[] {
      return names;
    },
  };
}
