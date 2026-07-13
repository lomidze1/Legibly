/**
 * Phase 1 verify: RPC bridge — promise correlation over postMessage (C2).
 */
import { describe, expect, it, vi } from 'vitest';
import { createRpcClient, createRpcServer, RpcRequest, RpcResponse } from '../src/shared/rpc';

/** Wire a client and server together in-memory. */
function pair(handlers: Parameters<typeof createRpcServer>[0]) {
  let server: (msg: unknown) => void;
  const client = createRpcClient((msg: RpcRequest) => server(msg));
  server = createRpcServer(handlers, (msg: RpcResponse) => client.onMessage(msg));
  return client;
}

describe('rpc', () => {
  it('round-trips a simple call', async () => {
    const client = pair({ ping: () => ({ pong: true }) });
    await expect(client.call('ping')).resolves.toEqual({ pong: true });
  });

  it('passes payloads through', async () => {
    const client = pair({ echo: (p: unknown) => p });
    await expect(client.call('echo', { a: 1 })).resolves.toEqual({ a: 1 });
  });

  it('supports async handlers', async () => {
    const client = pair({ slow: async () => 'done' });
    await expect(client.call('slow')).resolves.toBe('done');
  });

  it('propagates handler errors as rejections', async () => {
    const client = pair({
      boom: () => {
        throw new Error('kaboom');
      },
    });
    await expect(client.call('boom')).rejects.toThrow('kaboom');
  });

  it('rejects unknown types', async () => {
    const client = pair({});
    await expect(client.call('nope')).rejects.toThrow('Unknown RPC type');
  });

  it('correlates concurrent calls by id', async () => {
    const client = pair({
      first: async () => {
        await new Promise((r) => setTimeout(r, 20));
        return 1;
      },
      second: () => 2,
    });
    const [a, b] = await Promise.all([client.call('first'), client.call('second')]);
    expect(a).toBe(1);
    expect(b).toBe(2);
  });

  it('server ignores non-RPC messages', () => {
    const post = vi.fn();
    const server = createRpcServer({}, post);
    server(undefined);
    server({ some: 'noise' });
    expect(post).not.toHaveBeenCalled();
  });

  it('client ignores non-RPC and unmatched messages', async () => {
    const client = createRpcClient(() => undefined);
    client.onMessage(undefined);
    client.onMessage({ legibly: 'rpc-response', id: 999, ok: true });
    // no throw = pass
    expect(true).toBe(true);
  });
});
