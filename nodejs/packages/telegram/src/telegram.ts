// Port of telegram.go (Service)
import type { Dispatcher } from './core/undici.js';
import { Client } from './client.js';
import { Config, fields } from './config.js';
import { JsonClient } from './core/jsonclient.js';
import { PropKeyResolver } from './core/propKeyResolver.js';
import { Standard } from './core/standard.js';
import type { Logger, Params, Service } from './core/types.js';
import { createSendMessagePayload } from './payload.js';

const MAX_LENGTH = 4096;

export interface TelegramServiceOptions {
  /** Injectable undici dispatcher (e.g. MockAgent) for testing. */
  dispatcher?: Dispatcher;
}

/** Service sends notifications to a given telegram chat. */
export class TelegramService implements Service {
  private readonly standard = new Standard();
  private config: Config | undefined;
  private readonly dispatcher?: Dispatcher;

  constructor(opts: TelegramServiceOptions = {}) {
    this.dispatcher = opts.dispatcher;
  }

  setLogger(logger: Logger): void {
    this.standard.setLogger(logger);
  }

  /** Initialize loads the Config from configURL and sets the logger. */
  initialize(configURL: URL, logger?: Logger): void {
    this.standard.setLogger(logger);
    const config = new Config();
    config.preview = true;
    config.notification = true;
    config.setURL(configURL);
    this.config = config;
  }

  /** GetConfig returns the Config for the service. */
  getConfig(): Config {
    if (!this.config) {
      throw new Error('service has not been initialized');
    }
    return this.config;
  }

  /** Send a notification to Telegram. */
  async send(message: string, params?: Params): Promise<void> {
    // Go measures len(message) in UTF-8 bytes, not UTF-16 code units.
    if (Buffer.byteLength(message, 'utf8') > MAX_LENGTH) {
      throw new Error('Message exceeds the max length');
    }

    const base = this.getConfig();
    // Work on a copy so params overrides don't mutate the stored config.
    const config = Object.assign(new Config(), base);

    const resolver = new PropKeyResolver(
      config as unknown as Record<string, unknown>,
      fields,
      config.enums(),
    );
    resolver.updateConfigFromParams(params);

    await this.sendMessageForChatIDs(message, config);
  }

  private async sendMessageForChatIDs(
    message: string,
    config: Config,
  ): Promise<void> {
    const json = new JsonClient(
      this.dispatcher ? { dispatcher: this.dispatcher } : {},
    );
    // Mirror Go: iterate the originally-configured chats, but use the
    // params-overridden copy for the payload contents.
    for (const chat of this.getConfig().chats) {
      const client = new Client(config.token, json);
      const payload = createSendMessagePayload(message, chat, config);
      await client.sendMessage(payload);
    }
  }
}
