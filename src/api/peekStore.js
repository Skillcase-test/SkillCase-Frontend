// Last good response for a few read-mostly screens, kept in localStorage so a
// revisit or a relaunch can paint straight away while the real request runs.
// Entries are never treated as fresh; they only replace the skeleton.
const PREFIX = "skillcase:peek:v1:";
const INDEX_KEY = `${PREFIX}index`;
const MAX_TOTAL_CHARS = 1_000_000;
const MAX_ENTRY_CHARS = 150_000;

let index = null;

function storage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function loadIndex() {
  if (index) return index;
  index = {};
  try {
    const saved = JSON.parse(storage()?.getItem(INDEX_KEY) || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) index = saved;
  } catch {
    // corrupt index, start over
  }
  return index;
}

function saveIndex() {
  try {
    storage()?.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    // ignore
  }
}

function removeKeys(keys) {
  const store = storage();
  const idx = loadIndex();
  keys.forEach((key) => {
    delete idx[key];
    try {
      store?.removeItem(PREFIX + key);
    } catch {
      // ignore
    }
  });
  if (keys.length) saveIndex();
}

export function readPeek(key, epoch) {
  const idx = loadIndex();
  if (!idx[key]) return undefined;
  try {
    const entry = JSON.parse(storage()?.getItem(PREFIX + key) || "null");
    if (entry && entry.g === epoch) return entry.d;
  } catch {
    // fall through and drop it
  }
  removeKeys([key]);
  return undefined;
}

export function writePeek(key, epoch, tags, data) {
  const store = storage();
  if (!store) return;
  let raw;
  try {
    raw = JSON.stringify({ g: epoch, d: data });
  } catch {
    return;
  }
  if (raw.length > MAX_ENTRY_CHARS) return;

  const idx = loadIndex();
  idx[key] = { s: raw.length, at: Date.now(), t: tags };

  // Oldest entries go first once we pass the budget. The cap keeps us well
  // clear of the quota that redux-persist (and the login) depends on.
  let total = Object.values(idx).reduce((sum, e) => sum + (e.s || 0), 0);
  const victims = [];
  Object.entries(idx)
    .filter(([k]) => k !== key)
    .sort((a, b) => a[1].at - b[1].at)
    .forEach(([k, e]) => {
      if (total > MAX_TOTAL_CHARS) {
        victims.push(k);
        total -= e.s || 0;
      }
    });
  removeKeys(victims);

  try {
    store.setItem(PREFIX + key, raw);
    saveIndex();
  } catch {
    removeKeys([key]);
  }
}

export function dropPeeks(tags) {
  const idx = loadIndex();
  const keys = Object.keys(idx).filter(
    (key) => !tags || (idx[key].t || []).some((tag) => tags.includes(tag)),
  );
  removeKeys(keys);
}

export function dropAllPeeks() {
  const store = storage();
  index = {};
  if (!store) return;
  try {
    const stale = [];
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k?.startsWith(PREFIX)) stale.push(k);
    }
    stale.forEach((k) => store.removeItem(k));
  } catch {
    // ignore
  }
}
