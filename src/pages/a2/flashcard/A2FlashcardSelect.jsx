import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import ChapterSelectTemplate from "../../../components/a2/ChapterSelectTemplate";

import { getFlashcardChapters } from "../../../api/a2Api";

export default function A2FlashcardSelect() {
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchChapters = async () => {
      try {
        const res = await getFlashcardChapters();
        setChapters(res.data);
      } catch (err) {
        console.error("Error fetching chapters:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [user, navigate]);

  const handleChapterClick = (chapter) => {
    navigate(
      `/a2/flashcard/${chapter.id}?name=${encodeURIComponent(
        chapter.chapter_name,
      )}`,
    );
  };

  const getProgress = (chapter) => {
    const currentIndex = chapter.current_index || 0;
    const total = chapter.number_of_cards || 0;
    const isCompleted =
      chapter.is_completed || chapter.final_quiz_passed || false;

    return {
      // current_index is 0-indexed position. If completed, show total. Otherwise show cards viewed (index + 1)
      current: isCompleted ? total : Math.min(currentIndex + 1, total),
      total: total,
      isCompleted: isCompleted,
    };
  };

  return (
    <ChapterSelectTemplate
      title="Flashcards"
      chapters={chapters}
      loading={loading}
      onChapterClick={handleChapterClick}
      getProgress={getProgress}
      backPath="/"
      showTourIds
    />
  );
}
