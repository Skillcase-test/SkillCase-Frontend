const VIDEO_CLASSES_TOUR_KEY = "skillcase_video_classes_tour";

export function isVideoClassesTourComplete() {
  try {
    const raw = localStorage.getItem(VIDEO_CLASSES_TOUR_KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.completed === true;
  } catch {
    return false;
  }
}

export function markVideoClassesTourComplete() {
  try {
    localStorage.setItem(
      VIDEO_CLASSES_TOUR_KEY,
      JSON.stringify({ completed: true, updatedAt: Date.now() }),
    );
  } catch {}
}
