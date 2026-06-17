import { describe, it, expect, afterEach } from 'bun:test';
// Bun's built-in `undici` shim lacks a working MockAgent; import the real one
// from the installed package's submodule, which loads cleanly under Bun.
// @ts-expect-error - no type declarations for the deep submodule path.
import MockAgent from 'undici/lib/mock/mock-agent.js';
// @ts-expect-error - no type declarations for the deep submodule path.
import { setGlobalDispatcher, getGlobalDispatcher } from 'undici/lib/global.js';
import { GoogleChatConfig } from '../src/config.js';
import { GoogleChatService } from '../src/googlechat.js';
import { descriptor } from '../src/index.js';

describe('Google Chat Service', () => {
  it('should build a valid Google Chat Incoming Webhook URL', () => {
    const config = new GoogleChatConfig();
    config.setURL(
      new URL(
        'googlechat://chat.googleapis.com/v1/spaces/FOO/messages?key=bar&token=baz',
      ),
    );

    const expected =
      'https://chat.googleapis.com/v1/spaces/FOO/messages?key=bar&token=baz';
    expect(config.getAPIURL().toString()).toBe(expected);
  });

  describe('parsing the configuration URL', () => {
    it('should be identical after de-/serialization', () => {
      const testURL =
        'googlechat://chat.googleapis.com/v1/spaces/FOO/messages?key=bar&token=baz';

      const config = new GoogleChatConfig();
      config.setURL(new URL(testURL));

      expect(config.getURL().toString()).toBe(testURL);
    });
  });

  describe('setURL validation', () => {
    it("should error when 'key' is missing", () => {
      const config = new GoogleChatConfig();
      expect(() =>
        config.setURL(
          new URL('googlechat://chat.googleapis.com/v1/spaces/FOO/messages?token=baz'),
        ),
      ).toThrow("missing field 'key'");
    });

    it("should error when 'token' is missing", () => {
      const config = new GoogleChatConfig();
      expect(() =>
        config.setURL(
          new URL('googlechat://chat.googleapis.com/v1/spaces/FOO/messages?key=bar'),
        ),
      ).toThrow("missing field 'token'");
    });
  });

  describe('descriptor', () => {
    it('should expose both googlechat and hangouts schemes', () => {
      expect(descriptor.schemes).toContain('googlechat');
      expect(descriptor.schemes).toContain('hangouts');
      expect(descriptor.schemes).toEqual(['googlechat', 'hangouts']);
    });
  });

  describe('sending the payload', () => {
    let mockAgent: InstanceType<typeof MockAgent> | undefined;

    afterEach(async () => {
      if (mockAgent) {
        await mockAgent.close();
        mockAgent = undefined;
      }
    });

    it('should not report an error if the server accepts the payload', async () => {
      mockAgent = new MockAgent();
      mockAgent.disableNetConnect();

      const pool = mockAgent.get('https://chat.googleapis.com');
      pool
        .intercept({
          path: '/v1/spaces/FOO/messages?key=bar&token=baz',
          method: 'POST',
          body: JSON.stringify({ text: 'Message' }),
        })
        .reply(200, '');

      const config = new GoogleChatConfig();
      config.host = 'chat.googleapis.com';
      config.path = '/v1/spaces/FOO/messages';
      config.key = 'bar';
      config.token = 'baz';

      const service = new GoogleChatService({ dispatcher: mockAgent });
      service.initialize(config.getURL());

      await expect(service.send('Message')).resolves.toBeUndefined();
      mockAgent.assertNoPendingInterceptors();
    });

    it('should reject when the server returns an error status', async () => {
      mockAgent = new MockAgent();
      mockAgent.disableNetConnect();

      const pool = mockAgent.get('https://chat.googleapis.com');
      pool
        .intercept({
          path: '/v1/spaces/FOO/messages?key=bar&token=baz',
          method: 'POST',
        })
        .reply(400, 'bad request');

      const service = new GoogleChatService({ dispatcher: mockAgent });
      service.initialize(
        new URL(
          'googlechat://chat.googleapis.com/v1/spaces/FOO/messages?key=bar&token=baz',
        ),
      );

      await expect(service.send('Message')).rejects.toThrow(
        'Google Chat API notification returned 400 HTTP status code',
      );
    });

    it('should use the global dispatcher when none is injected', async () => {
      const previous = getGlobalDispatcher();
      mockAgent = new MockAgent();
      mockAgent.disableNetConnect();
      setGlobalDispatcher(mockAgent);

      try {
        const pool = mockAgent.get('https://chat.googleapis.com');
        pool
          .intercept({
            path: '/v1/spaces/FOO/messages?key=bar&token=baz',
            method: 'POST',
            body: JSON.stringify({ text: 'Message' }),
          })
          .reply(200, '');

        // No dispatcher injected: exercises the getGlobalDispatcher() default.
        const service = new GoogleChatService();
        service.initialize(
          new URL(
            'googlechat://chat.googleapis.com/v1/spaces/FOO/messages?key=bar&token=baz',
          ),
        );

        await expect(service.send('Message')).resolves.toBeUndefined();
        mockAgent.assertNoPendingInterceptors();
      } finally {
        setGlobalDispatcher(previous);
      }
    });
  });
});
