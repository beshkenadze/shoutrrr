// Faithful port of Go pkg/format/enum_formatter.go
import { type EnumFormatter, EnumInvalid } from './types.js';

/**
 * createEnumFormatter creates an EnumFormatter.
 *
 * `names[0]` is typically the empty string ("") so that the first real value
 * starts at a non-zero offset, matching the Go firstOffset behaviour. Parse is
 * case-insensitive and returns -1 (EnumInvalid) when the value is unknown.
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
