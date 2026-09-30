// Offline-resilient progress writes for Guided German (v2) — the reference
// pattern, adapted to Skillcase's API layer. A lesson completion is written to
// localStorage the moment it happens and retried until the server ACKs, so a
// tunnel-wifi request dying doesn't eat the learner's finished lesson.
import { completeLg2Sub, saveLg2Progress } from "../../../api/learnGermanV2Api";

const KEY = "lg2_pending_progress_v1";

function readQueue() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeQueue(items) {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage full/blocked — progress still lives in component state */
  }
}

// item: { kind: "progress"|"complete", topicId, subKey, payload }
export function enqueue(item) {
  const q = readQueue();
  // Later progress saves for the same lesson supersede earlier ones — the
  // server only needs the newest step_index, not the whole trail.
  const filtered = q.filter(
    (i) =>
      !(
        i.kind === item.kind &&
        i.topicId === item.topicId &&
        i.subKey === item.subKey
      ),
  );
  filtered.push({ ...item, queuedAt: Date.now() });
  writeQueue(filtered);
}

export function pendingCount() {
  return readQueue().length;
}

async function send(item) {
  if (item.kind === "complete") {
    return completeLg2Sub({ topicId: item.topicId, subKey: item.subKey, ...item.payload });
  }
  return saveLg2Progress({ topicId: item.topicId, subKey: item.subKey, ...item.payload });
}

let flushing = false;
// Drains the queue in order. Called on mount, after every save, and on
// `online`. Returns a promise so callers can chain post-flush work.
export async function flush() {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  flushing = true;
  try {
    let q = readQueue();
    while (q.length) {
      const item = q[0];
      try {
        await send(item);
      } catch (err) {
        // The server answered and refused (402 cap, 403 flag off, 404/409
        // content gone, 400 malformed): the verdict won't change on replay,
        // so drop rather than head-of-line block the queue forever. Network
        // failures and 5xx keep their place for the next flush.
        const status = err?.response?.status;
        if (status && status >= 400 && status < 500) {
          q.shift();
          writeQueue(q);
          continue;
        }
        break;
      }
      q.shift();
      writeQueue(q);
    }
  } finally {
    flushing = false;
  }
}

let wired = false;
export function wireFlushOnReconnect() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("online", () => {
    flush().catch(() => {});
  });
}
