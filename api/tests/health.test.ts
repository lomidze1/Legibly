import { describe, expect, it } from 'vitest';

import type { ApiRequest, ApiResponse } from '../src/lib/http';
import { createHealthHandler } from '../src/routes/health';

function fakeResponse(): ApiResponse & { statusCode: number | null; body: unknown } {
  return {
    statusCode: null,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return undefined;
    },
    setHeader() {
      return undefined;
    },
  };
}

const get: ApiRequest = { method: 'GET', headers: {} };

describe('health handler', () => {
  it('reports the store as up', async () => {
    const res = fakeResponse();
    await createHealthHandler(async () => true)(get, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, store: 'up' });
  });

  it('answers 503 when the store does not respond', async () => {
    const res = fakeResponse();
    await createHealthHandler(async () => false)(get, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ ok: false, store: 'down' });
  });

  it('serves HEAD as well as GET', async () => {
    const res = fakeResponse();
    await createHealthHandler(async () => true)({ method: 'HEAD', headers: {} }, res);

    expect(res.statusCode).toBe(200);
  });

  it('refuses other methods without touching the store', async () => {
    const res = fakeResponse();
    let pinged = false;
    await createHealthHandler(async () => {
      pinged = true;
      return true;
    })({ method: 'POST', headers: {} }, res);

    expect(res.statusCode).toBe(405);
    expect(pinged).toBe(false);
  });
});
