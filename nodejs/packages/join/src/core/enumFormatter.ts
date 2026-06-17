// Faithful port of Go pkg/format/enum_formatter.go.

import type { EnumFormatter } from './types.js';

/** EnumInvalid is the value an enum gets when it could not be parsed. */
export const EnumInvalid = -1;

class EnumFormatterImpl implements EnumFormatter {
  private readonly nameList: string[];
  private readonly firstOffset: number;
  private readonly aliases: Record<string, number>;

  constructor(names: string[], firstOffset: number, aliases: Record<string, number>) {
    this.nameList = names;
    this.firstOffset = firstOffset;
    this.aliases = aliases;
  }

  names(): string[] {
    return this.nameList.slice(this.firstOffset);
  }

  print(e: number): string {
    if (e >= this.nameList.length || e < 0) {
      return 'Invalid';
    }
    return this.nameList[e]!;
  }

  parse(s: string): number {
    const target = s.toLowerCase();
    for (let index = 0; index < this.nameList.length; index++) {
      if (target === this.nameList[index]!.toLowerCase()) {
        return index;
      }
    }
    if (s in this.aliases) {
      return this.aliases[s]!;
    }
    return EnumInvalid;
  }
}

/** createEnumFormatter creates an EnumFormatter from a list of names and optional aliases. */
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
