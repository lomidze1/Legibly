import { describe, expect, it } from 'vitest';

import { UNKNOWN_IP, clientIpFrom } from '../src/lib/clientIp.js';

describe('clientIpFrom', () => {
  it('prefers the header Vercel sets itself', () => {
    const ip = clientIpFrom({
      'x-vercel-forwarded-for': '203.0.113.7',
      'x-real-ip': '198.51.100.1',
      'x-forwarded-for': '10.0.0.1',
    });
    expect(ip).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip, then to x-forwarded-for', () => {
    expect(clientIpFrom({ 'x-real-ip': '198.51.100.1', 'x-forwarded-for': '10.0.0.1' })).toBe('198.51.100.1');
    expect(clientIpFrom({ 'x-forwarded-for': '10.0.0.1' })).toBe('10.0.0.1');
  });

  it('takes the leftmost entry of a forwarding chain', () => {
    expect(clientIpFrom({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' })).toBe('203.0.113.7');
  });

  it('trims whitespace around the entry', () => {
    expect(clientIpFrom({ 'x-forwarded-for': '  203.0.113.7 , 70.41.3.18' })).toBe('203.0.113.7');
  });

  it('handles a repeated header arriving as an array', () => {
    expect(clientIpFrom({ 'x-forwarded-for': ['203.0.113.7', '70.41.3.18'] })).toBe('203.0.113.7');
  });

  it('skips empty values instead of returning an empty string', () => {
    expect(clientIpFrom({ 'x-vercel-forwarded-for': '', 'x-real-ip': '198.51.100.1' })).toBe('198.51.100.1');
    expect(clientIpFrom({ 'x-forwarded-for': ' , 70.41.3.18' })).toBe(UNKNOWN_IP);
  });

  it('returns a stable placeholder when no header carries an address', () => {
    expect(clientIpFrom({})).toBe(UNKNOWN_IP);
    expect(clientIpFrom({ 'x-real-ip': undefined })).toBe(UNKNOWN_IP);
  });
});

/**
 * The returned value becomes a rate-limit primary key. An unbounded,
 * attacker-chosen string there is both an escape from the limit — every request
 * lands in a fresh bucket — and an unbounded row written per attempt.
 */
describe('clientIpFrom — the value has to be an address', () => {
  const IPV6 = '0000:0000:0000:0000:0000:ffff:192.168.100.228'; // 45 chars, the longest legal form

  it('accepts the longest legal IPv6 form', () => {
    expect(IPV6).toHaveLength(45);
    expect(clientIpFrom({ 'x-forwarded-for': IPV6 })).toBe(IPV6);
    expect(clientIpFrom({ 'x-real-ip': '::1' })).toBe('::1');
  });

  it('refuses one character more than that', () => {
    expect(clientIpFrom({ 'x-forwarded-for': `0${IPV6}` })).toBe(UNKNOWN_IP);
  });

  it('refuses a padded key an attacker could vary per request', () => {
    expect(clientIpFrom({ 'x-forwarded-for': '1.2.3.4'.padEnd(4096, '0') })).toBe(UNKNOWN_IP);
  });

  it('refuses anything that is not address-shaped', () => {
    for (const value of ['attacker', "1.2.3.4'; DROP TABLE rate_limits;--", '1.2.3.4 ok', '<script>']) {
      expect(clientIpFrom({ 'x-forwarded-for': value })).toBe(UNKNOWN_IP);
    }
  });

  it('falls through to the next header rather than trusting a bad one', () => {
    // x-forwarded-for is last in precedence, so this is defence in depth — but a
    // junk value must never mask a real address that a later header carries.
    expect(clientIpFrom({ 'x-vercel-forwarded-for': 'junk!', 'x-real-ip': '198.51.100.1' })).toBe(
      '198.51.100.1',
    );
  });
});
