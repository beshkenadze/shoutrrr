import type { EnumFormatter } from "./types.js";

/** EnumInvalid is the sentinel returned by parse when a value is not a known name. */
export const EnumInvalid = -1;

/**
 * createEnumFormatter builds an EnumFormatter from an ordered list of names.
 * Optional aliases map alternative input strings to their canonical name.
 * Matches the Go pkg/format CreateEnumFormatter behaviour (case-insensitive parse).
 */
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, string> = {},
): EnumFormatter {
  return {
    print(e: number): string {
      if (e < 0 || e >= names.length) {
        return "Invalid";
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
      const alias = aliases[lower];
      if (alias !== undefined) {
        for (let i = 0; i < names.length; i++) {
          if ((names[i] as string).toLowerCase() === alias.toLowerCase()) {
            return i;
          }
        }
      }
      return EnumInvalid;
    },
    names(): string[] {
      return [...names];
    },
  };
}
