// Ported from Go pkg/format/enum_formatter.go.
import type { EnumFormatter } from './types.js';

/** EnumInvalid is the value an enum gets when it could not be parsed. */
export const EnumInvalid = -1;

class EnumFormatterImpl implements EnumFormatter {
  private readonly _names: string[];
  private readonly firstOffset: number;
  private readonly aliases: Record<string, number>;

  constructor(names: string[], aliases: Record<string, number>) {
    this._names = names;
    this.aliases = aliases;
    let firstOffset = 0;
    for (let i = 0; i < names.length; i++) {
      if (names[i] !== '') {
        firstOffset = i;
        break;
      }
    }
    this.firstOffset = firstOffset;
  }

  names(): string[] {
    return this._names.slice(this.firstOffset);
  }

  print(e: number): string {
    if (e >= this._names.length || e < 0) {
      return 'Invalid';
    }
    return this._names[e]!;
  }

  parse(s: string): number {
    const target = s.toLowerCase();
    for (let i = 0; i < this._names.length; i++) {
      if (target === this._names[i]!.toLowerCase()) {
        return i;
      }
    }
    if (Object.prototype.hasOwnProperty.call(this.aliases, s)) {
      return this.aliases[s]!;
    }
    return EnumInvalid;
  }
}

/**
 * createEnumFormatter builds an EnumFormatter. names[0] is the "" offset entry.
 * parse is case-insensitive over names and matches numeric/alias keys exactly.
 */
export function createEnumFormatter(
  names: string[],
  aliases: Record<string, number> = {},
): EnumFormatter {
  return new EnumFormatterImpl(names, aliases);
}
