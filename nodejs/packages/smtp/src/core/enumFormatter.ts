// Vendored from Go pkg/format/format_enum.go.
import type { EnumFormatter } from './types.js';

/** EnumInvalid is the value an enum gets when it could not be parsed (Go: format.EnumInvalid). */
export const EnumInvalid = -1;

/**
 * createEnumFormatter creates an EnumFormatter (Go: format.CreateEnumFormatter).
 * - names[0] may be "" to act as an offset (firstOffset skips leading empties).
 * - parse is case-insensitive, falls back to aliases, returns -1 if unknown.
 * - print returns "Invalid" for out-of-range indexes.
 */
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, number> = {},
): EnumFormatter {
  let firstOffset = 0;
  for (let i = 0; i < names.length; i++) {
    if (names[i] !== '') {
      firstOffset = i;
      break;
    }
  }

  return {
    names(): string[] {
      return names.slice(firstOffset);
    },
    print(e: number): string {
      if (e >= names.length || e < 0) {
        return 'Invalid';
      }
      return names[e] as string;
    },
    parse(s: string): number {
      const target = s.toLowerCase();
      for (let index = 0; index < names.length; index++) {
        if (target === (names[index] as string).toLowerCase()) {
          return index;
        }
      }
      if (Object.prototype.hasOwnProperty.call(aliases, s)) {
        return aliases[s] as number;
      }
      return EnumInvalid;
    },
  };
}
