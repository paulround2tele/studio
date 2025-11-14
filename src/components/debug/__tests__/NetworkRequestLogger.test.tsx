import React, { act } from 'react';
import { render } from '@testing-library/react';

describe('NetworkRequestLogger', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENABLE_NETWORK_LOGGING;
  const originalFetch = global.fetch;
  const originalSendBeacon = global.navigator?.sendBeacon;

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_NETWORK_LOGGING = originalEnv;
    if (originalFetch) {
      global.fetch = originalFetch;
    }
    if (originalSendBeacon) {
      Object.defineProperty(global.navigator, 'sendBeacon', {
        configurable: true,
        value: originalSendBeacon,
      });
    }
    jest.clearAllMocks();
  });

  it('captures fetch calls and posts to the network log endpoint', async () => {
    process.env.NEXT_PUBLIC_ENABLE_NETWORK_LOGGING = 'true';

    const fetchSpy = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { 'content-type': 'application/json' },
    });

    global.fetch = fetchSpy as unknown as typeof fetch;

    const sendBeaconMock = jest.fn().mockReturnValue(false);
    Object.defineProperty(global.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    });

    const modulePath = require.resolve('../NetworkRequestLogger');
    delete require.cache[modulePath];
    const loggerModule = await import('../NetworkRequestLogger');
    const NetworkRequestLogger = loggerModule.default;

    render(<NetworkRequestLogger />);

    await act(async () => {
      await window.fetch('/api/example', {
        method: 'POST',
        headers: { 'X-Test': 'true' },
      });
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenNthCalledWith(1, '/api/example', {
      method: 'POST',
      headers: { 'X-Test': 'true' },
    });

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/v2/debug/network-log',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
      }),
    );

    const [, logOptions] = fetchSpy.mock.calls[1];
    const body = JSON.parse((logOptions as RequestInit).body as string);

    expect(body.method).toBe('POST');
    expect(body.url).toBe('http://localhost/api/example');
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
    expect(body.requestHeaders).toHaveProperty('x-test', 'true');
  });
});
