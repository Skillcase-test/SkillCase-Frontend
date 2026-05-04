import { useState, useEffect } from "react";
import { fetchSectionsByLevel } from "../api/landingPageApi";

export function useLandingSections(level) {
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!level) return;
    let mounted = true;
    setLoading(true);
    fetchSectionsByLevel(level)
      .then((res) => {
        if (mounted) setSections(res.data);
      })
      .catch(() => {
        if (mounted) setSections(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [level]);

  return { sections, loading };
}
