import { beforeEach, describe, expect, it } from "vitest";
import {
  UNKNOWN_CALLER,
  WAITLIST_LIMIT,
  WAITLIST_WINDOW_MS,
  clientIp,
  rateLimit,
  resetRateLimit,
} from "./rateLimit";

const NOW = 1_700_000_000_000;

beforeEach(() => {
  resetRateLimit();
});

describe("rateLimit", () => {
  it("allows calls up to the limit and blocks the one after", () => {
    for (let i = 0; i < WAITLIST_LIMIT; i++) {
      expect(rateLimit("1.2.3.4", NOW).allowed).toBe(true);
    }

    const blocked = rateLimit("1.2.3.4", NOW);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(WAITLIST_WINDOW_MS / 1000);
  });

  it("keeps callers in separate buckets", () => {
    for (let i = 0; i < WAITLIST_LIMIT; i++) rateLimit("1.2.3.4", NOW);

    expect(rateLimit("1.2.3.4", NOW).allowed).toBe(false);
    expect(rateLimit("5.6.7.8", NOW).allowed).toBe(true);
  });

  it("counts down the wait as the window closes", () => {
    for (let i = 0; i <= WAITLIST_LIMIT; i++) rateLimit("1.2.3.4", NOW);

    const late = rateLimit("1.2.3.4", NOW + WAITLIST_WINDOW_MS - 30_000);
    expect(late.allowed).toBe(false);
    expect(late.retryAfterSeconds).toBe(30);
  });

  it("opens a fresh window once the old one ends", () => {
    for (let i = 0; i <= WAITLIST_LIMIT; i++) rateLimit("1.2.3.4", NOW);
    expect(rateLimit("1.2.3.4", NOW).allowed).toBe(false);

    // One millisecond before, still shut; on the boundary, open again.
    expect(rateLimit("1.2.3.4", NOW + WAITLIST_WINDOW_MS - 1).allowed).toBe(false);
    expect(rateLimit("1.2.3.4", NOW + WAITLIST_WINDOW_MS).allowed).toBe(true);
  });

  it("gives a reopened window the full allowance again", () => {
    for (let i = 0; i <= WAITLIST_LIMIT; i++) rateLimit("1.2.3.4", NOW);

    const later = NOW + WAITLIST_WINDOW_MS;
    for (let i = 0; i < WAITLIST_LIMIT; i++) {
      expect(rateLimit("1.2.3.4", later).allowed).toBe(true);
    }
    expect(rateLimit("1.2.3.4", later).allowed).toBe(false);
  });

  it("forgets callers whose window has closed instead of holding them forever", () => {
    // The sweep is the only thing bounding the map for callers that never come
    // back — one signup each from a thousand addresses must not be permanent.
    for (let i = 0; i < 1000; i++) rateLimit(`10.0.0.${i}`, NOW);

    const fresh = rateLimit("1.2.3.4", NOW + WAITLIST_WINDOW_MS + 1);
    expect(fresh.allowed).toBe(true);
    // The swept-out callers start clean, which is the observable proof.
    for (let i = 0; i < WAITLIST_LIMIT; i++) {
      expect(rateLimit("10.0.0.5", NOW + WAITLIST_WINDOW_MS + 1).allowed).toBe(true);
    }
  });
});

describe("clientIp", () => {
  const headers = (bag: Record<string, string>) => new Headers(bag);

  it("prefers the header Vercel sets itself", () => {
    expect(
      clientIp(
        headers({
          "x-vercel-forwarded-for": "203.0.113.7",
          "x-real-ip": "198.51.100.1",
          "x-forwarded-for": "10.0.0.1",
        }),
      ),
    ).toBe("203.0.113.7");
  });

  it("falls back through the chain, leftmost entry first", () => {
    expect(clientIp(headers({ "x-real-ip": "198.51.100.1" }))).toBe("198.51.100.1");
    expect(clientIp(headers({ "x-forwarded-for": " 203.0.113.7 , 70.41.3.18" }))).toBe("203.0.113.7");
  });

  it("accepts IPv6, including the longest legal form", () => {
    const ipv6 = "0000:0000:0000:0000:0000:ffff:192.168.100.228";
    expect(ipv6).toHaveLength(45);
    expect(clientIp(headers({ "x-forwarded-for": ipv6 }))).toBe(ipv6);
    expect(clientIp(headers({ "x-real-ip": "::1" }))).toBe("::1");
  });

  it("refuses a key an attacker could vary per request", () => {
    // Otherwise every request lands in a new bucket — past the limit entirely —
    // and leaves a map entry behind.
    expect(clientIp(headers({ "x-forwarded-for": "1.2.3.4".padEnd(4096, "0") }))).toBe(UNKNOWN_CALLER);
    expect(clientIp(headers({ "x-forwarded-for": "attacker" }))).toBe(UNKNOWN_CALLER);
    expect(clientIp(headers({ "x-forwarded-for": "1.2.3.4 spaced" }))).toBe(UNKNOWN_CALLER);
  });

  it("does not let a junk header mask a real address behind it", () => {
    expect(clientIp(headers({ "x-vercel-forwarded-for": "junk!", "x-real-ip": "198.51.100.1" }))).toBe(
      "198.51.100.1",
    );
  });

  it("returns a stable placeholder when nothing carries an address", () => {
    expect(clientIp(headers({}))).toBe(UNKNOWN_CALLER);
  });
});
