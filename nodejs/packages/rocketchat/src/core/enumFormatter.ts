import type { EnumFormatter } from './types.js';

// createEnumFormatter mirrors Go pkg/format enumFormatter: case-insensitive
// parse with optional aliases, print by index, names() lists canonical values.
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
      const lowered = s.toLowerCase();
      for (let i = 0; i < names.length; i++) {
        if (names[i]!.toLowerCase() === lowered) {
          return i;
        }
      }
      for (const [alias, value] of Object.entries(aliases)) {
        if (alias.toLowerCase() === lowered) {
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
