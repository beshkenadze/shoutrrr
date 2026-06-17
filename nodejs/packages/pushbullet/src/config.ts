// Port of Go pkg/services/pushbullet/pushbullet_config.go

import { type FieldSchema } from './core/format.js';
import { PropKeyResolver } from './core/propKeyResolver.js';
import { EnumlessConfig } from './core/standard.js';
import type { EnumFormatter, Params } from './core/types.js';

export const SCHEME = 'pushbullet';

export const DEFAULT_TITLE = 'Shoutrrr notification';

/** ErrorTokenIncorrectSize matches Go ErrorTokenIncorrectSize. */
export const ERROR_TOKEN_INCORRECT_SIZE = 'token has incorrect size';

const TOKEN_LENGTH = 34;

/** Field schema for the tagged (query) props. Mirrors the Go struct tags. */
const CONFIG_SCHEMA: FieldSchema[] = [
  {
    name: 'title',
    type: 'string',
    key: ['title'],
    default: DEFAULT_TITLE,
  },
];

function validateToken(token: string): void {
  if (token.length !== TOKEN_LENGTH) {
    throw new Error(ERROR_TOKEN_INCORRECT_SIZE);
  }
}

/** Config holds the parsed pushbullet:// URL fields. */
export class Config extends EnumlessConfig {
  targets: string[] = [];
  token = '';
  title: string = DEFAULT_TITLE;

  override enums(): Record<string, EnumFormatter> {
    return {};
  }

  private newResolver(): PropKeyResolver {
    return new PropKeyResolver(
      this as unknown as Record<string, string | number | boolean | string[]>,
      CONFIG_SCHEMA,
    );
  }

  /** SetURL updates this config from a pushbullet:// URL representation. */
  setURL(url: URL): void {
    // url.pathname keeps the leading slash; strip it to skip an empty first target.
    let path = decodePath(url.pathname);
    if (path.length > 0 && path[0] === '/') {
      path = path.slice(1);
    }

    // url.hash includes the leading '#'; Go appends "/#<fragment>".
    if (url.hash !== '') {
      path += `/${url.hash}`;
    }

    const targets = path.split('/');

    const token = url.hostname;
    validateToken(token);

    this.token = token;
    this.targets = targets;

    this.newResolver().setFromURL(url);
  }

  /** GetURL returns a URL representation of the current field values. */
  getURL(): URL {
    const url = new URL(`${SCHEME}://${this.token}`);
    url.pathname = `/${this.targets.join('/')}`;
    this.newResolver().bindToURL(url);
    return url;
  }

  /** Returns a shallow value copy, mirroring Go's `config := *service.config`. */
  clone(): Config {
    const copy = new Config();
    copy.token = this.token;
    copy.targets = [...this.targets];
    copy.title = this.title;
    return copy;
  }

  /**
   * Applies params onto this config via the resolver, mirroring Go's
   * `pkr.UpdateConfigFromParams`. Throws on the first unknown/invalid key.
   */
  updateFromParams(params?: Params): void {
    this.newResolver().updateConfigFromParams(params);
  }
}

/**
 * Go's url.Path is already percent-decoded; the WHATWG URL keeps pathname encoded.
 * Decode each segment so targets match the Go behavior (e.g. spaces, plus handling
 * is not applied to the path — only %xx escapes are decoded).
 */
function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}
