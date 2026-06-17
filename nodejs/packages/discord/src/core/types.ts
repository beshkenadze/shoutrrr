// Core type definitions shared across shoutrrr services.
// Faithful port of Go pkg/types. Will fold into @shoutrrr/core during dedupe.

/** Params is a free-form key/value bag passed to a service's send call. */
export type Params = Record<string, string>;

/** MessageLevel is used to denote the urgency of a message item. */
export enum MessageLevel {
  Unknown = 0,
  Error,
  Warning,
  Info,
  Debug,
}

/** Number of known message levels (used to size color arrays). */
export const MessageLevelCount = 5;

const messageLevelStrings: Record<MessageLevel, string> = {
  [MessageLevel.Unknown]: "Unknown",
  [MessageLevel.Error]: "Error",
  [MessageLevel.Warning]: "Warning",
  [MessageLevel.Info]: "Info",
  [MessageLevel.Debug]: "Debug",
};

/** levelString returns the human-readable name for a message level. */
export function levelString(level: MessageLevel): string {
  return messageLevelStrings[level] ?? messageLevelStrings[MessageLevel.Unknown];
}

/** Field is a key/value pair attached to a message item. */
export interface Field {
  key: string;
  value: string;
}

/** MessageItem is an entry in a notification being sent by a service. */
export interface MessageItem {
  text: string;
  timestamp?: Date;
  level?: MessageLevel;
  fields?: Field[];
}

/** MessageLimit bounds how a plain message is chunked into items. */
export interface MessageLimit {
  chunkSize: number;
  totalChunkSize: number;
  chunkCount: number;
}

/** EnumFormatter maps between enum names and their numeric values. */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** Logger is the minimal logging surface a service uses. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the URL-backed configuration of a service. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(u: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is a notification backend addressed by a URL scheme. */
export interface Service {
  initialize(u: URL, logger?: Logger): void;
  setLogger(l: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
