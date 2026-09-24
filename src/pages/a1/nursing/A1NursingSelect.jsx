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

  const currentChapter = chapters.find((c) => !c.is_locked && !c.quiz_passed);
  const currentStarted = (currentChapter?.current_index || 0) > 0;

  const getBadge = (chapter, { completed, total }) => {
    if (chapter.quiz_passed) {
      return {
        label: `${total}/${total} done`,
        bg: "bg-[rgba(1,144,53,0.12)]",
        text: "text-[#019035]",
      };
    }
    if (completed >= total && total > 0) {
      return {
        label: "Quiz left",
        bg: "bg-[rgba(255,235,192,0.65)]",
        text: "text-[#ac8121]",
      };
    }
    return null;
  };

  return (
    <ChapterSelectTemplate
      title="Nursing German"
      subtitle="German for your first weeks on the ward — one chapter at a time"
      headerTitle="Nursing German"
      headerImage={images.nursingGerman}
      chapters={chapters.map((c) => ({
        ...c,
        chapter_name: c.title_en,
        module_number: c.chapter_number,
      }))}
      loading={loading || flagsLoading}
      onChapterClick={handleChapterClick}
      getProgress={getProgress}
      getComplete={(chapter) => !!chapter.quiz_passed}
      getBadge={getBadge}
      currentChapterId={currentChapter?.id}
      continueCta={
        currentChapter && {
          label: `${currentStarted ? "Continue" : "Start"} Chapter ${currentChapter.chapter_number} · ${currentChapter.title_en}`,
          onClick: () => handleChapterClick(currentChapter),
        }
      }
      isChapterLocked={(chapter) => usageLocked || !!chapter?.is_locked}
      backPath="/"
    />
  );
}
