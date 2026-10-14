import { useState, useEffect, useRef } from "react";
import { fetchSectionsByLevel } from "../api/landingPageApi";

// Home mounts on every tab switch; reuse a fetch for a minute and keep the
// last copy so the sections don't pop in after the rest of the page.
const FRESH_MS = 60_000;
const STORAGE_PREFIX = "skillcase:landing-sections:v1:";
const recent = new Map();

function readStored(level) {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + level) || "null");
  } catch {
    return null;
  }
}

function store(level, data) {
  recent.set(level, { data, at: Date.now() });
  try {
    const raw = JSON.stringify(data);
    if (raw.length < 100_000) localStorage.setItem(STORAGE_PREFIX + level, raw);
  } catch {
    // storage full or blocked, the in-memory copy still works
  }
}

export function useLandingSections(level) {
  const [sections, setSections] = useState(() =>
    level ? (recent.get(level)?.data ?? readStored(level)) : null,
  );
  const [loading, setLoading] = useState(!sections);
  const shownLevel = useRef(level);

  useEffect(() => {
    if (!level) return;
    const hit = recent.get(level);
    if (hit && Date.now() - hit.at < FRESH_MS) {
      shownLevel.current = level;
      setSections(hit.data);
      setLoading(false);
      return;
    }
    let mounted = true;
    if (shownLevel.current !== level) {
      shownLevel.current = level;
      const stored = hit?.data ?? readStored(level);
      setSections(stored);
      setLoading(!stored);
    }
    fetchSectionsByLevel(level)
      .then((res) => {
        store(level, res.data);
        if (mounted) setSections(res.data);
      })
      // On failure keep whatever is already on screen
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [level]);

  return { sections, loading };
}
