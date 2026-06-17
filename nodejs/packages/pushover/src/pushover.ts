import type { Dispatcher } from 'undici';
import type { Logger, Params, Service } from './core/index.js';
import { JsonClient, PropKeyResolver, Standard } from './core/index.js';
import { Config } from './config.js';

/** hookURL is the Pushover messages API endpoint. */
const hookURL = 'https://api.pushover.net/1/messages.json';

/**
 * PushoverService sends notifications to Pushover via a form-encoded POST.
 * Faithful port of Go pushover.Service.
 */
export class PushoverService implements Service {
  private readonly logger = new Standard();
  private config = new Config();
  private resolver: PropKeyResolver = this.config.newResolver();
  private readonly client: JsonClient;
  /** The messages endpoint; overridable for tests, defaults to the real API. */
  private readonly hookURL: string;

  constructor(opts?: { dispatcher?: Dispatcher; hookURL?: string }) {
    this.client = new JsonClient({ dispatcher: opts?.dispatcher });
    this.hookURL = opts?.hookURL ?? hookURL;
  }

  /** initialize loads the config from the URL and sets the logger. */
  initialize(url: URL, logger?: Logger): void {
    this.logger.setLogger(logger);
    this.config = new Config();
    this.resolver = this.config.newResolver();
    this.config.setURLWithResolver(url, this.resolver);
  }

  setLogger(logger: Logger): void {
    this.logger.setLogger(logger);
  }

  /** send delivers a message to the configured Pushover device(s). */
  async send(message: string, params?: Params): Promise<void> {
    const config = this.config;
    this.resolver.updateConfigFromParams(params);

    const device = config.devices.join(',');
    try {
      await this.sendToDevice(device, message, config);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`failed to send notifications to pushover devices: ${reason}`);
    }
  }

  private async sendToDevice(device: string, message: string, config: Config): Promise<void> {
    const data = new URLSearchParams();
    data.set('device', device);
    data.set('user', config.user);
    data.set('token', config.token);
    data.set('message', message);

    if (config.title.length > 0) {
      data.set('title', config.title);
    }

    if (config.priority >= -2 && config.priority <= 1) {
      data.set('priority', String(config.priority));
    }

    const res = await this.client.postForm(this.hookURL, data);

    // Go accepts only HTTP 200; any other status is an error.
    if (res.statusCode !== 200) {
      throw new Error(
        `failed to send notification to pushover device ${JSON.stringify(device)}, response status ${JSON.stringify(res.status)}`,
      );
    }
  }
}
