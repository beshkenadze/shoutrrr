import { describe, expect, it } from 'bun:test';

import {
  Config,
  configFromWebhookURL,
  configSchema,
  createSendParams,
  defaultConfig,
  GenericService,
  jsonPayload,
  normalizedHeaderKey,
} from '../src/index.js';
import { MockAgent, PropKeyResolver } from '../src/core/index.js';
import type { MockReplyOptions, Params } from '../src/core/index.js';

/** Mirrors Go testServiceURL: setURL then getURL, returning [config, serviceURL]. */
function testServiceURL(testURL: string): { config: Config; serviceURL: URL } {
  const { config, pkr } = defaultConfig();
  config.setURLWith(pkr, new URL(testURL));
  return { config, serviceURL: config.getURLWith(pkr) };
}

/** Mirrors Go testCustomURL: configFromWebhookURL then getURL. */
function testCustomURL(testURL: string): { config: Config; serviceURL: URL } {
  const { config, pkr } = configFromWebhookURL(testURL);
  return { config, serviceURL: config.getURLWith(pkr) };
}

describe('the Generic service', () => {
  describe('parsing a custom URL', () => {
    it('should strip generic prefix before parsing', () => {
      const service = new GenericService();
      const actual = service.getConfigURLFromCustom(new URL('generic+https://test.tld'));
      const { serviceURL: expected } = testCustomURL('https://test.tld');
      expect(actual.toString()).toBe(expected.toString());
    });

    it('should disable TLS for HTTP URLs', () => {
      const { config } = testCustomURL('http://example.com');
      expect(config.disableTLS).toBe(true);
    });

    it('should enable TLS for HTTPS URLs', () => {
      const { config } = testCustomURL('https://example.com');
      expect(config.disableTLS).toBe(false);
    });

    it('should escape conflicting custom query keys', () => {
      const { config, serviceURL } = testCustomURL('https://example.com/?template=passed');
      expect(config.template).not.toBe('passed');
      expect(config.webhookURLString()).toBe('https://example.com/?template=passed');
      expect(serviceURL.toString()).toBe('generic://example.com/?__template=passed');
    });

    it('should handle both escaped and service prop version of keys', () => {
      const { config } = testServiceURL('generic://example.com/?__template=passed&template=captured');
      expect(config.template).toBe('captured');
      expect(config.webhookURLString()).toBe('https://example.com/?template=passed');
    });
  });

  describe('custom headers in the URL', () => {
    it('should strip the headers from the webhook query', () => {
      const { config } = testServiceURL('generic://example.com/?@authorization=frend');
      const whURL = new URL(config.webhookURLString());
      expect(whURL.searchParams.has('@authorization')).toBe(false);
      expect(whURL.searchParams.has('authorization')).toBe(false);
    });

    it('should add the headers to the config custom header map', () => {
      const { config } = testServiceURL('generic://example.com/?@authorization=frend');
      expect(config.headers.Authorization).toBe('frend');
    });

    it('should add camelCase header keys with kebab-case keys', () => {
      const { config } = testServiceURL('generic://example.com/?@userAgent=gozilla+1.0');
      expect(config.headers['User-Agent']).toBe('gozilla 1.0');
    });
  });

  describe('extra data in the URL', () => {
    it('should strip the extra data from the webhook query', () => {
      const { config } = testServiceURL('generic://example.com/?$context=inside+joke');
      const whURL = new URL(config.webhookURLString());
      expect(whURL.searchParams.has('$context')).toBe(false);
      expect(whURL.searchParams.has('context')).toBe(false);
    });

    it('should add the extra data to the config extra data map', () => {
      const { config } = testServiceURL('generic://example.com/?$context=inside+joke');
      expect(config.extraData.context).toBe('inside joke');
    });
  });

  describe('building the payload', () => {
    function freshConfig(): Config {
      const config = new Config();
      config.messageKey = 'message';
      config.titleKey = 'title';
      config.template = '';
      return config;
    }

    it('should use the message as payload when no template is specified', () => {
      const service = new GenericService();
      const payload = service.getPayload(freshConfig(), { message: 'test message' });
      expect(payload).toBe('test message');
    });

    it('should create a JSON object as the payload for template=JSON', () => {
      const service = new GenericService();
      const config = freshConfig();
      config.template = 'JSON';
      const params: Params = { title: 'test title' };
      const sendParams = createSendParams(config, params, 'test message');
      const payload = service.getPayload(config, sendParams);
      expect(JSON.parse(payload)).toEqual({ title: 'test title', message: 'test message' });
    });

    it('should create a JSON object using the specified alternate keys', () => {
      const service = new GenericService();
      const config = freshConfig();
      config.template = 'JSON';
      config.messageKey = 'body';
      config.titleKey = 'header';
      const params: Params = { title: 'test title' };
      const sendParams = createSendParams(config, params, 'test message');
      const payload = service.getPayload(config, sendParams);
      expect(JSON.parse(payload)).toEqual({ header: 'test title', body: 'test message' });
    });

    it('should apply a valid template to the message payload', () => {
      const service = new GenericService();
      service.setTemplateString('news', '{{.title}} ==> {{.message}}');
      const config = freshConfig();
      config.template = 'news';
      const params: Params = { title: 'BREAKING NEWS', message: "it's today!" };
      const payload = service.getPayload(config, params);
      expect(payload).toBe("BREAKING NEWS ==> it's today!");
    });

    it('should apply template with message data given minimal params', () => {
      const service = new GenericService();
      service.setTemplateString('arrows', '==> {{.message}} <==');
      const config = freshConfig();
      config.template = 'arrows';
      const payload = service.getPayload(config, { message: 'LOOK AT ME' });
      expect(payload).toBe('==> LOOK AT ME <==');
    });

    it('should throw for an unknown template', () => {
      const service = new GenericService();
      const config = freshConfig();
      config.template = 'missing';
      expect(() => service.getPayload(config, {})).toThrow();
    });
  });

  describe('extra data merge in jsonPayload', () => {
    it('should merge extra data over params', () => {
      const out = JSON.parse(jsonPayload({ message: 'Message' }, { context: 'inside joke' }));
      expect(out).toEqual({ message: 'Message', context: 'inside joke' });
    });
  });

  describe('the normalized header key format', () => {
    it('should normalize content-type', () => {
      expect(normalizedHeaderKey('content-type')).toBe('Content-Type');
    });
    it('should normalize contentType', () => {
      expect(normalizedHeaderKey('contentType')).toBe('Content-Type');
    });
    it('should normalize ContentType', () => {
      expect(normalizedHeaderKey('ContentType')).toBe('Content-Type');
    });
    it('should normalize Content-Type', () => {
      expect(normalizedHeaderKey('Content-Type')).toBe('Content-Type');
    });
  });

  describe('the service upstream client (mocked)', () => {
    function makeService(serviceURL: string): { service: GenericService; agent: InstanceType<typeof MockAgent> } {
      const agent = new MockAgent();
      agent.disableNetConnect();
      const service = new GenericService({ dispatcher: agent });
      service.initialize(new URL(serviceURL));
      return { service, agent };
    }

    it('should POST the message body to the webhook target', async () => {
      const { service, agent } = makeService('generic://host.tld/webhook?disabletls=yes');
      let seenBody = '';
      agent
        .get('http://host.tld')
        .intercept({ path: '/webhook', method: 'POST' })
        .reply(200, (opts: MockReplyOptions) => {
          seenBody = String(opts.body);
          return '';
        });
      await service.send('Message');
      expect(seenBody).toBe('Message');
    });

    it('should add configured custom headers to the request', async () => {
      const { service, agent } = makeService(
        'generic://host.tld/webhook?disabletls=yes&@authorization=frend&@userAgent=gozilla+1.0',
      );
      const seenHeaders: Record<string, string | string[] | undefined> = {};
      agent
        .get('http://host.tld')
        .intercept({ path: '/webhook', method: 'POST' })
        .reply(200, (opts: MockReplyOptions) => {
          Object.assign(seenHeaders, opts.headers);
          return '';
        });
      await service.send('Message');
      const lower: Record<string, string> = {};
      for (const [k, v] of Object.entries(seenHeaders)) {
        lower[k.toLowerCase()] = String(v);
      }
      expect(lower.authorization).toBe('frend');
      expect(lower['user-agent']).toBe('gozilla 1.0');
    });

    it('should send the configured content-type', async () => {
      const { service, agent } = makeService(
        'generic://host.tld/webhook?disabletls=yes&contenttype=text/plain',
      );
      let contentType = '';
      agent
        .get('http://host.tld')
        .intercept({ path: '/webhook', method: 'POST' })
        .reply(200, (opts: MockReplyOptions) => {
          const headers = opts.headers as Record<string, string>;
          for (const [k, v] of Object.entries(headers)) {
            if (k.toLowerCase() === 'content-type') {
              contentType = String(v);
            }
          }
          return '';
        });
      await service.send('Message');
      expect(contentType).toBe('text/plain');
    });

    it('should include extra data fields in the json body', async () => {
      const { service, agent } = makeService(
        'generic://host.tld/webhook?disabletls=yes&template=json&$context=inside+joke',
      );
      let body: unknown;
      agent
        .get('http://host.tld')
        .intercept({ path: '/webhook', method: 'POST' })
        .reply(200, (opts: MockReplyOptions) => {
          body = JSON.parse(String(opts.body));
          return '';
        });
      await service.send('Message');
      expect(body).toEqual({ message: 'Message', context: 'inside joke' });
    });

    it('should use the configured HTTP method', async () => {
      const { service, agent } = makeService('generic://host.tld/webhook?disabletls=yes&method=GET');
      let called = false;
      agent
        .get('http://host.tld')
        .intercept({ path: '/webhook', method: 'GET' })
        .reply(200, () => {
          called = true;
          return '';
        });
      await service.send('Message');
      expect(called).toBe(true);
    });

    it('should not return an error for an unknown param', async () => {
      const { service, agent } = makeService('generic://host.tld/webhook?disabletls=yes');
      agent.get('http://host.tld').intercept({ path: '/webhook', method: 'POST' }).reply(200, '');
      await expect(service.send('Message', { unknown: 'param' })).resolves.toBeUndefined();
    });

    it('should not mutate the given params', async () => {
      const { service, agent } = makeService('generic://host.tld/webhook?disabletls=yes&method=GET');
      agent.get('http://host.tld').intercept({ path: '/webhook', method: 'GET' }).reply(200, '');
      const params: Params = { title: 'TITLE' };
      await service.send('Message', params);
      expect(params).toEqual({ title: 'TITLE' });
    });

    it('should reject when the server returns an error status', async () => {
      const { service, agent } = makeService('generic://host.tld/webhook?disabletls=yes');
      agent.get('http://host.tld').intercept({ path: '/webhook', method: 'POST' }).reply(500, 'boom');
      await expect(service.send('Message')).rejects.toThrow();
    });

    it('should log (not throw) when a known param has an invalid value', async () => {
      // disabletls is a bool prop; "garbage" is not a valid bool -> Go logs and continues.
      const { service, agent } = makeService('generic://host.tld/webhook?disabletls=yes');
      agent.get('http://host.tld').intercept({ path: '/webhook', method: 'POST' }).reply(200, '');
      const logs: string[] = [];
      service.setLogger({ logf: (fmt, ...args) => logs.push([fmt, ...args.map(String)].join(' ')) });
      await expect(service.send('Message', { disabletls: 'garbage' })).resolves.toBeUndefined();
      expect(logs.some((l) => l.includes('Failed to update params'))).toBe(true);
    });
  });
});

describe('webhook URL credential handling', () => {
  it('preserves password-only userinfo in the POST target', () => {
    const { config } = configFromWebhookURL('https://:secret@api.example.com/hook');
    expect(config.webhookURLString()).toBe('https://:secret@api.example.com/hook');
  });

  it('preserves user:pass userinfo in the POST target', () => {
    const { config } = configFromWebhookURL('https://user:pass@api.example.com/hook');
    expect(config.webhookURLString()).toBe('https://user:pass@api.example.com/hook');
  });
});

describe('PropKeyResolver round-trip', () => {
  it('omits default values from the built query', () => {
    const config = new Config();
    const pkr = new PropKeyResolver(config as never, configSchema);
    pkr.setDefaultProps();
    const url = config.getURLWith(pkr);
    // All defaults => no service prop keys should be present.
    expect(url.searchParams.has('method')).toBe(false);
    expect(url.searchParams.has('contenttype')).toBe(false);
  });
});
