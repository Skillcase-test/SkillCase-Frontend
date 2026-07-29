import { describe, expect, it } from "vitest";
import { metaEventName, metaEventParams, metaFlowEventName } from "../telemetry/metaEvents";

describe("metaEventName", () => {
  it("maps allowlisted capture() events", () => {
    expect(metaEventName("exam_submitted")).toBe("exam_submitted");
  });

  it("drops events that are not on the allowlist", () => {
    expect(metaEventName("learning_module_started")).toBeNull();
    expect(metaEventName(undefined)).toBeNull();
  });
});

describe("metaFlowEventName", () => {
  it("maps a completed onboarding to the Meta standard registration event", () => {
    expect(metaFlowEventName("learner_onboarding", "flow_completed", "practice")).toBe(
      "fb_mobile_complete_registration",
    );
  });

  it("counts OTP as a login only for returning users", () => {
    expect(metaFlowEventName("learner_onboarding", "otp_verified", "returning_user")).toBe(
      "user_logged_in",
    );
    expect(metaFlowEventName("learner_onboarding", "otp_verified", "new_user")).toBeNull();
  });

  it("ignores mid-flow actions and other flows", () => {
    expect(metaFlowEventName("learner_onboarding", "step_completed", undefined)).toBeNull();
    expect(metaFlowEventName("tour", "flow_completed", undefined)).toBeNull();
  });
});

describe("metaEventParams", () => {
  it("forwards only allowlisted scalar properties", () => {
    expect(
      metaEventParams({
        level: "A1",
        module: "flashcard",
        email: "someone@example.com",
        phone: "+911234567890",
        score: 42,
      }),
    ).toEqual({ level: "A1", module: "flashcard" });
  });

  it("skips empty, non-scalar and non-finite values", () => {
    expect(
      metaEventParams({ level: "", module: { a: 1 }, content_type: Number.NaN }),
    ).toEqual({});
    expect(metaEventParams(null)).toEqual({});
  });
});
