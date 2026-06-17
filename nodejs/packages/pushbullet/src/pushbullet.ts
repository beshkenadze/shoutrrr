// Port of Go pkg/services/pushbullet/pushbullet.go

import { ApiError, JsonClient, type JsonClientOptions } from './core/jsonclient.js';
import { Standard } from './core/standard.js';
import type { Logger, Params, Service } from './core/types.js';
import { Config } from './config.js';
import {
  type PushRequest,
  type PushResponse,
  newNotePush,
  setTarget,
} from './payload.js';

const PUSHES_ENDPOINT = 'https://api.pushbullet.com/v2/pushes';

/**
 * Mirrors Go's `client.ErrorResponse`: any JSON-object error body deserializes
 * into the ErrorResponse shape (missing fields default to ""), so any object
 * body is treated as an API error. Returns a body with a guaranteed message.
 */
function isErrorResponse(
  body: unknown,
): body is { error: { message: string } } {
  return typeof body === 'object' && body !== null;
}

/** Extracts the API error message from a parsed error body (possibly empty). */
function apiErrorMessage(body: object): string {
  const errorField = (body as { error?: unknown }).error;
  if (typeof errorField === 'object' && errorField !== null) {
    const message = (errorField as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}

/** PushbulletService provides Pushbullet as a notification service. */
export class PushbulletService extends Standard implements Service {
  private config: Config = new Config();
  private client: JsonClient = new JsonClient();

  /**
   * `clientOptions` exposes the undici dispatcher injection point for tests
   * (MockAgent). It is applied during initialize().
   */
  constructor(private readonly clientOptions: JsonClientOptions = {}) {
    super();
  }

  /** Initialize loads config from the URL and configures the Access-Token header. */
  initialize(configURL: URL, logger?: Logger): void {
    this.setLogger(logger);

    this.config = new Config();
    this.config.setURL(configURL);

    this.client = new JsonClient(this.clientOptions);
    this.client.headers['Access-Token'] = this.config.token;
  }

  /** Send a push notification via Pushbullet, one request per target. */
  async send(message: string, params?: Params): Promise<void> {
    // Work on a value copy and apply params via the resolver, mirroring Go's
    // `config := *service.config; pkr.UpdateConfigFromParams(&config, params)`.
    // This throws on unknown/invalid param keys before any request is sent.
    const config = this.config.clone();
    config.updateFromParams(params);

    for (const target of config.targets) {
      await this.doSend(config.title, target, message);
    }
  }

  private async doSend(title: string, target: string, message: string): Promise<void> {
    const push: PushRequest = newNotePush(message, title);
    setTarget(push, target);

    try {
      await this.client.post<PushResponse>(PUSHES_ENDPOINT, push);
    } catch (err) {
      // Mirror Go doSend: any parseable JSON error body is treated as an API
      // error (its `error.message`, possibly empty); otherwise "failed to push".
      if (err instanceof ApiError && isErrorResponse(err.body)) {
        throw new Error(`API error: ${apiErrorMessage(err.body)}`);
      }
      throw new Error(
        `failed to push: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
