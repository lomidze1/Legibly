/**
 * Every outbound URL in one place.
 *
 * ⚠️ The domain is ours, but the site is not deployed yet and only `/` and
 * `/privacy` exist — the five routes below still 404 until they are built
 * (docs/pre-launch-checklist.md §2).
 */
const SITE = 'https://legibly.design';

export const LINKS = {
  plans: `${SITE}/pricing`,
  docs: `${SITE}/docs`,
  contact: `${SITE}/contact`,
  /** Resend-backed form lives on the site — the plugin never posts email itself. */
  subscribe: `${SITE}/subscribe`,
  feedback: `${SITE}/feedback`,
} as const;
