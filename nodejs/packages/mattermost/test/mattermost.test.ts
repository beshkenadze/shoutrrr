import { afterEach, describe, expect, it } from 'bun:test';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { JsonClient, ApiError } from '../src/core/index.js';
import { MattermostConfig, createConfigFromURL } from '../src/config.js';
import {
  createJSONPayload,
  serializePayload,
  setIcon,
  type MattermostJSON,
} from '../src/payload.js';
import {
  MattermostService,
  buildURL,
  descriptor,
  type Transport,
} from '../src/index.js';

interface CapturedRequest {
  method?: string;
  url?: string;
  body?: string;
  contentType?: string | undefined;
}

/**
 * Starts a loopback HTTP server that records the request and replies 200 for
 * `/hooks/*` paths and 500 otherwise. Returns the captured request and port.
 *
 * Note: the Go suite mocks HTTP with jarcoal/httpmock and the Node SDK design
 * uses an injectable undici dispatcher (MockAgent). Bun's built-in `undici`
 * shim ignores custom dispatchers, so for `bun test` we exercise the real
 * network transport against a loopback server instead — same assertions
 * (POST + webhook path with port + JSON body; 200 resolves, error rejects).
 */
async function startServer(): Promise<{
  server: Server;
  port: number;
  captured: CapturedRequest;
}> {
  const captured: CapturedRequest = {};
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      captured.method = req.method;
      captured.url = req.url;
      captured.body = body;
      captured.contentType = req.headers['content-type'];
      if (req.url?.startsWith('/hooks/')) {
        res.writeHead(200);
        res.end('');
      } else {
        res.writeHead(500);
        res.end('boom');
      }
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { server, port, captured };
}

/**
 * Builds a transport that rewrites the production `https://<host>/hooks/...`
 * webhook to the loopback server, preserving the path (so the webhook path
 * including any port survives end-to-end).
 */
function loopbackTransport(port: number): Transport {
  const client = new JsonClient();
  return (apiURL, body) => {
    const target = new URL(apiURL);
    return client.post(
      `http://127.0.0.1:${port}${target.pathname}`,
      body,
    );
  };
}

describe('the mattermost config', () => {
  describe('creating configurations', () => {
    it('parses a url with channel field', () => {
      const config = createConfigFromURL(
        new URL('mattermost://user@mockserver/atoken/achannel'),
      );
      expect(config.token).toBe('atoken');
      expect(config.channel).toBe('achannel');
      expect(config.userName).toBe('user');
    });

    it('parses a url with title prop', () => {
      expect(() =>
        createConfigFromURL(
          new URL(
            'mattermost://user@mockserver/atoken?icon=https%3A%2F%2Fexample%2Fsomething.png',
          ),
        ),
      ).not.toThrow();
    });

    it('parses a url with all fields and props', () => {
      const config = createConfigFromURL(
        new URL(
          'mattermost://user@mockserver/atoken/achannel?icon=https%3A%2F%2Fexample%2Fsomething.png',
        ),
      );
      expect(config.token).toBe('atoken');
      expect(config.channel).toBe('achannel');
      expect(config.icon).toBe('https://example/something.png');
    });

    it('returns an error for a url with invalid props', () => {
      expect(() =>
        createConfigFromURL(new URL('mattermost://user@mockserver/atoken?foo=bar')),
      ).toThrow();
    });
  });

  describe('URL round-trip', () => {
    it('is identical after de-/serialization (icon prop)', () => {
      const input = 'mattermost://user@mockserver/atoken/achannel?icon=something';
      const config = new MattermostConfig();
      config.setURL(new URL(input));
      expect(config.getURL().toString()).toBe(input);
    });

    it('is identical after de-/serialization (user/token/channel)', () => {
      const input = 'mattermost://bot@mattermost.host/token/channel';
      const config = new MattermostConfig();
      config.setURL(new URL(input));
      expect(config.getURL().toString()).toBe(input);
    });
  });

  describe('port preservation', () => {
    const portURL = 'mattermost://mattermost.my-domain.com:8065/thisshouldbeanapitoken';

    it('preserves the port on the host', () => {
      const config = new MattermostConfig();
      config.setURL(new URL(portURL));
      expect(config.host).toBe('mattermost.my-domain.com:8065');
    });

    it('preserves the port in the generated URL', () => {
      const config = new MattermostConfig();
      config.setURL(new URL(portURL));
      expect(config.getURL().toString()).toBe(portURL);
    });

    it('preserves the port in the built webhook URL', () => {
      const config = new MattermostConfig();
      config.setURL(new URL(portURL));
      expect(buildURL(config)).toBe(
        'https://mattermost.my-domain.com:8065/hooks/thisshouldbeanapitoken',
      );
    });
  });

  describe('error handling', () => {
    it('throws NotEnoughArguments when path is missing', () => {
      expect(() =>
        createConfigFromURL(new URL('mattermost://mattermost.my-domain.com')),
      ).toThrow();
    });

    it('does not crash on a username with malformed percent-encoding', () => {
      // Go's url.User.Username() tolerates this; the port must not throw URIError.
      const config = createConfigFromURL(
        new URL('mattermost://ab%cd@mattermost.host/token'),
      );
      expect(config.userName).toBe('ab%cd');
      expect(config.token).toBe('token');
    });

    it('decodes a percent-encoded username like Go', () => {
      const config = createConfigFromURL(
        new URL('mattermost://a%2Bb@mattermost.host/token'),
      );
      expect(config.userName).toBe('a+b');
    });
  });
});

