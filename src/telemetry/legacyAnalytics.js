import { mirrorLegacyEvent } from "./index";

// Source-compatible bridge for old capture call sites. It performs no third-party
// request or storage; all events enter the first-party allowlisted pipeline.
const firstPartyAnalytics = Object.freeze({
  capture(eventName, properties = {}) {
    mirrorLegacyEvent(eventName, properties);
  },
  identify() {
    // Identity is set centrally from authenticated Redux state in App.
  },
});

export function useFirstPartyAnalytics() {
  return firstPartyAnalytics;
}
