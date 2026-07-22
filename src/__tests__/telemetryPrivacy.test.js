import { describe, expect, it } from "vitest";
import {
  acknowledgedEventIds,
  isOpaqueScriptErrorEvent,
  resolvePersistedEventScope,
  sanitizeCode,
  sanitizeIdentifier,
  sanitizePath,
  sanitizeTelemetryAttributes,
} from "../telemetry";
import { normalizeFlowContext } from "../telemetry/flow";

describe("first-party telemetry privacy and compatibility", () => {
  it("preserves event names of any length while rejecting credentials", () => {
    // These were collapsed to "unknown.event" on the device, before the batch
    for (const name of [
      "learning.flashcard.presented",
      "learning.lesson.screen_presented",
      "job_screening.additional_credentials_uploaded",
      "interaction.unresponsive_candidate",
    ]) {
      expect(sanitizeCode(name, 160, "unknown.event")).toBe(name);
    }

    expect(sanitizeCode("learner@example.com", 160, "unknown.event")).toBe(
      "unknown.event",
    );
    expect(
      sanitizeCode("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6", 160, "unknown.event"),
    ).toBe("unknown.event");
  });

  it("redacts opaque signing tokens in routes and route attributes", () => {
    const token = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi_1234567";
    const route = `/job-screening/terms/sign/${token}?source=email`;

    expect(sanitizePath(route)).toBe("/job-screening/terms/sign/:token");
    expect(sanitizeTelemetryAttributes({ route, target_route: `/invite/${token}` }))
      .toEqual({
        route: "/job-screening/terms/sign/:token",
        target_route: "/invite/:token",
      });
  });

  it("drops contact details while preserving an internal UUID identifier", () => {
    expect(sanitizeIdentifier("learner@example.com")).toBeNull();
    expect(sanitizeIdentifier("+91 98765 43210")).toBeNull();
    expect(sanitizeIdentifier("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("normalizes legacy four/five-argument flow calls without losing metadata", () => {
    expect(
      normalizeFlowContext("success", {
        entity_id: "offer-42",
        poll_type: "manual",
        state: "available",
      }),
    ).toMatchObject({
      lifecycle: "succeeded",
      outcome: "success",
      entityId: "offer-42",
      pollType: "manual",
      state: "available",
    });

    expect(
      normalizeFlowContext("blocked", { validation_code: "email_invalid" }),
    ).toMatchObject({
      lifecycle: "failed",
      outcome: "blocked",
      validationCode: "email_invalid",
    });
  });

  it("deletes only server-acknowledged events from a batch", () => {
    expect(
      acknowledgedEventIds(
        { accepted_event_ids: ["event-1", "not-in-this-batch"] },
        ["event-1", "event-2"],
      ),
    ).toEqual(["event-1"]);
    expect(acknowledgedEventIds({ accepted: 2 }, ["event-1", "event-2"]))
      .toEqual([]);
  });

  it("claims only pending events from the current session", () => {
    const current = resolvePersistedEventScope(
      { event_id: "one", session_id: "session-a" },
      "session-a",
      "user:user-1",
    );
    expect(current.identity_scope).toBe("user:user-1");

    expect(
      resolvePersistedEventScope(
        { event_id: "old", session_id: "session-b" },
        "session-a",
        "user:user-1",
      ),
    ).toBeNull();

    const otherUser = { event_id: "two", identity_scope: "user:user-2" };
    expect(resolvePersistedEventScope(otherUser, "session-a", "user:user-1"))
      .toBe(otherUser);
  });

  it("recognizes only opaque cross-origin script errors for non-paging storage", () => {
    expect(isOpaqueScriptErrorEvent({ message: "Script error.", error: null })).toBe(true);
    expect(isOpaqueScriptErrorEvent({ message: "Script error.", error: new Error("known") })).toBe(false);
    expect(isOpaqueScriptErrorEvent({ message: "Application failed", error: null })).toBe(false);
  });
});
