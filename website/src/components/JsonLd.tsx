/**
 * Renders a JSON-LD structured-data block. `data` is always a static,
 * code-owned object (see src/lib/schema.ts) so there is no untrusted input;
 * "<" is still escaped to < per the standard JSON-LD XSS guard.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
