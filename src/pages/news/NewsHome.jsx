import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getNewsFeed } from "../../api/newsApi";
import useNewsTextToSpeech from "./hooks/useNewsTextToSpeech";
import NewsReel from "./components/NewsReel";

function NewsSkeleton() {
  return (
    <div className="h-full w-full max-w-sm mx-auto p-4 flex flex-col items-center justify-center">
      <div className="w-full h-full max-h-[800px] rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm overflow-hidden flex flex-col animate-pulse">
        <div className="h-[32%] bg-[#cbd5e1] w-full" />
        <div className="px-4 pt-5 pb-4 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="h-3 bg-[#cbd5e1] rounded-full w-20" />
            <div className="h-3 bg-[#cbd5e1] rounded-full w-16" />
          </div>
          <div className="space-y-3 mb-4">
            <div className="h-5 bg-[#94a3b8] rounded-full w-full" />
            <div className="h-5 bg-[#94a3b8] rounded-full w-5/6" />
          </div>
          <div className="space-y-2 mb-6 flex-1 pt-2">
            <div className="h-3 bg-[#cbd5e1] rounded-full w-full" />
            <div className="h-3 bg-[#cbd5e1] rounded-full w-full" />
            <div className="h-3 bg-[#cbd5e1] rounded-full w-11/12" />
            <div className="h-3 bg-[#cbd5e1] rounded-full w-full" />
            <div className="h-3 bg-[#cbd5e1] rounded-full w-4/5" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <div className="h-10 bg-[#94a3b8] rounded-xl" />
            <div className="h-10 bg-[#cbd5e1] rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewsHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);

  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech, activeSpeed } =
    useNewsTextToSpeech();

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const res = await getNewsFeed({ level: "ALL", lang: "de", limit: 10 });
        setArticles(res?.data?.data || []);
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const handleSpeak = (title, news, lang) =>
    speakText(news || title || "", lang === "de" ? "de-DE" : "en-US", {
      speed: "normal",
      title,
      newsText: news,
    });

  const handleSpeakSlow = (title, news, lang) =>
    speakText(news || title || "", lang === "de" ? "de-DE" : "en-US", {
      speed: "slow",
      title,
      newsText: news,
    });

  const hasData = useMemo(() => articles.length > 0, [articles]);

  return (
    <div 
      className="h-[calc(100dvh-55px-env(safe-area-inset-top))] lg:h-[calc(100dvh-72px-env(safe-area-inset-top))] bg-[#f6f8fc] overflow-hidden overscroll-none flex flex-col"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-full bg-white border-b border-gray-200 shrink-0 z-[1000] relative">
        <div className="px-4 py-2.5 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-sm font-semibold text-[#181d27]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-sm font-semibold text-[#7b7b7b]">News</span>
          </div>
        </div>
        {hasData && (
          <div className="absolute bottom-0 left-0 w-full h-[2px]">
            <div 
              className="h-full bg-[#002856] transition-all duration-300 ease-out" 
              style={{ width: `${((currentReelIndex + 1) / articles.length) * 100}%` }} 
            />
          </div>
        )}
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto px-3 md:px-4 py-2 md:py-3 min-h-0">
        <div className="h-full w-full">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center bg-[#f6f8fc]">
              <NewsSkeleton />
            </div>
          ) : !hasData ? (
            <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium text-center px-8">
              No news available right now. Please check again later.
            </div>
          ) : (
            <NewsReel
              articles={articles}
              onSpeak={handleSpeak}
              onSpeakSlow={handleSpeakSlow}
              onStop={cancelSpeech}
              isSpeaking={isSpeaking}
              isLoadingAudio={isLoadingAudio}
              activeSpeed={activeSpeed}
              onIndexChange={setCurrentReelIndex}
            />
          )}
        </div>
      </div>
    </div>
  );
}
