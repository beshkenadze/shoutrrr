// Faithful port of Go pkg/types core interfaces.

export type Params = Record<string, string>;

export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

export interface ConfigProp {
  setFromProp(propValue: string): void;
  getPropValue(): string;
}

export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

export interface ServiceConfig {
  getURL(): URL;
  setURL(url: URL): void;
  enums(): Record<string, EnumFormatter>;
}

export interface Service {
  initialize(url: URL, logger?: Logger): void;
  setLogger(logger: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
