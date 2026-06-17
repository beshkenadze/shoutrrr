import type { Dispatcher } from 'undici';
import {
  JsonClient,
  type Logger,
  type Params,
  PropKeyResolver,
  type Service,
  Standard,
} from './core/index.js';
import { MattermostConfig, QUERY_SCHEMA } from './config.js';
import { createJSONPayload, serializePayload } from './payload.js';

/** Transport posts a serialized JSON body to a URL. Mirrors JsonClient.post. */
export type Transport = (url: string, body: string) => Promise<unknown>;

/** Options for constructing the service. */
export interface MattermostServiceOptions {
  /** Custom undici dispatcher (e.g. MockAgent) used by the default transport. */
  dispatcher?: Dispatcher;
  /** Override the HTTP transport entirely (used for end-to-end tests). */
  transport?: Transport;
}

/**
 * Builds the actual webhook URL the request should go to. Preserves host:port
 * (port of buildURL — uses config.host which includes the port).
 */
export function buildURL(config: MattermostConfig): string {
  return `https://${config.host}/hooks/${config.token}`;
}

/** MattermostService sends notifications to a pre-configured channel or user. */
export class MattermostService implements Service {
  private readonly standard = new Standard();
  private config = new MattermostConfig();
  private resolver = new PropKeyResolver(
    this.config as MattermostConfig & Record<string, unknown>,
    QUERY_SCHEMA,
  );
  private readonly transport: Transport;

  constructor(options: MattermostServiceOptions = {}) {
    if (options.transport) {
      this.transport = options.transport;
    } else {
      const client = new JsonClient(
        options.dispatcher ? { dispatcher: options.dispatcher } : {},
      );
      this.transport = (url, body) => client.post(url, body);
    }
  }

  /** Loads ServiceConfig from configURL and sets the logger for this service. */
  initialize(configURL: URL, logger?: Logger): void {
    this.standard.setLogger(logger);
    this.config = new MattermostConfig();
    this.resolver = new PropKeyResolver(
      this.config as MattermostConfig & Record<string, unknown>,
      QUERY_SCHEMA,
    );
    this.config.setURLWithResolver(configURL, this.resolver);
  }

  setLogger(logger: Logger): void {
    this.standard.setLogger(logger);
  }

  /** Sends a notification message to Mattermost. */
  async send(message: string, params?: Params): Promise<void> {
    const apiURL = buildURL(this.config);
    this.resolver.updateConfigFromParams(params);
    const payload = createJSONPayload(this.config, message, params);
    await this.transport(apiURL, serializePayload(payload));
  }
}
