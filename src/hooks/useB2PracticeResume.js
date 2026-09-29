import { useEffect, useState } from "react";
import { getB2Exercise } from "../api/b2Api";
import { findLatestB2PracticeDraft } from "../utils/b2Draft";

export default function useB2PracticeResume(userId) {
  const [saved, setSaved] = useState(null);
  useEffect(() => {
    let version = 0;
    const refresh = async () => {
      const request = ++version;
      const draft = findLatestB2PracticeDraft(userId);
      setSaved(draft ? { ...draft, userId } : null);
      if (!draft) return;
      try {
        const { data } = await getB2Exercise(draft.exerciseId);
        if (request !== version) return;
        if (data.module && data.module !== draft.module) {
          setSaved(null);
          return;
        }
        setSaved({ ...draft, userId, title: data.title });
      } catch (error) {
        // The draft can still be resumed after a temporary metadata failure.
        // Deleted exercises should not leave a broken shortcut on home.
        if (request === version && [403, 404, 410].includes(error?.response?.status)) {
          setSaved(null);
        }
      }
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      version += 1;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);
  return saved?.userId === userId ? saved : null;
}
