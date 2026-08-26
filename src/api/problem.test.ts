import { invalidFields } from "@/api/problem";
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

function rejection(status: number, data: unknown): AxiosError {
  const error = new AxiosError("rejected");
  error.response = {
    status,
    statusText: "",
    data,
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

/**
 * The half of the contract the backend cannot enforce.
 *
 * A rename of the `errors` property, or a 400 that stops carrying it, would not fail a
 * build — the form would simply go back to saying "something went wrong" for a password
 * one character short. That is exactly the failure this reads for.
 */
describe("invalidFields", () => {
  it("names the fields a 400 refused", () => {
    const error = rejection(400, {
      status: 400,
      detail: "password: Use at least 10 characters",
      errors: { password: "Use at least 10 characters" },
    });
    expect(invalidFields(error)).toEqual(["password"]);
  });

  it("keeps every refused field, not just the first", () => {
    const error = rejection(400, {
      errors: { email: "must be well-formed", password: "too short" },
    });
    expect(invalidFields(error)).toEqual(["email", "password"]);
  });

  it("finds nothing in a 400 that named no fields", () => {
    expect(
      invalidFields(rejection(400, { detail: "The request body is not valid JSON." })),
    ).toEqual([]);
  });

  it("ignores failures that are not about the request body", () => {
    expect(invalidFields(rejection(409, { errors: { email: "taken" } }))).toEqual([]);
    expect(invalidFields(new Error("offline"))).toEqual([]);
  });
});
