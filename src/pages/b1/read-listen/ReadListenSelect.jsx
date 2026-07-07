import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft } from "lucide-react";
import { ImNewspaper } from "react-icons/im";
import { RiNewspaperFill } from "react-icons/ri";
import { FaHeadphonesSimple } from "react-icons/fa6";
import { getB1ReadingChapters } from "../../../api/b1Api";

export default function ReadListenSelect() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [counts, setCounts] = useState({
    news: { completed: 0, total: 0 },
    article: { completed: 0, total: 0 },
    video: { completed: 0, total: 0 },
  });

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchCounts = async () => {
      try {
        const [newsRes, articleRes, videoRes] = await Promise.all([
          getB1ReadingChapters("news"),
          getB1ReadingChapters("article"),
          getB1ReadingChapters("video"),
        ]);

        const getStats = (rows) => {
          const list = Array.isArray(rows) ? rows : [];
          const hasAggregateCounts = list.some((r) => r.total_count !== undefined || r.completed_count !== undefined);
          if (hasAggregateCounts) {
            return list.reduce(
              (acc, row) => ({
                completed: acc.completed + Number(row.completed_count || 0),
                total: acc.total + Number(row.total_count || 0),
              }),
              { completed: 0, total: 0 },
            );
          }
          const completed = list.filter((r) => r.is_completed || r.completed).length;
          return { completed, total: list.length };
        };

        setCounts({
          news: getStats(newsRes.data),
          article: getStats(articleRes.data),
          video: getStats(videoRes.data),
        });
      } catch (err) {
        console.error("Error fetching B1 counts:", err);
      }
    };

    fetchCounts();
  }, [user?.user_id]);

  const handleCardClick = (moduleName, enabled) => {
    if (!enabled) return;
    navigate(`/b1/read-listen/list/${moduleName}`);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm">
      {/* Back & Module Title navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate("/")}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            Reading & Listening
          </span>
        </div>
      </div>

      {/* Collage Banner Area */}
      <div className="self-stretch h-42 relative shrink-0">
        <img
          src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090498/read_listen_pwnige.webp"
          alt="German Newspapers collage"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 -bottom-1 bg-gradient-to-b from-white/0 to-white"></div>
      </div>

      {/* Welcome & Info */}
      <div className="self-stretch px-5 pt-4 flex flex-col justify-start items-start gap-4 shrink-0">
        <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
          <div className="inline-flex justify-center items-center gap-4">
            <h1 className="justify-start text-sky-950 text-base font-semibold leading-5">
              Reading & Listening
            </h1>
          </div>
          <p className="self-stretch opacity-70 justify-start text-black text-xs font-normal leading-4">
            Improve your German comprehension skills.
          </p>
        </div>
      </div>

      {/* Options Cards List Container */}
      <div className="flex-1 w-full pb-8 pt-4 bg-white flex flex-col justify-start items-center gap-3 overflow-y-auto px-4">
        {/* News Card */}
        <div
          id="b1-read-listen-news"
          onClick={() => handleCardClick("news", true)}
          className="w-full max-w-[380px] p-3 bg-white rounded-xl border border-zinc-200 flex justify-start items-start gap-3 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
        >
          <div
            className="w-14 h-14 bg-indigo-50 rounded-sm flex items-center justify-center shrink-0"
            style={{ minWidth: "56px", minHeight: "56px" }}
          >
            <ImNewspaper className="w-7 h-7 text-blue-950" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between h-14">
            <div className="flex justify-between items-center w-full h-full">
              <div className="flex flex-col items-start min-w-0 pr-1">
                <span className="text-slate-900 text-base font-semibold leading-6 text-left">
                  News
                </span>
                <span className="opacity-70 text-black text-[10px] font-normal leading-4 text-left truncate w-full">
                  Read short news articles in German
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {counts.news.total > 0 && (
                  <div className="px-2 bg-green-700/10 rounded-[40px] border border-green-700/20 flex justify-center items-center shrink-0">
                    <span className="text-center text-green-700 text-xs font-medium leading-5">
                      {counts.news.completed}/{counts.news.total}
                    </span>
                  </div>
                )}
                <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Articles Card */}
        <div
          id="b1-read-listen-articles"
          onClick={() => handleCardClick("article", true)}
          className="w-full max-w-[380px] p-3 bg-white rounded-xl border border-zinc-200 flex justify-start items-start gap-3 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
        >
          <div
            className="w-14 h-14 bg-indigo-50 rounded-sm flex items-center justify-center shrink-0"
            style={{ minWidth: "56px", minHeight: "56px" }}
          >
            <RiNewspaperFill className="w-7 h-7 text-blue-950" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between h-14">
            <div className="flex justify-between items-center w-full h-full">
              <div className="flex flex-col items-start min-w-0 pr-1">
                <span className="text-slate-900 text-base font-semibold leading-6 text-left">
                  Articles
                </span>
                <span className="opacity-70 text-black text-[10px] font-normal leading-4 text-left truncate w-full">
                  Read short articles in German
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {counts.article.total > 0 && (
                  <div className="px-2 bg-amber-100/60 rounded-[40px] border border-orange-400/20 flex justify-center items-center shrink-0">
                    <span className="text-center text-orange-500 text-xs font-medium leading-5">
                      {counts.article.completed}/{counts.article.total}
                    </span>
                  </div>
                )}
                <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Video & Audio Card */}
        <div
          id="b1-read-listen-video"
          onClick={() => handleCardClick("video", true)}
          className="w-full max-w-[380px] p-3 bg-white rounded-xl border border-zinc-200 flex justify-start items-start gap-3 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
        >
          <div
            className="w-14 h-14 bg-indigo-50 rounded-sm flex items-center justify-center shrink-0"
            style={{ minWidth: "56px", minHeight: "56px" }}
          >
            <FaHeadphonesSimple className="w-7 h-7 text-blue-950" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between h-14">
            <div className="flex justify-between items-center w-full h-full">
              <div className="flex flex-col items-start min-w-0 pr-1">
                <span className="text-slate-900 text-base font-semibold leading-6 text-left">
                  Video &amp; Audio
                </span>
                <span className="opacity-70 text-black text-[10px] font-normal leading-4 text-left truncate w-full">
                  Watch and listen in German
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {counts.video.total > 0 && (
                  <div className="px-2 bg-amber-100/60 rounded-[40px] border border-orange-400/20 flex justify-center items-center shrink-0">
                    <span className="text-center text-orange-500 text-xs font-medium leading-5">
                      {counts.video.completed}/{counts.video.total}
                    </span>
                  </div>
                )}
                <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
