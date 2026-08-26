import Axios from "axios";

/**
 * The fields a 400 named as invalid.
 *
 * The backend answers a rejected body with RFC 7807 plus an `errors` map of field name to
 * message. The message itself is the server's English and is never shown: a screen looks
 * up its own wording by field, so a German UI stays German. What travels is only *which*
 * inputs were refused.
 *
 * Returns an empty list for anything that is not a validation failure, so callers can
 * treat "no named fields" as "fall back to the generic message".
 */
export function invalidFields(error: unknown): readonly string[] {
  if (!Axios.isAxiosError(error) || error.response?.status !== 400) return [];
  const errors = (error.response.data as { errors?: unknown } | undefined)?.errors;
  if (typeof errors !== "object" || errors === null) return [];
  return Object.keys(errors as Record<string, unknown>);
}
