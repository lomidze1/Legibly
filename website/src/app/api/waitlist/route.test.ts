import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimit } from "@/lib/rateLimit";
import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    resetRateLimit(); // module state, and every request here shares one caller
  });

  it("rejects malformed JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const res = await POST(request({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/valid email/i);
  });

  it("silently accepts honeypot submissions without sending", async () => {
    const res = await POST(request({ email: "a@b.co", company: "bot inc" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 503 when the API key is not configured", async () => {
    const res = await POST(request({ email: "designer@studio.com" }));
    expect(res.status).toBe(503);
  });
});
