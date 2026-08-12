import { NextResponse } from "next/server";
import { Resend } from "resend";
import { site } from "@/data/site";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const MAX_EMAIL = 200;

/**
 * Persist first, notify second.
 *
 * This endpoint is the site's only conversion goal, so a signup must survive
 * a failed email. The address goes into a Resend audience — a durable,
 * exportable list we can actually mail at launch — and the notification to
 * ourselves is best-effort on top of that. A request only fails if the
 * address was not recorded anywhere.
 */
function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  // Before the body is even read: this is the cheapest possible refusal, and
  // everything past it costs a Resend write or an email.
  const verdict = rateLimit(clientIp(req.headers));
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: "Too many signups from this connection. Please try again later." },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never see this field. If it's filled, it's a bot —
  // accept the request so the bot moves on, but drop the signup.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email = String(body.email ?? "").trim();
  if (!isEmail(email) || email.length > MAX_EMAIL) {
    return NextResponse.json(
      { error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The waitlist is not configured yet. Email us instead." },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  let stored = false;

  if (audienceId) {
    try {
      const { error } = await resend.contacts.create({
        audienceId,
        email,
        unsubscribed: false,
      });
      // A duplicate is a success from the visitor's point of view.
      stored = !error;
      if (error) console.error("waitlist: contacts.create failed", error);
    } catch (err) {
      console.error("waitlist: contacts.create threw", err);
    }
  } else {
    console.error(
      "waitlist: RESEND_AUDIENCE_ID is not set — signups are notification-only",
    );
  }

  // Best-effort heads-up. Set WAITLIST_FROM to a verified sender on the real
  // domain before launch; the Resend sandbox address only delivers to the
  // account owner.
  let notified = false;
  try {
    const { error } = await resend.emails.send({
      from: process.env.WAITLIST_FROM ?? "Legibly waitlist <onboarding@resend.dev>",
      to: site.email,
      replyTo: email,
      subject: `Legibly waitlist: ${email}`,
      text: `New waitlist signup: ${email}${stored ? "" : "\n\nNOT STORED — this address exists only in this email."}`,
    });
    notified = !error;
    if (error) console.error("waitlist: notification email failed", error);
  } catch (err) {
    console.error("waitlist: notification email threw", err);
  }

  if (!stored && !notified) {
    return NextResponse.json(
      { error: "Could not save your signup. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
