import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import ChapterSelectTemplate from "../../../components/a2/ChapterSelectTemplate";
import { getTestTopics } from "../../../api/a2Api";
export default function A2TestSelect() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const fetchTopics = async () => {
      try {
        const res = await getTestTopics();
        const chapterMap = {};

        res.data.forEach((row) => {
          if (!chapterMap[row.chapter_id]) {
            chapterMap[row.chapter_id] = {
              id: row.chapter_id,
              chapter_name: row.chapter_name,
              topics: [],
            };
          }
          if (row.topic_id) {
            chapterMap[row.chapter_id].topics.push(row);
          }
        });
        // Convert to chapter format with progress
        const chaptersWithProgress = Object.values(chapterMap).map((ch) => {
          const completedLevels = ch.topics.reduce(
            (acc, t) => acc + (t.current_level || 0),
            0,
          );
          const totalLevels = ch.topics.length * 5; // 5 levels per topic
          return {
            ...ch,
            completedCount: completedLevels,
            totalCount: totalLevels,
          };
        });

        setChapters(chaptersWithProgress);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, [user, navigate]);
  const handleChapterClick = (chapter) => {
    // Navigate to first topic in chapter
    const firstTopic = chapter.topics?.[0];
    if (firstTopic) {
      handleTopicClick(firstTopic);
    }
  };
  const handleTopicClick = (topic) => {
    navigate(`/a2/test/${topic.topic_id}`);
  };
  const getProgress = (chapter) => ({
    completed: chapter.completedCount || 0,
    total: chapter.totalCount || 0,
  });
  return (
    <>
      <ChapterSelectTemplate
        title="Test"
        subtitle="Practice with level-based tests"
        chapters={chapters}
        loading={loading}
        onChapterClick={handleChapterClick}
        getProgress={getProgress}
        backPath="/"
        showTourIds
      />
    </>
  );
}
