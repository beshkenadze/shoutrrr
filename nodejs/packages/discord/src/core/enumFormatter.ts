import type { EnumFormatter } from "./types.js";

/**
 * createEnumFormatter builds an EnumFormatter from an ordered list of names.
 * The index of each name is its numeric value. Optional aliases map extra
 * lowercase names to an existing index. Parsing is case-insensitive; unknown
 * values parse to 0 (the first / "none" entry), mirroring the Go behaviour.
 */
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, number> = {},
): EnumFormatter {
  const lookup = new Map<string, number>();
  names.forEach((name, index) => {
    lookup.set(name.toLowerCase(), index);
  });
  for (const [alias, index] of Object.entries(aliases)) {
    lookup.set(alias.toLowerCase(), index);
  }

  return {
    print(e: number): string {
      if (e < 0 || e >= names.length) {
        return "Unknown";
      }
      return names[e] ?? "Unknown";
    },
    parse(s: string): number {
      return lookup.get(s.toLowerCase()) ?? 0;
    },
    names(): string[] {
      return [...names];
    },
  };
}
