import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Rabbit, Volume2, Square } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getNewsById } from "../../api/newsApi";
import useNewsTextToSpeech from "./hooks/useNewsTextToSpeech";

export default function NewsPage() {
  const { newsId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("de");
  const [article, setArticle] = useState(null);
  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech, activeSpeed } =
    useNewsTextToSpeech();

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await getNewsById(newsId, { lang: "de" });
        setArticle(res?.data?.data || null);
      } catch (error) {
        console.error("Failed to fetch news detail:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [newsId]);

  const current = useMemo(() => {
    if (!article) return null;
    return language === "de" ? article.german : article.english;
  }, [article, language]);

  const readText = `${current?.title || ""}. ${
    current?.content || current?.summary || ""
  }`;

  return (
    <div className="min-h-screen bg-[#f5f7fb] py-4">
      <div className="max-w-2xl mx-auto px-4">
        <button
          type="button"
          onClick={() => navigate("/news")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#002856] mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to News
        </button>

        {loading ? (
          <div className="py-20 text-center font-semibold text-[#002856]">
            Loading...
          </div>
        ) : !article ? (
          <div className="py-20 text-center text-gray-500">
            News article not found.
          </div>
        ) : (
          <article
            id="A1-news-detail"
            className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm"
          >
            {article.imageUrl ? (
              <img
                src={article.imageUrl}
                alt={current?.title || "News image"}
                className="w-full h-60 object-cover"
              />
            ) : null}

            <div className="p-5">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setLanguage("de")}
                  className={`px-3 py-1.5 text-xs rounded-full font-semibold transition-all duration-200 active:scale-95 hover:shadow-sm ${
                    language === "de"
                      ? "bg-[#002856] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  German
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`px-3 py-1.5 text-xs rounded-full font-semibold transition-all duration-200 active:scale-95 hover:shadow-sm ${
                    language === "en"
                      ? "bg-[#002856] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  English
                </button>
              </div>

              <div
                key={`${article.id}-${language}`}
                className="animate-news-lang-swap"
              >
                <h1 className="text-2xl font-bold text-[#181d27] leading-tight mb-3">
                  {current?.title}
                </h1>
                <p className="text-base leading-7 text-[#414651] whitespace-pre-wrap">
                  {current?.content || current?.summary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-5">
                <button
                  type="button"
                  id="A1-news-normal-btn"
                  disabled={isLoadingAudio}
                  onClick={() =>
                    isSpeaking && activeSpeed === "normal"
                      ? cancelSpeech()
                      : speakText(
                          readText,
                          language === "de" ? "de-DE" : "en-US",
                          {
                            structured: true,
                            title: current?.title || "",
                            newsText:
                              current?.content || current?.summary || "",
                            speed: "normal",
                          },
                        )
                  }
                  className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#002856] text-white text-sm font-medium disabled:opacity-60 transition-all duration-200 active:scale-95 shadow-md ${isSpeaking && activeSpeed === "normal" ? "bg-[#002856] text-white" : "bg-[#bbd4f0] text-[#002856]"}`}
                >
                  {isSpeaking && activeSpeed === "normal" ? (
                    <>
                      <Square className="w-4 h-4 fill-current" /> Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" /> Fast
                    </>
                  )}
                </button>
                <button
                  type="button"
                  id="A1-news-slow-btn"
                  disabled={isLoadingAudio}
                  onClick={() =>
                    isSpeaking && activeSpeed === "slow"
                      ? cancelSpeech()
                      : speakText(
                          readText,
                          language === "de" ? "de-DE" : "en-US",
                          {
                            structured: true,
                            title: current?.title || "",
                            newsText:
                              current?.content || current?.summary || "",
                            speed: "slow",
                          },
                        )
                  }
                  className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#edb843] text-[#002856] text-sm font-semibold disabled:opacity-60 transition-all duration-200 active:scale-95 shadow-md ${isSpeaking && activeSpeed === "slow" ? "bg-[#002856] text-white" : "bg-[#bbd4f0] text-[#002856]"}`}
                >
                  {isSpeaking && activeSpeed === "slow" ? (
                    <>
                      <Square className="w-4 h-4 fill-current" /> Stop
                    </>
                  ) : (
                    <>
                      <Rabbit className="w-4 h-4" /> Slow
                    </>
                  )}
                </button>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
