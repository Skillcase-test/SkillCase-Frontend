import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import ChapterSelectTemplate from "../../../components/a2/ChapterSelectTemplate";
import { getListeningChapters } from "../../../api/a2Api";
export default function A2ListeningSelect() {
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
        const res = await getListeningChapters();
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
    navigate(`/a2/listening/${chapter.id}`);
  };
  const getProgress = (chapter) => ({
    current: parseInt(chapter.completed_count) || 0,
    total: parseInt(chapter.content_count) || 0,
    isCompleted:
      chapter.completed_count === chapter.content_count &&
      chapter.content_count > 0,
  });
  return (
    <ChapterSelectTemplate
      title="Listening"
      chapters={chapters}
      loading={loading}
      onChapterClick={handleChapterClick}
      getProgress={getProgress}
      backPath="/"
      showTourIds={true}
    />
  );
}