describe('building the webhook URL', () => {
  it('generates the correct url without a port', () => {
    const config = new MattermostConfig();
    config.setURL(
      new URL('mattermost://mattermost.my-domain.com/thisshouldbeanapitoken'),
    );
    expect(buildURL(config)).toBe(
      'https://mattermost.my-domain.com/hooks/thisshouldbeanapitoken',
    );
  });
});

describe('the icon fields', () => {
  it('sets icon_url when the icon looks like a URL', () => {
    const payload: MattermostJSON = { text: '' };
    setIcon(payload, 'https://example.com/logo.png');
    expect(payload.icon_url).toBe('https://example.com/logo.png');
    expect(payload.icon_emoji).toBeUndefined();
  });

  it('sets icon_emoji when the icon is not a URL', () => {
    const payload: MattermostJSON = { text: '' };
    setIcon(payload, 'tanabata_tree');
    expect(payload.icon_emoji).toBe('tanabata_tree');
    expect(payload.icon_url).toBeUndefined();
  });

  it('clears both fields when the icon is empty', () => {
    const payload: MattermostJSON = {
      text: '',
      icon_emoji: 'x',
      icon_url: 'y',
    };
    setIcon(payload, '');
    expect(payload.icon_emoji).toBeUndefined();
    expect(payload.icon_url).toBeUndefined();
  });
});

describe('creating the JSON payload', () => {
  it('generates the correct body without parameters', () => {
    const config = new MattermostConfig();
    config.setURL(
      new URL('mattermost://mattermost.my-domain.com/thisshouldbeanapitoken'),
    );
    const json = serializePayload(createJSONPayload(config, 'this is a message'));
    expect(json).toBe('{"text":"this is a message"}');
  });

  it('generates the correct body with preset username and channel', () => {
    const config = new MattermostConfig();
    config.setURL(
      new URL(
        'mattermost://testUserName@mattermost.my-domain.com/thisshouldbeanapitoken/testChannel',
      ),
    );
    const json = serializePayload(createJSONPayload(config, 'this is a message'));
    expect(json).toBe(
      '{"text":"this is a message","username":"testUserName","channel":"testChannel"}',
    );
  });

  it('overrides username and channel via parameters', () => {
    const config = new MattermostConfig();
    config.setURL(
      new URL(
        'mattermost://testUserName@mattermost.my-domain.com/thisshouldbeanapitoken/testChannel',
      ),
    );
    const json = serializePayload(
      createJSONPayload(config, 'this is a message', {
        username: 'overwriteUserName',
        channel: 'overwriteChannel',
      }),
    );
    expect(json).toBe(
      '{"text":"this is a message","username":"overwriteUserName","channel":"overwriteChannel"}',
    );
  });

  it('omits empty username/channel like Go omitempty (param override to "")', () => {
    const config = new MattermostConfig();
    config.setURL(
      new URL(
        'mattermost://testUserName@mattermost.my-domain.com/thisshouldbeanapitoken/testChannel',
      ),
    );
    const json = serializePayload(
      createJSONPayload(config, 'this is a message', { username: '', channel: '' }),
    );
    expect(json).toBe('{"text":"this is a message"}');
  });

  it('sets icon_url for a URL icon and icon_emoji otherwise', () => {
    const config = new MattermostConfig();
    config.setURL(
      new URL(
        'mattermost://mattermost.host/token?icon=https%3A%2F%2Fexample.com%2Fi.png',
      ),
    );
    expect(serializePayload(createJSONPayload(config, 'm'))).toBe(
      '{"text":"m","icon_url":"https://example.com/i.png"}',
    );
    const config2 = new MattermostConfig();
    config2.setURL(new URL('mattermost://mattermost.host/token?icon=tanabata_tree'));
    expect(serializePayload(createJSONPayload(config2, 'm'))).toBe(
      '{"text":"m","icon_emoji":"tanabata_tree"}',
    );
  });
});

