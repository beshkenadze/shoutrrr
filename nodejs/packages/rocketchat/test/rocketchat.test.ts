import { describe, expect, it } from 'bun:test';
// Bun shims the bare `undici` specifier with a non-functional MockAgent stub;
// the deep import resolves to the real undici MockAgent, which interoperates
// with the dispatcher-bound request used by the service under Bun.
// @ts-expect-error -- no type declarations for the internal module path
import MockAgent from 'undici/lib/mock/mock-agent.js';
import type { Dispatcher } from 'undici';

// Minimal shape of the options object passed to a MockAgent reply callback.
interface MockReplyOptions {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

const asDispatcher = (agent: unknown): Dispatcher => agent as Dispatcher;
import { Config } from '../src/config.js';
import { createJSONPayload } from '../src/payload.js';
import { RocketchatService, buildURL } from '../src/rocketchat.js';
import { descriptor } from '../src/index.js';

describe('the rocketchat config', () => {
  it('parses host, tokenA and tokenB', () => {
    const config = new Config();
    config.setURL(new URL('rocketchat://rocketchat.my-domain.com/tokenA/tokenB'));
    expect(config.host).toBe('rocketchat.my-domain.com');
    expect(config.tokenA).toBe('tokenA');
    expect(config.tokenB).toBe('tokenB');
    expect(config.channel).toBe('');
    expect(config.userName).toBe('');
  });

  it('generates a URL without an empty port', () => {
    const config = new Config();
    config.setURL(new URL('rocketchat://rocketchat.my-domain.com/tokenA/tokenB'));
    expect(config.getURL().toString()).toBe('rocketchat://rocketchat.my-domain.com/tokenA/tokenB');
  });

  it('preserves the port in the generated URL (#495)', () => {
    const config = new Config();
    config.setURL(new URL('rocketchat://rocketchat.my-domain.com:5055/tokenA/tokenB'));
    expect(config.getURL().toString()).toBe(
      'rocketchat://rocketchat.my-domain.com:5055/tokenA/tokenB',
    );
  });

  it('returns an error when there is no token', () => {
    const config = new Config();
    expect(() => config.setURL(new URL('rocketchat://rocketchat.my-domain.com'))).toThrow();
  });

  it('sets username only', () => {
    const config = new Config();
    config.setURL(new URL('rocketchat://testUserName@rocketchat.my-domain.com/tokenA/tokenB'));
    expect(config.userName).toBe('testUserName');
    expect(config.channel).toBe('');
  });

  it('sets channel only with a leading #', () => {
    const config = new Config();
    config.setURL(new URL('rocketchat://rocketchat.my-domain.com/tokenA/tokenB/testChannel'));
    expect(config.channel).toBe('#testChannel');
  });

  it('parses a badly syntaxed #channel name (many leading #)', () => {
    const config = new Config();
    config.setURL(
      new URL(
        'rocketchat://testUserName@rocketchat.my-domain.com:5055/tokenA/tokenB/###########################testChannel',
      ),
    );
    expect(config.channel).toContain('###########################testChannel');
  });

  it('parses a #channel fragment', () => {
    const config = new Config();
    config.setURL(
      new URL('rocketchat://testUserName@rocketchat.my-domain.com:5055/tokenA/tokenB/#testChannel'),
    );
    expect(config.channel).toContain('#testChannel');
  });
});

describe('buildURL', () => {
  it('builds the webhook URL without a port', () => {
    const config = new Config();
    config.setURL(new URL('rocketchat://rocketchat.my-domain.com/tokenA/tokenB'));
    expect(buildURL(config)).toBe('https://rocketchat.my-domain.com/hooks/tokenA/tokenB');
  });

  it('preserves HOST:PORT in the hook URL', () => {
    const config = new Config();
    config.setURL(
      new URL('rocketchat://testUserName@rocketchat.my-domain.com:5055/tokenA/tokenB/testChannel'),
    );
    expect(buildURL(config)).toContain('my-domain.com:5055');
    expect(buildURL(config)).toBe(
      'https://rocketchat.my-domain.com:5055/hooks/tokenA/tokenB',
    );
  });
});

describe('createJSONPayload', () => {
  it('produces text only when no username/channel', () => {
    const config = new Config();
    config.setURL(new URL('rocketchat://rocketchat.my-domain.com/tokenA/tokenB'));
    expect(JSON.stringify(createJSONPayload(config, 'this is a message'))).toBe(
      '{"text":"this is a message"}',
    );
  });

  it('includes preset username and channel', () => {
    const config = new Config();
    config.setURL(
      new URL('rocketchat://testUserName@rocketchat.my-domain.com/tokenA/tokenB/testChannel'),
    );
    expect(JSON.stringify(createJSONPayload(config, 'this is a message'))).toBe(
      '{"text":"this is a message","username":"testUserName","channel":"#testChannel"}',
    );
  });

  it('lets params override username and channel', () => {
    const config = new Config();
    config.setURL(
      new URL('rocketchat://testUserName@rocketchat.my-domain.com/tokenA/tokenB/testChannel'),
    );
    const payload = createJSONPayload(config, 'this is a message', {
      username: 'overwriteUserName',
      channel: 'overwriteChannel',
    });
    expect(JSON.stringify(payload)).toBe(
      '{"text":"this is a message","username":"overwriteUserName","channel":"overwriteChannel"}',
    );
  });
});

describe('descriptor', () => {
  it('declares the rocketchat scheme and a factory', () => {
    expect(descriptor.schemes).toContain('rocketchat');
    expect(descriptor.factory()).toBeInstanceOf(RocketchatService);
  });
});

describe('Sending messages', () => {
  it('posts the expected JSON payload and resolves on 200', async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();
    let capturedBody = '';
    let capturedContentType = '';
    let capturedPath = '';

    const pool = agent.get('https://rocketchat.my-domain.com');
    pool
      .intercept({ path: '/hooks/tokenA/tokenB', method: 'POST' })
      .reply((opts: MockReplyOptions) => {
        capturedBody = String(opts.body);
        capturedPath = opts.path;
        const ct = opts.headers;
        capturedContentType = ct['Content-Type'] ?? ct['content-type'] ?? '';
        return { statusCode: 200, data: '' };
      });

    const service = new RocketchatService({ dispatcher: asDispatcher(agent) });
    service.initialize(
      new URL('rocketchat://testUserName@rocketchat.my-domain.com/tokenA/tokenB/testChannel'),
    );

    await service.send('this is a message');

    expect(capturedPath).toBe('/hooks/tokenA/tokenB');
    expect(capturedContentType).toBe('application/json');
    expect(JSON.parse(capturedBody)).toEqual({
      text: 'this is a message',
      username: 'testUserName',
      channel: '#testChannel',
    });
    await agent.close();
  });

  it('posts to the host:port webhook when a port is set', async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();
    let hit = false;

    const pool = agent.get('https://rocketchat.my-domain.com:5055');
    pool
      .intercept({ path: '/hooks/tokenA/tokenB', method: 'POST' })
      .reply(() => {
        hit = true;
        return { statusCode: 200, data: '' };
      });

    const service = new RocketchatService({ dispatcher: asDispatcher(agent) });
    service.initialize(
      new URL('rocketchat://testUserName@rocketchat.my-domain.com:5055/tokenA/tokenB/testChannel'),
    );

    await service.send('this is a message');
    expect(hit).toBe(true);
    await agent.close();
  });

