import { jest } from '@jest/globals';
import { sendSlackError } from '../src/services/logger.service.js';

describe('sendSlackError', () => {
  const origEnv = process.env.NODE_ENV;
  const origUrl = process.env.SLACK_WEBHOOK_URL;
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
    if (origUrl === undefined) delete process.env.SLACK_WEBHOOK_URL;
    else process.env.SLACK_WEBHOOK_URL = origUrl;
    global.fetch = originalFetch;
  });

  it('returns early in test env without calling fetch', async () => {
    process.env.NODE_ENV = 'test';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/x';
    const f = jest.fn();
    global.fetch = f;
    await sendSlackError({ method: 'GET', path: '/', statusCode: 500, message: 'x' });
    expect(f).not.toHaveBeenCalled();
  });

  it('returns when no SLACK_WEBHOOK_URL configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SLACK_WEBHOOK_URL;
    const f = jest.fn();
    global.fetch = f;
    await sendSlackError({ method: 'GET', path: '/', statusCode: 500, message: 'x' });
    expect(f).not.toHaveBeenCalled();
  });

  it('posts to webhook with stack', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    const f = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = f;
    await sendSlackError({ method: 'POST', path: '/api/x', statusCode: 500, message: 'oops', stack: 'trace lines' });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('https://hooks.slack.com/test');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.blocks.length).toBe(2);
  });

  it('posts to webhook without stack (single block)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    const f = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = f;
    await sendSlackError({ method: 'GET', path: '/', statusCode: 503, message: 'no stack' });
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.blocks.length).toBe(1);
  });

  it('swallows fetch errors silently', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(sendSlackError({ method: 'GET', path: '/', statusCode: 500, message: 'x' })).resolves.toBeUndefined();
    errSpy.mockRestore();
  });
});
