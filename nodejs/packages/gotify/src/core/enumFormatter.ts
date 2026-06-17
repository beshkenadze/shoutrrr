// Faithful port of Go pkg/format/enum_formatter.go.
import type { EnumFormatter } from './types.js';

/** Constant value an enum gets when it could not be parsed. */
export const ENUM_INVALID = -1;

class EnumFormatterImpl implements EnumFormatter {
  constructor(
    private readonly _names: string[],
    private readonly firstOffset: number,
    private readonly aliases: Record<string, number>,
  ) {}

  names(): string[] {
    return this._names.slice(this.firstOffset);
  }

  print(e: number): string {
    if (e >= this._names.length || e < 0) {
      return 'Invalid';
    }
    return this._names[e] as string;
  }

  parse(s: string): number {
    const target = s.toLowerCase();
    for (let index = 0; index < this._names.length; index++) {
      if (target === (this._names[index] as string).toLowerCase()) {
        return index;
      }
    }
    if (Object.prototype.hasOwnProperty.call(this.aliases, s)) {
      return this.aliases[s] as number;
    }
    return ENUM_INVALID;
  }
}

/** createEnumFormatter creates an EnumFormatter; names[0] is the "" offset slot. */
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
  return new EnumFormatterImpl(names, firstOffset, aliases);
}
