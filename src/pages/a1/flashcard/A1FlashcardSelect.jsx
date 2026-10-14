import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import ChapterSelectTemplate from "../../../components/a1/ChapterSelectTemplate";
import { getFlashcardChapters } from "../../../api/a1Api";
import { useUsageLimitModule } from "../../../hooks/useUsageLimits";
import { useCacheSeed } from "../../../hooks/useCacheSeed";

// Always 12 modules; the ones the API doesn't return yet show as locked
function toChapters(data) {
  const apiChapters = Array.isArray(data) ? data : [];

  const getChapterNumber = (chapter) => {
    const moduleNumber = Number(chapter?.module_number);
    if (Number.isFinite(moduleNumber) && moduleNumber > 0) {
      return moduleNumber;
    }

    const orderBased = Number(chapter?.order_index);
    if (Number.isFinite(orderBased) && orderBased >= 0) {
      return orderBased + 1;
    }

    return null;
  };

  const chapterByNumber = new Map();
  apiChapters.forEach((chapter) => {
    const number = getChapterNumber(chapter);
    if (number >= 1 && number <= 12 && !chapterByNumber.has(number)) {
      chapterByNumber.set(number, chapter);
    }
  });

  const normalizedChapters = Array.from({ length: 12 }, (_, idx) => {
    const moduleNumber = idx + 1;
    const existingChapter = chapterByNumber.get(moduleNumber);

    if (existingChapter) {
      return {
        ...existingChapter,
        module_number: moduleNumber,
        is_locked: false,
      };
    }

    return {
      id: `locked-${moduleNumber}`,
      chapter_name: `Module ${moduleNumber}`,
      module_number: moduleNumber,
      number_of_cards: 0,
      current_index: 0,
      is_completed: false,
      is_locked: true,
    };
  });

  return normalizedChapters;
}

export default function A1FlashcardSelect() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const seed = useCacheSeed(getFlashcardChapters, toChapters);
  const [chapters, setChapters] = useState(seed ?? []);
  const [loading, setLoading] = useState(!seed);
  const { locked: usageLocked } = useUsageLimitModule("A1", "flashcard");

  useEffect(() => {
    if (!user) {
      navigate("/onboarding");
      return;
    }

    const fetchChapters = async () => {
      try {
        const res = await getFlashcardChapters();
        setChapters(toChapters(res.data));
      } catch (err) {
        console.error("Error fetching A1 flashcard chapters:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [user, navigate]);

  const handleChapterClick = (chapter) => {
    if (usageLocked || chapter?.is_locked) return;
    navigate(
      `/a1/flashcard/${chapter.id}?name=${encodeURIComponent(
        chapter.chapter_name,
      )}`,
    );
  };

  const getProgress = (chapter) => {
    if (chapter?.is_locked) {
      return {
        current: 0,
        total: 0,
        isCompleted: false,
      };
    }

    const currentIndex = chapter.current_index || 0;
    const total = chapter.number_of_cards || 0;
    const isCompleted =
      chapter.is_completed || chapter.final_quiz_passed || false;

    return {
      current: isCompleted ? total : Math.min(currentIndex + 1, total),
      total,
      isCompleted,
    };
  };

  return (
    <ChapterSelectTemplate
      title="Flashcards"
      subtitle="Build A1 vocabulary with image-first memory cards"
      chapters={chapters}
      loading={loading}
      onChapterClick={handleChapterClick}
      getProgress={getProgress}
      isChapterLocked={(chapter) => usageLocked || !!chapter?.is_locked}
      backPath="/"
      showTourIds={true}
    />
  );
}
