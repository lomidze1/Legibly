import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The half of the waitlist endpoint that needs Resend. The existing suite stops
 * at the point where the key is missing; everything past it — storing the
 * contact, the best-effort notification, and the rule that a request only fails
 * when the address was recorded nowhere — is exercised here against a mocked
 * client, so no mail is ever sent and no network call is made.
 */

const contactsCreate = vi.fn();
const emailsSend = vi.fn();
const constructedWith: string[] = [];

vi.mock("resend", () => ({
  Resend: class {
    contacts = { create: contactsCreate };
    emails = { send: emailsSend };
    constructor(apiKey: string) {
      constructedWith.push(apiKey);
    }
  },
}));

const { POST } = await import("./route");
const { site } = await import("@/data/site");

function request(body: unknown, init: RequestInit = {}) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });
}

let errors: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  contactsCreate.mockReset().mockResolvedValue({ error: null });
  emailsSend.mockReset().mockResolvedValue({ error: null });
  constructedWith.length = 0;
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESEND_AUDIENCE_ID = "aud_123";
  delete process.env.WAITLIST_FROM;
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errors.mockRestore();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_AUDIENCE_ID;
});

describe("storing the signup", () => {
  it("adds the address to the audience as a subscribed contact", async () => {
    const res = await POST(request({ email: "designer@studio.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(contactsCreate).toHaveBeenCalledWith({
      audienceId: "aud_123",
      email: "designer@studio.com",
      unsubscribed: false,
    });
  });

  it("builds the client from the environment key, never a literal", async () => {
    await POST(request({ email: "designer@studio.com" }));
    expect(constructedWith).toEqual(["re_test_key"]);
  });

  it("trims the address before storing it", async () => {
    await POST(request({ email: "  designer@studio.com  " }));
    expect(contactsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "designer@studio.com" }),
    );
  });

  it("succeeds on a duplicate, because from the visitor's side nothing failed", async () => {
    // Resend reports an existing contact as an error; the signup still stands.
    contactsCreate.mockResolvedValue({ error: { message: "Contact already exists" } });

    const res = await POST(request({ email: "designer@studio.com" }));

    expect(res.status).toBe(200);
    // The notification then says so, because the address may not be in the list.
    expect(emailsSend.mock.calls[0]?.[0]?.text).toContain("NOT STORED");
  });

  it("falls back to notification-only when no audience is configured", async () => {
    delete process.env.RESEND_AUDIENCE_ID;

    const res = await POST(request({ email: "designer@studio.com" }));

    expect(res.status).toBe(200);
    expect(contactsCreate).not.toHaveBeenCalled();
    expect(emailsSend.mock.calls[0]?.[0]?.text).toContain("NOT STORED");
  });

  it("still succeeds when the contacts call throws outright", async () => {
    contactsCreate.mockRejectedValue(new Error("network down"));

    const res = await POST(request({ email: "designer@studio.com" }));

    expect(res.status).toBe(200);
    expect(emailsSend).toHaveBeenCalled();
  });
});

describe("the notification", () => {
  it("goes to the site address and replies to the person who signed up", async () => {
    await POST(request({ email: "designer@studio.com" }));

    expect(emailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: site.email,
        replyTo: "designer@studio.com",
        subject: "Legibly waitlist: designer@studio.com",
      }),
    );
  });

  it("uses the configured sender when there is one", async () => {
    process.env.WAITLIST_FROM = "Legibly <hello@legibly.design>";
    await POST(request({ email: "designer@studio.com" }));

    expect(emailsSend.mock.calls[0]?.[0]?.from).toBe("Legibly <hello@legibly.design>");
  });

  it("does not say NOT STORED when the contact was stored", async () => {
    await POST(request({ email: "designer@studio.com" }));
    expect(emailsSend.mock.calls[0]?.[0]?.text).not.toContain("NOT STORED");
  });

  it("succeeds even when the notification fails, because the address is stored", async () => {
    emailsSend.mockResolvedValue({ error: { message: "sandbox sender" } });

    const res = await POST(request({ email: "designer@studio.com" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("succeeds when the notification throws, for the same reason", async () => {
    emailsSend.mockRejectedValue(new Error("timeout"));
    await expect(POST(request({ email: "designer@studio.com" }))).resolves.toMatchObject({
      status: 200,
    });
  });
});

describe("when the signup was recorded nowhere", () => {
  it("answers 502 rather than pretending the address was saved", async () => {
    contactsCreate.mockResolvedValue({ error: { message: "invalid audience" } });
    emailsSend.mockResolvedValue({ error: { message: "sender not verified" } });

    const res = await POST(request({ email: "designer@studio.com" }));

    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/could not save/i);
  });

  it("answers 502 when both calls throw", async () => {
    contactsCreate.mockRejectedValue(new Error("down"));
    emailsSend.mockRejectedValue(new Error("down"));

    expect((await POST(request({ email: "designer@studio.com" }))).status).toBe(502);
  });
});

describe("input the endpoint must not act on", () => {
  it("drops a honeypot submission without touching Resend", async () => {
    const res = await POST(request({ email: "designer@studio.com", company: "bot inc" }));

    expect(res.status).toBe(200);
    expect(contactsCreate).not.toHaveBeenCalled();
    expect(emailsSend).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only honeypot as untouched, so an autofill does not lose a real signup", async () => {
    const res = await POST(request({ email: "designer@studio.com", company: "   " }));

    expect(res.status).toBe(200);
    expect(contactsCreate).toHaveBeenCalled();
  });

  it("ignores a non-string honeypot value rather than dropping the signup", async () => {
    await POST(request({ email: "designer@studio.com", company: 1 }));
    expect(contactsCreate).toHaveBeenCalled();
  });

  it.each([
    ["no email field at all", {}],
    ["an email that is null", { email: null }],
    ["an address with no domain", { email: "designer@studio" }],
    ["an address with a space", { email: "de signer@studio.com" }],
    ["an address that is only a domain", { email: "@studio.com" }],
    ["an object where the address should be", { email: { address: "a@b.co" } }],
  ])("refuses %s without calling Resend", async (_name, body) => {
    const res = await POST(request(body));

    expect(res.status).toBe(400);
    expect(contactsCreate).not.toHaveBeenCalled();
    expect(emailsSend).not.toHaveBeenCalled();
  });

  it("refuses an address past the length cap", async () => {
    const long = `${"a".repeat(200)}@studio.com`;

    const res = await POST(request({ email: long }));

    expect(res.status).toBe(400);
    expect(contactsCreate).not.toHaveBeenCalled();
  });

  it("accepts an address exactly at the cap", async () => {
    const exact = `${"a".repeat(200 - "@studio.com".length)}@studio.com`;
    expect(exact).toHaveLength(200);

    expect((await POST(request({ email: exact }))).status).toBe(200);
  });

  it("refuses a body that is not JSON, whatever the content-type claims", async () => {
    const res = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "email=designer@studio.com",
      }),
    );

    expect(res.status).toBe(400);
    expect(contactsCreate).not.toHaveBeenCalled();
  });

  it("refuses a JSON array body", async () => {
    const res = await POST(request(["designer@studio.com"]));

    expect(res.status).toBe(400);
  });
});
