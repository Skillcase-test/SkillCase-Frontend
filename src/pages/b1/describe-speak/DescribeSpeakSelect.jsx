import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, Loader2 } from "lucide-react";
import { getB1DescribeSpeakChapters, getB1DescribeSpeakChapterItems } from "../../../api/b1Api";

export default function DescribeSpeakSelect() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [chapterTitle, setChapterTitle] = useState("");

  const fetchChapters = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await getB1DescribeSpeakChapters();
      setTopics(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching Describe & Speak chapters:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterItems = async (chapterId) => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await getB1DescribeSpeakChapterItems(chapterId);
      setTopics(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching Describe & Speak chapter items:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id) return;
    if (selectedChapterId === null) {
      fetchChapters();
    } else {
      fetchChapterItems(selectedChapterId);
    }
  }, [user?.user_id, selectedChapterId]);

  const handleBackClick = () => {
    if (selectedChapterId !== null) {
      setSelectedChapterId(null);
      setChapterTitle("");
    } else {
      navigate("/");
    }
  };

  const handleCardClick = (item) => {
    if (selectedChapterId === null) {
      setSelectedChapterId(item.id);
      setChapterTitle(item.title);
    } else {
      navigate(`/b1/describe-speak/workspace/${item.id}`);
    }
  };

  const getDifficultyBadgeStyle = (difficulty) => {
    const diff = String(difficulty || "Easy").toLowerCase();
    if (diff === "easy") {
      return "bg-green-700/10 border-green-700/20 text-green-700";
    }
    if (diff === "medium" || diff === "intermediate") {
      return "bg-amber-100/60 border-orange-400/20 text-orange-500";
    }
    return "bg-red-100 border-red-500/20 text-red-500";
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-white shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative">
      {/* Back & Module Title navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={handleBackClick}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            {selectedChapterId !== null ? "Topics" : "Describe & Speak"}
          </span>
        </div>
      </div>

      {/* Collage Banner Area */}
      <div className="self-stretch h-42 relative shrink-0">
        <img
          src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090503/describe_speak_dtdpvf.webp"
          alt="Describe & Speak Banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 -bottom-1 bg-gradient-to-b from-white/0 to-white"></div>
      </div>

      {/* Title & Info */}
      <div className="self-stretch px-5 pt-4 flex flex-col justify-start items-start gap-4 shrink-0">
        <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
          <div className="inline-flex justify-center items-center gap-4">
            <h1 className="justify-start text-sky-950 text-base font-semibold leading-5">
              {selectedChapterId !== null ? chapterTitle : "Describe & Speak"}
            </h1>
          </div>
          <p className="self-stretch opacity-70 justify-start text-black text-xs font-normal leading-4">
            {selectedChapterId !== null
              ? "Practice speaking on specific prompts in this chapter."
              : "Practice describing German image prompts and improve your pronunciation accuracy."}
          </p>
        </div>
      </div>

      {/* Topics / Chapters list deck */}
      <div
        id="b1-describe-speak-chapter-list"
        className="flex-1 w-full pb-8 pt-4 bg-white flex flex-col justify-start items-center gap-3 overflow-y-auto px-4"
      >
        {fetchError ? (
          <div className="w-full text-center py-12 flex flex-col items-center gap-3">
            <p className="text-slate-500 text-xs font-semibold">
              Failed to load items. Please check your connection.
            </p>
            <button
              onClick={() => {
                if (selectedChapterId === null) {
                  fetchChapters();
                } else {
                  fetchChapterItems(selectedChapterId);
                }
              }}
              className="text-[#002856] text-xs font-semibold underline underline-offset-2 bg-transparent border-0 cursor-pointer"
            >
              Tap to retry
            </button>
          </div>
        ) : topics.length === 0 ? (
          <div className="w-full text-center py-12 text-slate-400 text-xs font-semibold">
            {selectedChapterId !== null ? "No topics in this chapter." : "No chapters uploaded yet. Check back soon."}
          </div>
        ) : (
          topics.map((topic, index) => {
            // Determine status and badges based on mode
            let status = null;
            let showCompletedBadge = false;

            if (selectedChapterId === null) {
              const isChapterDone = topic.total_count > 0 && topic.completed_count === topic.total_count;
              const hasStarted = topic.completed_count > 0;
              status = isChapterDone ? "done" : (hasStarted ? "continue" : null);
              showCompletedBadge = !!status;
            } else {
              status = topic.status; // 'done' or 'continue'
              showCompletedBadge = !!status;
            }

            return (
              <div
                key={topic.id}
                id={index === 0 ? "b1-describe-speak-first-chapter" : undefined}
                onClick={() => handleCardClick(topic)}
                className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex justify-start items-start gap-3 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
              >
                <div
                  className="w-14 h-14 bg-indigo-50 rounded-sm overflow-hidden shrink-0"
                  style={{ minWidth: "56px", minHeight: "56px" }}
                >
                  <img
                    src={topic.prompt_image_url || "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090503/describe_speak_dtdpvf.webp"}
                    alt={topic.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between h-14">
                  <div className="flex justify-between items-center w-full h-full">
                    <div className="flex flex-col items-start min-w-0 pr-1 gap-1">
                      <span className="text-slate-900 text-sm font-semibold leading-snug text-left truncate w-full">
                        {topic.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {selectedChapterId === null ? (
                          <span className="text-center text-neutral-500 text-[8px] font-medium leading-[8px] px-1.5 py-0.5 bg-black/5 rounded-[40px] border border-black/5">
                            Progress: {topic.completed_count || 0}/{topic.total_count || 0}
                          </span>
                        ) : (
                          <>
                            <span className="text-center text-neutral-500 text-[8px] font-medium leading-[8px] px-1.5 py-0.5 bg-black/5 rounded-[40px] border border-black/5">
                              {topic.level_tag || "B1-B2"}
                            </span>
                            <span
                              className={`text-center text-[8px] font-medium leading-[8px] px-1.5 py-0.5 rounded-[40px] border ${getDifficultyBadgeStyle(
                                topic.difficulty_tag,
                              )}`}
                            >
                              {topic.difficulty_tag || "Easy"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {showCompletedBadge && (
                        <div
                          className={`px-2 py-0.5 rounded-[40px] border flex justify-center items-center shrink-0 ${
                            status === "done"
                              ? "bg-green-700/10 border-green-700/20 text-green-700"
                              : "bg-amber-100/60 border-orange-400/20 text-orange-500"
                          }`}
                        >
                          <span className="text-center text-[10px] font-medium leading-5">
                            {status}
                          </span>
                        </div>
                      )}
                      <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
