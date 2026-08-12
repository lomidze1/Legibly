import { describe, expect, it } from 'vitest';

import type { ApiHandler } from '../src/lib/http.js';
import { withCors } from '../src/middleware/cors.js';
import { fakeResponse } from './helpers.js';

const reached: ApiHandler = (_req, res) => {
  res.status(200).json({ ok: true });
};

describe('withCors', () => {
  it('allows any origin, because a plugin iframe has none', async () => {
    const res = fakeResponse();
    await withCors(reached)({ method: 'GET', headers: { origin: 'null' } }, res);

    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(res.body).toEqual({ ok: true });
  });

  it('permits the Authorization header', async () => {
    const res = fakeResponse();
    await withCors(reached)({ method: 'GET', headers: {} }, res);

    expect(String(res.headers['Access-Control-Allow-Headers'])).toContain('Authorization');
  });

  it('answers the preflight without running the route', async () => {
    const res = fakeResponse();
    let ran = false;
    await withCors((_req, r) => {
      ran = true;
      r.status(200).json({ ok: true });
    })({ method: 'OPTIONS', headers: {} }, res);

    expect(res.statusCode).toBe(204);
    expect(ran).toBe(false);
  });

  it('never enables credentialed CORS — the wildcard depends on it', async () => {
    const res = fakeResponse();
    await withCors(reached)({ method: 'GET', headers: {} }, res);

    expect(res.headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });
});
