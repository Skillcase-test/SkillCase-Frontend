import { useState, useEffect } from "react";
import { fetchSectionsByLevel } from "../api/landingPageApi";

export function useLandingSections(level) {
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!level) return;
    setLoading(true);
    fetchSectionsByLevel(level)
      .then((res) => setSections(res.data))
      .catch(() => setSections(null))
      .finally(() => setLoading(false));
  }, [level]);

  return { sections, loading };
}
