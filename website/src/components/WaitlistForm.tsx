"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button";
import styles from "./WaitlistForm.module.css";

type Status = "idle" | "sending" | "ok" | "error";

/**
 * The page renders this twice (hero and final CTA). Joining in one used to
 * leave the other still asking for the same address, so the joined state is
 * shared for the session and broadcast to every mounted instance.
 */
const JOINED_KEY = "legibly:waitlist-joined";
const JOINED_EVENT = "legibly:waitlist-joined";

/** Same test the API applies, so the two cannot disagree about one address. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WaitlistForm() {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const submittedHere = useRef(false);

  // Pick up a join that happened before this instance mounted, or in the other one.
  useEffect(() => {
    /*
     * Both directions. The joined state broadcasts to every mounted instance,
     * and so does un-joining: without the else branch, "Enter another" put the
     * form the user clicked back to idle and left its sibling stuck on the
     * confirmation.
     */
    const sync = () => {
      if (sessionStorage.getItem(JOINED_KEY)) setStatus("ok");
      else setStatus((current) => (current === "ok" ? "idle" : current));
    };
    sync();
    window.addEventListener(JOINED_EVENT, sync);
    return () => window.removeEventListener(JOINED_EVENT, sync);
  }, []);

  // Only the form that was actually submitted moves focus; the sibling just swaps.
  useEffect(() => {
    if (status === "ok" && submittedHere.current) doneRef.current?.focus();
    if (status === "error") inputRef.current?.focus();
  }, [status]);

  function reset() {
    sessionStorage.removeItem(JOINED_KEY);
    submittedHere.current = false;
    setStatus("idle");
    setError("");
    window.dispatchEvent(new Event(JOINED_EVENT));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    /*
     * Validate here rather than letting `required` / type="email" raise the
     * browser's native bubble: that tooltip is unstyled, vanishes on scroll,
     * and would mean the most common failure on the page never reaches the
     * error line this form already builds (role="alert", focus returned).
     */
    const email = String(data.get("email") ?? "").trim();
    if (!EMAIL.test(email)) {
      setStatus("error");
      setError("Please enter a valid email address.");
      return;
    }

    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          company: data.get("company"),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      submittedHere.current = true;
      sessionStorage.setItem(JOINED_KEY, "1");
      window.dispatchEvent(new Event(JOINED_EVENT));
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  if (status === "ok") {
    return (
      <div>
        <p className={styles.done} role="status" tabIndex={-1} ref={doneRef}>
          You are on the list. We will email you once at Figma Community
          launch, and not before.
        </p>
        <p className={styles.doneNext}>
          Meanwhile, the honest part:{" "}
          <a href="#faq">which criteria Legibly does not check</a>. Wrong
          address?{" "}
          <button type="button" className={styles.reset} onClick={reset}>
            Enter another
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <label className={styles.label} htmlFor={fieldId}>
        Email
      </label>
      <div className={styles.row}>
        <input
          className={styles.input}
          id={fieldId}
          ref={inputRef}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@studio.com"
          aria-invalid={status === "error" || undefined}
          aria-describedby={status === "error" ? errorId : undefined}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Joining…" : "Get early access"}
        </Button>
      </div>
      {/* Honeypot: hidden from real users, bots fill it. */}
      <input
        className={styles.honeypot}
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      {status === "error" && (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
