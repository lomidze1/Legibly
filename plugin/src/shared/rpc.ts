/**
 * Typed promise-based RPC over postMessage (C2). Transport-agnostic and
 * pure so it is unit-testable; main and ui each wire their own transport.
 */

export interface RpcRequest {
  legibly: 'rpc-request';
  id: number;
  type: string;
  payload?: unknown;
}

export interface RpcResponse {
  legibly: 'rpc-response';
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export type RpcHandler = (payload: never) => unknown | Promise<unknown>;

export function isRpcRequest(msg: unknown): msg is RpcRequest {
  return !!msg && (msg as RpcRequest).legibly === 'rpc-request';
}

export function isRpcResponse(msg: unknown): msg is RpcResponse {
  return !!msg && (msg as RpcResponse).legibly === 'rpc-response';
}

/** Server side (main thread): routes requests to handlers, posts responses. */
export function createRpcServer(
  handlers: Record<string, RpcHandler>,
  post: (msg: RpcResponse) => void
): (msg: unknown) => void {
  return (msg: unknown) => {
    if (!isRpcRequest(msg)) return;
    const handler = handlers[msg.type];
    if (!handler) {
      post({ legibly: 'rpc-response', id: msg.id, ok: false, error: `Unknown RPC type: ${msg.type}` });
      return;
    }
    void Promise.resolve()
      .then(() => handler(msg.payload as never))
      .then((result) => post({ legibly: 'rpc-response', id: msg.id, ok: true, result }))
      .catch((e: unknown) =>
        post({
          legibly: 'rpc-response',
          id: msg.id,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        })
      );
  };
}

export interface RpcClient {
  call<T>(type: string, payload?: unknown): Promise<T>;
  onMessage(msg: unknown): void;
}

/** Client side (UI iframe): correlates responses to pending calls by id. */
export function createRpcClient(post: (msg: RpcRequest) => void): RpcClient {
  let nextId = 1;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  return {
    call<T>(type: string, payload?: unknown): Promise<T> {
      const id = nextId++;
      return new Promise<T>((resolve, reject) => {
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        post({ legibly: 'rpc-request', id, type, payload });
      });
    },
    onMessage(msg: unknown): void {
      if (!isRpcResponse(msg)) return;
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.result);
      else p.reject(new Error(msg.error ?? 'RPC error'));
    },
  };
}
