import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import ChapterSelectTemplate from "../../../components/a2/ChapterSelectTemplate";
import { getGrammarTopics } from "../../../api/a2Api";
export default function A2GrammarSelect() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchData = async () => {
      try {
        const res = await getGrammarTopics();
        // Group by chapter
        const chapterMap = {};
        res.data.forEach((row) => {
          if (!chapterMap[row.chapter_id]) {
            chapterMap[row.chapter_id] = {
              id: row.chapter_id,
              chapter_name: row.chapter_name,
              description: row.description,
              topics: [],
              completedCount: 0,
              totalCount: 0,
            };
          }
          if (row.topic_id) {
            chapterMap[row.chapter_id].topics.push(row);
            chapterMap[row.chapter_id].totalCount++;
            if (row.is_completed) chapterMap[row.chapter_id].completedCount++;
          }
        });
        setChapters(Object.values(chapterMap));
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, navigate]);
  const handleChapterClick = (chapter) => {
    if (chapter.topics.length > 0) {
      navigate(`/a2/grammar/${chapter.topics[0].topic_id}`);
    }
  };
  const getProgress = (chapter) => ({
    current: chapter.completedCount,
    total: chapter.totalCount,
    isCompleted:
      chapter.completedCount === chapter.totalCount && chapter.totalCount > 0,
  });
  return (
    <ChapterSelectTemplate
      title="Grammar"
      chapters={chapters}
      loading={loading}
      onChapterClick={handleChapterClick}
      getProgress={getProgress}
      backPath="/"
      showTourIds={true}
    />
  );
}
