import { NextResponse } from "next/server";
import { Resend } from "resend";
import { site } from "@/data/site";

const MAX_EMAIL = 200;

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
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
  const { error } = await resend.emails.send({
    from: "Legibly waitlist <onboarding@resend.dev>",
    to: site.email,
    replyTo: email,
    subject: `Legibly waitlist: ${email}`,
    text: `New waitlist signup: ${email}`,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not save your signup. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
