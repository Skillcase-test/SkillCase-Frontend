const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export function readB2Draft(key, storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem(key));
    if (
      !value ||
      !Number.isFinite(value.savedAt) ||
      Date.now() - value.savedAt > MAX_AGE ||
      !value.answers ||
      typeof value.answers !== "object" ||
      Array.isArray(value.answers)
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function writeB2Draft(key, answers, blockIndex, storage = localStorage) {
  try {
    storage.setItem(
      key,
      JSON.stringify({ answers, blockIndex, savedAt: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
}
export function removeB2Draft(key, storage = localStorage) {
  try {
    storage.removeItem(key);
  } catch {
    /* Storage can be unavailable. */
  }
}

// Only offer Resume for real work, never an empty draft created by opening a screen.
export function findLatestB2PracticeDraft(userId, storage = localStorage) {
  if (!userId) return null;
  try {
    const prefix = `b2-draft:v1:${userId}:practice:`;
    let latest = null;
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const match = key.slice(prefix.length).match(/^([^:]+):(reading|listening|writing)$/);
      if (!match) continue;
      const draft = readB2Draft(key, storage);
      if (!draft) continue;
      const hasAnswers = Object.values(draft.answers).some((answer) =>
        typeof answer === "string" ? answer.trim().length > 0
          : Array.isArray(answer) ? answer.length > 0
            : typeof answer === "number" && Number.isFinite(answer),
      );
      if (hasAnswers && (!latest || draft.savedAt > latest.savedAt)) {
        latest = { key, exerciseId: match[1], module: match[2], savedAt: draft.savedAt };
      }
    }
    return latest;
  } catch {
    return null;
  }
}
