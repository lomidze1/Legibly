import { describe, expect, it } from 'vitest';

import { html, queryParam, redirect } from '../src/lib/http';
import { fakeResponse } from './helpers';

describe('queryParam', () => {
  it('reads a plain value', () => {
    expect(queryParam({ headers: {}, query: { code: 'auth-code' } }, 'code')).toBe('auth-code');
  });

  it('takes the first value when the parameter is repeated', () => {
    // ?state=a&state=b — a second value must not be able to override the first.
    expect(queryParam({ headers: {}, query: { state: ['first', 'second'] } }, 'state')).toBe('first');
  });

  it('treats an empty value as absent, so a blank nonce never reaches a lookup', () => {
    expect(queryParam({ headers: {}, query: { nonce: '' } }, 'nonce')).toBeUndefined();
    expect(queryParam({ headers: {}, query: { nonce: [''] } }, 'nonce')).toBeUndefined();
  });

  it('returns undefined for a missing parameter or a request with no query at all', () => {
    expect(queryParam({ headers: {}, query: {} }, 'code')).toBeUndefined();
    expect(queryParam({ headers: {} }, 'code')).toBeUndefined();
  });

  it('refuses a value that is not a string rather than coercing it', () => {
    const query = { code: 42 } as unknown as Record<string, string | string[] | undefined>;
    expect(queryParam({ headers: {}, query }, 'code')).toBeUndefined();
  });

  it('does not fall through to a prototype property', () => {
    expect(queryParam({ headers: {}, query: {} }, 'constructor')).toBeUndefined();
    expect(queryParam({ headers: {}, query: {} }, 'toString')).toBeUndefined();
  });
});

describe('redirect', () => {
  it('sets Location and sends an empty body with 302 by default', () => {
    const res = fakeResponse();
    redirect(res, 'https://www.figma.com/oauth?state=abc');

    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toBe('https://www.figma.com/oauth?state=abc');
    expect(res.text).toBe('');
  });

  it('honours an explicit status — 303 is what turns a POST return into a GET', () => {
    const res = fakeResponse();
    redirect(res, 'https://legibly.design/checkout/success', 303);

    expect(res.statusCode).toBe(303);
  });
});

describe('html', () => {
  it('declares utf-8 so the connected page renders as markup, not as text', () => {
    const res = fakeResponse();
    html(res, '<p>Connected</p>');

    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('<p>Connected</p>');
  });

  it('takes a status code when the page is an error page', () => {
    const res = fakeResponse();
    html(res, '<p>Gone</p>', 410);

    expect(res.statusCode).toBe(410);
  });
});
