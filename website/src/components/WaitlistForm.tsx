"use client";

import { useState } from "react";
import styles from "./WaitlistForm.module.css";

type Status = "idle" | "sending" | "ok" | "error";

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
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
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  if (status === "ok") {
    return (
      <p className={styles.done} role="status">
        You are on the list. We will email you when Legibly ships.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate={false}>
      <label className={styles.label} htmlFor="waitlist-email">
        Email
      </label>
      <div className={styles.row}>
        <input
          className={styles.input}
          id="waitlist-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@studio.com"
          aria-describedby={status === "error" ? "waitlist-error" : undefined}
        />
        <button
          className={styles.submit}
          type="submit"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Joining…" : "Get early access"}
        </button>
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
        <p className={styles.error} id="waitlist-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
