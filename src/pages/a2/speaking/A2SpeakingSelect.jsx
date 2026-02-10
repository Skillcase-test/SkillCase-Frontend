import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import ChapterSelectTemplate from "../../../components/a2/ChapterSelectTemplate";
import { getSpeakingChapters } from "../../../api/a2Api";
export default function A2SpeakingSelect() {
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
        const res = await getSpeakingChapters();
        setChapters(res.data);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [user, navigate]);
  const handleChapterClick = (chapter) => {
    navigate(`/a2/speaking/${chapter.id}`);
  };
  const getProgress = (chapter) => {
    const currentIndex = parseInt(chapter.current_content_index) || 0;
    const total = parseInt(chapter.content_count) || 0;
    const isCompleted = chapter.is_completed || false;

    return {
      // current_content_index is 0-indexed position. If completed, show total. Otherwise show cards viewed (index + 1)
      current: isCompleted ? total : Math.min(currentIndex + 1, total),
      total: total,
      isCompleted: isCompleted,
    };
  };
  return (
    <ChapterSelectTemplate
      title="Speaking"
      chapters={chapters}
      loading={loading}
      onChapterClick={handleChapterClick}
      getProgress={getProgress}
      backPath="/"
      showTourIds={true}
    />
  );
}
