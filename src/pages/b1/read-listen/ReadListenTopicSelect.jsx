import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, Loader2 } from "lucide-react";
import { getB1ReadingChapterItems, getB1ReadingChapters } from "../../../api/b1Api";

export default function ReadListenTopicSelect() {
  const { module, chapterId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const isChapterList = !chapterId;

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchTopics = async () => {
      setLoading(true);
      try {
        const res = isChapterList
          ? await getB1ReadingChapters(module)
          : await getB1ReadingChapterItems(module, chapterId);
        setTopics(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching topics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [user?.user_id, module, chapterId, isChapterList]);

  const getDifficultyBadgeStyle = (diff) => {
    const d = String(diff).toLowerCase();
    if (d === "easy") {
      return "bg-green-700/10 border-green-700/20 text-green-700";
    }
    if (d === "medium" || d === "intermediate") {
      return "bg-amber-100/60 border-orange-400/20 text-orange-500";
    }
    if (d === "chapter") {
      return "bg-blue-50 border-blue-100 text-[#002856]";
    }
    return "bg-red-100 border-red-500/20 text-red-500";
  };

  const getModuleTitle = () => {
    if (isChapterList) {
      if (module === "news") return "Choose a news chapter";
      if (module === "video") return "Choose a video & audio chapter";
      return "Choose an article chapter";
    }
    if (module === "news") return "Choose a news topic";
    if (module === "video") return "Choose a video or audio";
    return "Choose an article topic";
  };

  const getEmptyText = () => {
    if (isChapterList) return "No chapters available yet. Check back later!";
    return "No topics available yet. Check back later!";
  };

  const getBackPath = () => {
    if (isChapterList) return "/b1/read-listen";
    return `/b1/read-listen/list/${module}`;
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex items-center justify-center bg-white shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm">
      {/* Back & Module Title navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate(getBackPath())}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6 capitalize">
            {module === "video" ? "Video & Audio" : module}
          </span>
        </div>
      </div>

      {/* Title & Info block */}
      <div className="self-stretch px-5 pt-4 flex flex-col justify-start items-start gap-4 shrink-0">
        <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
          <div className="inline-flex justify-center items-center gap-4">
            <h1 className="justify-start text-sky-950 text-base font-semibold leading-5">
              {getModuleTitle()}
            </h1>
          </div>
          <p className="self-stretch opacity-70 justify-start text-black text-xs font-normal leading-4">
            Best suited for B1 &amp; B2 German students
          </p>
        </div>
      </div>

      {/* Topics list container */}
      <div className="flex-1 w-full pb-6 pt-4 bg-white flex flex-col justify-start items-center gap-6 overflow-y-auto px-4">
        {topics.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm font-medium">
            {getEmptyText()}
          </p>
        ) : (
          topics.map((topic) => {
            const isVideo = module === "video";
            const id = isChapterList ? topic.id : isVideo ? topic.video_id : topic.id;
            const imageUrl = isVideo ? topic.thumbnail_url || topic.hero_image_url : topic.hero_image_url;
            const levelTag = isChapterList
              ? `${Number(topic.completed_count || 0)}/${Number(topic.total_count || 0)}`
              : isVideo ? topic.proficiency_level || "B1" : topic.level_tag || "B1-B2";
            const difficultyTag = isChapterList
              ? "Chapter"
              : isVideo ? (topic.difficulty || "Medium") : topic.difficulty_tag || "Easy";
            const isDone = isChapterList
              ? Number(topic.total_count || 0) > 0 && Number(topic.completed_count || 0) >= Number(topic.total_count || 0)
              : isVideo ? (topic.completed || topic.is_quiz_completed) : topic.is_completed;
            const title = isChapterList ? topic.chapter_name || topic.title : topic.title;
            
            let timeText = isChapterList
              ? `${Number(topic.total_count || 0)} item${Number(topic.total_count || 0) === 1 ? "" : "s"}`
              : topic.reading_time || "5 mins read";
            if (!isChapterList && isVideo) {
              const duration = parseFloat(topic.video_duration) || 0;
              const mins = Math.round(duration / 60) || 1;
              timeText = `${mins} min${mins > 1 ? "s" : ""} watch`;
            }

            return (
              <div
                key={id}
                onClick={() => {
                  if (isChapterList) {
                    navigate(`/b1/read-listen/list/${module}/${id}`);
                    return;
                  }
                  navigate(isVideo ? `/b1/read-listen/video/${id}` : `/b1/read-listen/content/${id}`);
                }}
                className="w-full max-w-[380px] p-3 bg-white rounded-xl border border-zinc-200 flex justify-start items-start gap-3 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
              >
                {imageUrl ? (
                  <img
                    className="w-14 h-14 rounded-sm object-cover shrink-0"
                    src={imageUrl}
                    alt={title}
                    style={{ minWidth: "56px", minHeight: "56px" }}
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-sm bg-blue-50 text-[#002856] font-bold text-xs flex items-center justify-center shrink-0 border border-slate-100"
                    style={{ minWidth: "56px", minHeight: "56px" }}
                  >
                    {levelTag}
                  </div>
                )}

                <div className="flex-1 min-w-0 flex flex-col justify-between h-14">
                  <h3 className="w-full text-slate-900 text-sm font-semibold truncate text-left">
                    {title}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-black/5 rounded-[40px] text-neutral-500 text-[8px] font-medium leading-[8px] shrink-0">
                      {levelTag}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-[40px] border text-[8px] font-medium leading-[8px] capitalize shrink-0 ${getDifficultyBadgeStyle(
                        difficultyTag,
                      )}`}
                    >
                      {difficultyTag}
                    </span>
                    <span className="opacity-70 text-black text-[8px] font-normal leading-[10.40px] whitespace-nowrap shrink-0">
                      {timeText}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 self-center">
                  {isDone ? (
                    <div className="px-2 bg-green-700/10 rounded-[40px] border border-green-700/20 flex justify-center items-center shrink-0">
                      <span className="text-green-700 text-[10px] font-medium leading-5">
                        done
                      </span>
                    </div>
                  ) : (
                    <div className="w-0 opacity-0 shrink-0" />
                  )}
                  <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180 shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
