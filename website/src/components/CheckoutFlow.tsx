"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { site } from "@/data/site";
import styles from "./CheckoutFlow.module.css";

type Duration = "monthly" | "yearly";

/** D28: monthly leads. The money is D23's — one-time, nothing renews. */
const PLANS: Record<Duration, { price: string; label: string; line: string }> = {
  monthly: {
    price: "$12",
    label: "30 days",
    line: "$12 once for 30 days of Pro.",
  },
  yearly: {
    price: "$120",
    label: "365 days · save 17%",
    line: "$120 once for a full year — two months free.",
  },
};

type Account =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "signed-in"; email: string | null; plan: "free" | "pro"; daysLeft: number }
  | { kind: "unreachable" };

export function durationFrom(value: string | null): Duration {
  return value === "yearly" ? "yearly" : "monthly";
}

/** Who is signed in, read through the API's cookie. Never throws. */
async function readAccount(): Promise<Account> {
  try {
    const res = await fetch(`${site.apiUrl}/api/license/me`, { credentials: "include" });
    if (res.status === 401) return { kind: "signed-out" };

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.license) return { kind: "unreachable" };
    return {
      kind: "signed-in",
      email: typeof body.email === "string" ? body.email : null,
      plan: body.license.plan === "pro" ? "pro" : "free",
      daysLeft: Number(body.license.daysLeft ?? 0),
    };
  } catch {
    return { kind: "unreachable" };
  }
}

/**
 * Buying Pro on the website. A licence belongs to a Figma account, so the
 * buyer signs in with Figma first; the API keeps that sign-in in an httpOnly
 * cookie this page cannot read, and every call here sends it along with
 * `credentials: "include"`. The plugin picks the licence up once it connects
 * with the same Figma account.
 */
export function CheckoutFlow() {
  const params = useSearchParams();
  const [duration, setDuration] = useState<Duration>(durationFrom(params.get("billing")));
  const [account, setAccount] = useState<Account>({ kind: "loading" });
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void readAccount().then((next) => {
      if (live) setAccount(next);
    });
    return () => {
      live = false;
    };
  }, []);

  function signIn() {
    const returnTo = `/checkout?billing=${duration}`;
    window.location.assign(
      `${site.apiUrl}/api/auth/figma/login?return_to=${encodeURIComponent(returnTo)}`,
    );
  }

  async function signOut() {
    try {
      await fetch(`${site.apiUrl}/api/auth/me`, { method: "DELETE", credentials: "include" });
    } catch {
      // The cookie expires on its own within a day; the page forgets now.
    }
    setError(null);
    setAccount({ kind: "signed-out" });
  }

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`${site.apiUrl}/api/checkout/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && typeof body.checkoutUrl === "string" && body.checkoutUrl.startsWith("https://")) {
        window.location.assign(body.checkoutUrl);
        return;
      }
      if (res.status === 401) {
        setAccount({ kind: "signed-out" });
        setError("Your sign-in has expired. Continue with Figma again.");
      } else if (body.error === "already_pro") {
        setError(
          `Pro is already active for ${body.remainingDays} more days. You can renew ${body.renewalOpensInDays} days before it ends.`,
        );
      } else {
        setError("Checkout is unavailable right now. Please try again in a minute.");
      }
    } catch {
      setError("Checkout is unavailable right now. Please try again in a minute.");
    }
    setPaying(false);
  }

  return (
    <div className={styles.flow}>
      <fieldset className={styles.plans}>
        <legend className={styles.legend}>Billing period</legend>
        {(["monthly", "yearly"] as const).map((option) => (
          <label
            key={option}
            className={`${styles.plan} ${duration === option ? styles.planActive : ""}`}
          >
            <input
              type="radio"
              name="duration"
              value={option}
              checked={duration === option}
              onChange={() => setDuration(option)}
              className={styles.radio}
            />
            <span className={styles.planPrice}>{PLANS[option].price}</span>
            <span className={styles.planLabel}>{PLANS[option].label}</span>
          </label>
        ))}
      </fieldset>

      <p className={styles.line}>
        {PLANS[duration].line} One-time payment — nothing renews, nothing to cancel.
      </p>

      <div className={styles.account} aria-live="polite">
        {account.kind === "loading" && <p className={styles.line}>Checking your sign-in…</p>}

        {account.kind === "unreachable" && (
          <p className={styles.line}>
            We could not reach Legibly&apos;s server. Refresh the page to try again.
          </p>
        )}

        {account.kind === "signed-out" && (
          <>
            <p className={styles.line}>
              Pro belongs to a Figma account, so sign in with Figma first. There
              is no password and no account to create — we read your Figma user
              id and nothing else.
            </p>
            <Button variant="primary" onClick={signIn}>
              Continue with Figma
            </Button>
          </>
        )}

        {account.kind === "signed-in" && (
          <>
            <p className={styles.line}>
              Signed in with Figma
              {account.email ? (
                <>
                  {" "}as <strong>{account.email}</strong>
                </>
              ) : null}
              .{" "}
              <button type="button" className={styles.link} onClick={signOut}>
                Not you? Sign out
              </button>
            </p>
            {account.plan === "pro" && (
              <p className={styles.line}>
                Pro is active — {account.daysLeft} days left. Buying again adds
                to them.
              </p>
            )}
            <Button variant="primary" onClick={pay} disabled={paying}>
              {paying ? "Opening secure payment…" : `Pay ${PLANS[duration].price}`}
            </Button>
          </>
        )}

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>

      <p className={styles.fine}>
        Payment happens on Flitt&apos;s secure page (PCI-DSS Level 1) — we never
        see your card. Prices are in USD and exclude any local tax. By paying you
        agree to the <a href="/terms">terms</a>.
      </p>
      <p className={styles.fine}>
        Pro unlocks inside the Figma plugin: open Legibly, choose{" "}
        <strong>Free &amp; Pro</strong> and connect with this same Figma account.
      </p>
    </div>
  );
}
