const LG_FIRST_TIME_GUIDE_KEY = "skillcase_lg_first_time_guide";
const LG_FIRST_LANDING_MARKER_KEY = "skillcase_lg_first_landing_marker";

export const LG_GUIDE_STAGES = {
  NOT_STARTED: "not_started",
  CHAPTER_CLICK_DONE: "chapter_click_done",
  TAP_TIP_DONE: "tap_tip_done",
  COMPLETE: "complete",
};

export function getLgGuideStage() {
  try {
    const raw = localStorage.getItem(LG_FIRST_TIME_GUIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.stage || null;
  } catch {
    return null;
  }
}

export function setLgGuideStage(stage) {
  try {
    localStorage.setItem(
      LG_FIRST_TIME_GUIDE_KEY,
      JSON.stringify({ stage, updatedAt: Date.now() }),
    );
  } catch {}
}

export function setLgFirstLandingMarker() {
  try {
    localStorage.setItem(LG_FIRST_LANDING_MARKER_KEY, "1");
  } catch {}
}

export function getLgFirstLandingMarker() {
  try {
    return localStorage.getItem(LG_FIRST_LANDING_MARKER_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearLgFirstLandingMarker() {
  try {
    localStorage.removeItem(LG_FIRST_LANDING_MARKER_KEY);
  } catch {}
}
