import type { Dispatcher } from 'undici';
import { Config } from './config.js';
import { createJSONPayload } from './payload.js';
import { Standard, request } from './core/index.js';
import type { Logger, Params, Service } from './core/index.js';

// RocketchatService sends notifications to a pre-configured Rocket.Chat
// channel or user via an incoming webhook. Faithful port of rocketchat.go.
export class RocketchatService extends Standard implements Service {
  private config?: Config;
  private readonly dispatcher?: Dispatcher;

  // The dispatcher is injectable so tests can supply an undici MockAgent.
  constructor(opts?: { dispatcher?: Dispatcher }) {
    super();
    if (opts?.dispatcher) {
      this.dispatcher = opts.dispatcher;
    }
  }

  initialize(configURL: URL, logger?: Logger): void {
    this.setLogger(logger);
    const config = new Config();
    config.setURL(configURL);
    this.config = config;
  }

  async send(message: string, params?: Params): Promise<void> {
    const config = this.config;
    if (!config) {
      throw new Error('service not initialized');
    }

    const apiURL = buildURL(config);
    const payload = createJSONPayload(config, message, params);

    let res;
    try {
      res = await request(apiURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Error while posting to URL: ${reason}\nHOST: ${config.host}\nPORT: ${config.port}`,
      );
    }

    if (res.statusCode !== 200) {
      const body = await res.body.text();
      throw new Error(`notification failed: ${res.statusCode} ${body}`);
    }

    // Drain the body so the connection can be reused.
    await res.body.dump();
  }
}

// buildURL builds the webhook URL, preserving host:port when a port is set.
export function buildURL(config: Config): string {
  if (config.port !== '') {
    return `https://${config.host}:${config.port}/hooks/${config.tokenA}/${config.tokenB}`;
  }
  return `https://${config.host}/hooks/${config.tokenA}/${config.tokenB}`;
}