  it('includes the response body in the error on non-200', async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();

    const pool = agent.get('https://rocketchat.my-domain.com');
    pool
      .intercept({ path: '/hooks/tokenA/tokenB', method: 'POST' })
      .reply(400, 'bad payload');

    const service = new RocketchatService({ dispatcher: asDispatcher(agent) });
    service.initialize(new URL('rocketchat://rocketchat.my-domain.com/tokenA/tokenB'));

    await expect(service.send('this is a message')).rejects.toThrow(
      'notification failed: 400 bad payload',
    );
    await agent.close();
  });

  it('reports the transport error with host and port context', async () => {
    const agent = new MockAgent();
    agent.disableNetConnect();

    const pool = agent.get('https://rocketchat.my-domain.com:5055');
    pool
      .intercept({ path: '/hooks/tokenA/tokenB', method: 'POST' })
      .replyWithError(new Error('network down'));

    const service = new RocketchatService({ dispatcher: asDispatcher(agent) });
    service.initialize(new URL('rocketchat://rocketchat.my-domain.com:5055/tokenA/tokenB'));

    let message = '';
    try {
      await service.send('this is a message');
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain('network down');
    expect(message).toContain('HOST: rocketchat.my-domain.com');
    expect(message).toContain('PORT: 5055');
    await agent.close();
  });
});
