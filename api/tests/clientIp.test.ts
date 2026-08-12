import { describe, expect, it } from 'vitest';

import { UNKNOWN_IP, clientIpFrom } from '../src/lib/clientIp';

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
