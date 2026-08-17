/**
 * Which registry modules belong in one user's per-user override editor: the
 * user's own level, plus any 'ALL' module they can actually reach. 'ALL' means
 * "one shared counter pool", not "every user sees it" — the German Classes tab
 * is hidden for B1/B2 (see TopModeSwitcher), so the video_courses row in
 * backend util/usageLimits.js MODULE_REGISTRY carries available_levels and this
 * respects it. Without the 'ALL' half, level-agnostic modules had no per-user
 * override or unlimited-exemption path at all.
 */
export function isModuleVisibleForUser(module, userLevel) {
  const level = String(userLevel || "").toUpperCase();
  if (module.level === level) return true;
  if (module.level !== "ALL") return false;
  return !module.available_levels || module.available_levels.includes(level);
}
