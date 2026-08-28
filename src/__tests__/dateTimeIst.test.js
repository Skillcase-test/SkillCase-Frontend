// The admin scheduling helpers claim IST on every label. These pin that claim
// so a non-IST developer machine can't quietly reintroduce a local-time bug.
import { describe, test, expect } from "vitest";
import { toUTC, toLocalInput, formatDateTime } from "../utils/dateTime";

describe("toUTC", () => {
  test("reads a datetime-local as IST, not machine-local", () => {
    // 14:30 IST == 09:00 UTC, regardless of where the admin's laptop is.
    expect(toUTC("2026-09-15T14:30")).toBe("2026-09-15T09:00:00.000Z");
  });

  test("rolls back a day when IST midnight crosses UTC", () => {
    expect(toUTC("2026-09-15T02:00")).toBe("2026-09-14T20:30:00.000Z");
  });

  test("empty input clears the field", () => {
    expect(toUTC("")).toBeNull();
    expect(toUTC(null)).toBeNull();
  });

  test("throws on garbage rather than silently clearing the deadline", () => {
    // Returning null here would make a typo wipe the redemption window.
    expect(() => toUTC("not-a-date")).toThrow(/Invalid date\/time/);
  });
});

describe("toLocalInput", () => {
  test("renders a UTC timestamp as IST wall clock", () => {
    expect(toLocalInput("2026-09-15T09:00:00.000Z")).toBe("2026-09-15T14:30");
  });

  test("round-trips with toUTC", () => {
    expect(toLocalInput(toUTC("2026-12-31T23:59"))).toBe("2026-12-31T23:59");
  });

  test("treats a bare Postgres timestamp as UTC", () => {
    expect(toLocalInput("2026-09-15 09:00:00")).toBe("2026-09-15T14:30");
  });

  test("empty and unparseable values render as an empty input", () => {
    expect(toLocalInput(null)).toBe("");
    expect(toLocalInput("nope")).toBe("");
  });
});

describe("formatDateTime", () => {
  test("formats in Asia/Kolkata", () => {
    const out = formatDateTime("2026-09-15T09:00:00.000Z");
    expect(out).toMatch(/15 Sept? 2026/); // ICU renders "Sep" or "Sept" by version
    expect(out).toMatch(/02:30\s*pm/i); // 14:30 IST
  });

  test("missing and invalid values show a dash", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("nope")).toBe("—");
  });
});
