import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import ChapterSelectTemplate from "../../../components/a1/ChapterSelectTemplate";
import { getNursingChapters } from "../../../api/a1NursingApi";
import { useUsageLimitModule } from "../../../hooks/useUsageLimits";
import { useFeatureFlags } from "../../../hooks/useFeatureFlags";
import { images } from "../../../assets/images";

export default function A1NursingSelect() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled, loading: flagsLoading } = useFeatureFlags();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const { locked: usageLocked } = useUsageLimitModule("A1", "nursing");
  const flagOn = isFeatureEnabled("nursing_german");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (flagsLoading) return;
    if (!flagOn) {
      navigate("/", { replace: true });
      return;
    }

    getNursingChapters()
      .then((res) => setChapters(res.data?.chapters || []))
      .catch((err) => console.error("Error fetching A1 nursing chapters:", err))
      .finally(() => setLoading(false));
  }, [user, navigate, flagOn, flagsLoading]);

  const handleChapterClick = (chapter) => {
    if (usageLocked || chapter?.is_locked) return;
    navigate(`/a1/nursing/${chapter.id}`);
  };

  const getProgress = (chapter) => {
    const total = chapter.card_count || 0;
    const passed = !!chapter.quiz_passed;
    return {
      completed: passed
        ? total
        : Math.min((chapter.current_index || 0) + 1, total),
      total,
    };
  };

  return (
    <ChapterSelectTemplate
      title="Nursing German"
      subtitle="German for your first weeks on the ward — one chapter at a time"
      headerImage={images.nursingGerman}
      chapters={chapters.map((c) => ({
        ...c,
        chapter_name: c.title_en,
        module_number: c.chapter_number,
      }))}
      loading={loading || flagsLoading}
      onChapterClick={handleChapterClick}
      getProgress={getProgress}
      isChapterLocked={(chapter) => usageLocked || !!chapter?.is_locked}
      backPath="/"
    />
  );
}
