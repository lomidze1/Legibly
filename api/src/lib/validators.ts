/**
 * Shape checks for values that arrive from outside — webhook payloads and
 * request bodies. Anything that fails is a refusal, never a coercion.
 */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

export function asStringMax(value: unknown, maxLength: number): string | undefined {
  const text = asString(value);
  return text !== undefined && text.length <= maxLength ? text : undefined;
}

/** Flitt may send an amount as a number or as a string. Anything else is not an amount. */
export function asAmountCents(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}