describe('the service descriptor', () => {
  it('exposes the mattermost scheme and a factory', () => {
    expect(descriptor.schemes).toEqual(['mattermost']);
    expect(descriptor.factory()).toBeInstanceOf(MattermostService);
  });
});

describe('the JsonClient transport', () => {
  let server: Server | undefined;

  afterEach(() => {
    server?.close();
    server = undefined;
  });

  it('resolves on 2xx and posts the JSON body with content-type', async () => {
    const started = await startServer();
    server = started.server;
    const client = new JsonClient();
    await client.post(
      `http://127.0.0.1:${started.port}/hooks/token`,
      '{"text":"Message"}',
    );
    expect(started.captured.method).toBe('POST');
    expect(started.captured.url).toBe('/hooks/token');
    expect(started.captured.body).toBe('{"text":"Message"}');
    expect(started.captured.contentType).toBe('application/json');
  });

  it('rejects with ApiError on non-2xx', async () => {
    const started = await startServer();
    server = started.server;
    const client = new JsonClient();
    let caught: unknown;
    try {
      await client.post(`http://127.0.0.1:${started.port}/wrong`, 'x');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).statusCode).toBe(500);
  });
});

describe('sending the payload (end-to-end via loopback)', () => {
  let server: Server | undefined;

  afterEach(() => {
    server?.close();
    server = undefined;
  });

  it('does not error when the server accepts the payload', async () => {
    const started = await startServer();
    server = started.server;
    const service = new MattermostService({
      transport: loopbackTransport(started.port),
    });
    service.initialize(new URL('mattermost://mattermost.host/token'));
    await service.send('Message');
    expect(started.captured.method).toBe('POST');
    expect(started.captured.url).toBe('/hooks/token');
    expect(started.captured.body).toBe('{"text":"Message"}');
  });

  it('posts to the webhook path derived from a URL with a port', async () => {
    const started = await startServer();
    server = started.server;
    // Webhook URL preserves the port: https://mattermost.host:8065/hooks/token
    const service = new MattermostService({
      transport: (apiURL, body) => {
        expect(apiURL).toBe('https://mattermost.host:8065/hooks/token');
        return loopbackTransport(started.port)(apiURL, body);
      },
    });
    service.initialize(new URL('mattermost://mattermost.host:8065/token'));
    await service.send('Message');
    expect(started.captured.url).toBe('/hooks/token');
  });

  it('posts the JSON body with username and channel', async () => {
    const started = await startServer();
    server = started.server;
    const service = new MattermostService({
      transport: loopbackTransport(started.port),
    });
    service.initialize(new URL('mattermost://bot@mattermost.host/token/general'));
    await service.send('hello');
    expect(started.captured.body).toBe(
      '{"text":"hello","username":"bot","channel":"general"}',
    );
  });

  it('rejects when the server returns an error status', async () => {
    const started = await startServer();
    server = started.server;
    const service = new MattermostService({
      // Route to a non-/hooks path so the loopback server replies 500.
      transport: (_apiURL, body) =>
        new JsonClient().post(`http://127.0.0.1:${started.port}/error`, body),
    });
    service.initialize(new URL('mattermost://mattermost.host/token'));
    await expect(service.send('Message')).rejects.toThrow();
  });
});
