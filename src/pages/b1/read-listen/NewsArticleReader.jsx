import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, Loader2, Volume2 } from "lucide-react";
import { getB1ReadingContent, submitB1ReadingQuiz } from "../../../api/b1Api";
import useTextToSpeech from "../../pronounce/hooks/useTextToSpeech";
import toast, { Toaster } from "react-hot-toast";

export default function NewsArticleReader() {
  const { contentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech } =
    useTextToSpeech();

  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [selectedVocab, setSelectedVocab] = useState(null);

  // Checks if we are visiting in "Review Mode" (from success page or if already completed)
  const reviewMode =
    location.state?.reviewMode ||
    (content?.progress?.is_completed && !location.state?.reattemptMode) ||
    false;

  const reviewAnswers = location.state?.answers;
  const quizResults = location.state?.results || [];

  // 1. Fetch content when user_id or contentId changes
  useEffect(() => {
    if (!user?.user_id) return;

    const fetchContent = async () => {
      setLoading(true);
      try {
        const res = await getB1ReadingContent(contentId);
        const fetchedData = res.data;

        if (
          fetchedData?.progress?.is_completed &&
          !location.state?.reattemptMode &&
          !location.state?.reviewMode
        ) {
          const savedAnswers = fetchedData.progress.answers || {};
          const generatedResults = getSavedResultsArray(
            savedAnswers,
            fetchedData.questions || [],
          );

          navigate("/b1/read-listen/success", {
            state: {
              contentId: parseInt(contentId),
              score: parseFloat(fetchedData.progress.score || 0),
              correctCount: parseInt(fetchedData.progress.correct_count || 0),
              incorrectCount: parseInt(
                fetchedData.progress.incorrect_count || 0,
              ),
              skippedCount: parseInt(fetchedData.progress.skipped_count || 0),
              answers: savedAnswers,
              results: generatedResults,
              module: fetchedData.module,
              chapterId: fetchedData.chapter_id || "unassigned",
              totalQuestions: fetchedData.questions?.length || 0,
            },
            replace: true,
          });
          return;
        }

        setContent(fetchedData);
      } catch (err) {
        console.error("Error fetching content details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [user?.user_id, contentId]);

  // 2. Prepopulate answers when reviewMode is active
  useEffect(() => {
    if (content) {
      if (reviewMode) {
        const initialAnswers = reviewAnswers || content.progress?.answers || {};
        setAnswers(initialAnswers);
      } else {
        setAnswers({});
      }
    }
  }, [content, reviewMode, reviewAnswers]);

  const handleVocabClick = (word) => {
    const cleanWord = word.replace(/[.,!?;:]/g, "").toLowerCase();
    const vocab = content?.vocabulary?.find(
      (v) => v.word.toLowerCase() === cleanWord,
    );
    if (vocab) {
      setSelectedVocab(vocab);
    }
  };

  const renderVocabContent = () => {
    if (!content?.content) return null;
    const text = content.content;
    const vocabulary = content.vocabulary || [];
    const vocabWords = vocabulary.map((v) => v.word.toLowerCase());
    const words = text.split(/(\s+)/);

    return words.map((word, i) => {
      const cleanWord = word.replace(/[.,!?;:]/g, "").toLowerCase();
      const isVocab = vocabWords.includes(cleanWord);
      if (isVocab) {
        return (
          <span
            key={i}
            onClick={() => handleVocabClick(cleanWord)}
            className="bg-yellow-100/60 px-1 rounded cursor-pointer hover:bg-yellow-200/80 border-b-2 border-yellow-400/60 text-[#002856] font-semibold"
          >
            {word}
          </span>
        );
      }
      return <span key={i}>{word}</span>;
    });
  };

  const handleOptionClick = (qIdx, optIdx) => {
    if (reviewMode) return; // Cannot modify answers in review mode
    const q = content?.questions?.[qIdx];
    const qType = q?.type || "mcq_single";

    if (qType === "mcq_multi") {
      const currentSelection = Array.isArray(answers[qIdx])
        ? answers[qIdx]
        : [];
      const nextSelection = currentSelection.includes(optIdx)
        ? currentSelection.filter((i) => i !== optIdx)
        : [...currentSelection, optIdx];
      setAnswers((prev) => ({
        ...prev,
        [qIdx]: nextSelection,
      }));
    } else {
      setAnswers((prev) => ({
        ...prev,
        [qIdx]: optIdx,
      }));
    }
  };

  const handleListen = () => {
    if (isSpeaking) {
      cancelSpeech();
    } else if (content?.content) {
      const textToSpeak = content.content.replace(
        /##(?:\*[^*]+\*\s+)?([^#(]+)\([^)]+\)##/g,
        "$1",
      );
      speakText(textToSpeak, "de-DE");
    }
  };

  const getSavedResultsArray = (
    savedAnswers,
    questionsList = content?.questions || [],
  ) => {
    return questionsList.map((q, i) => {
      const userAns = savedAnswers[i];
      const type = q.type || "mcq_single";

      if (userAns === undefined || userAns === null) {
        return {
          questionIndex: i,
          status: "skipped",
          correctAnswer: q.correct,
        };
      }
      if (typeof userAns === "string" && !userAns.trim()) {
        return {
          questionIndex: i,
          status: "skipped",
          correctAnswer: q.correct,
        };
      }
      if (Array.isArray(userAns) && userAns.length === 0) {
        return {
          questionIndex: i,
          status: "skipped",
          correctAnswer: q.correct,
        };
      }

      let status = "incorrect";

      if (type === "mcq_single" || type === "true_false") {
        const selectedOptText = q.options?.[userAns];
        if (selectedOptText !== undefined) {
          const isCorrect =
            String(selectedOptText).trim().toLowerCase() ===
            String(q.correct).trim().toLowerCase();
          status = isCorrect ? "correct" : "incorrect";
        }
      } else if (type === "mcq_multi") {
        const selectedIndices = Array.isArray(userAns) ? userAns : [userAns];
        const userArr = selectedIndices
          .map((idx) =>
            String(q.options?.[idx] || "")
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean);

        let correctArr = [];
        if (Array.isArray(q.correct)) {
          correctArr = q.correct.map((v) => String(v).trim().toLowerCase());
        } else if (typeof q.correct === "string") {
          correctArr = q.correct
            .split(",")
            .map((v) => v.trim().toLowerCase())
            .filter(Boolean);
        }

        if (userArr.length === 0) {
          status = "skipped";
        } else {
          const match =
            userArr.length === correctArr.length &&
            userArr.every((v) => correctArr.includes(v));
          status = match ? "correct" : "incorrect";
        }
      } else if (type === "fill_blanks") {
        const userStr = String(userAns).trim().toLowerCase();
        if (Array.isArray(q.correct)) {
          const isCorrect = q.correct.some(
            (opt) => String(opt).trim().toLowerCase() === userStr,
          );
          status = isCorrect ? "correct" : "incorrect";
        } else {
          const isCorrect = String(q.correct).trim().toLowerCase() === userStr;
          status = isCorrect ? "correct" : "incorrect";
        }
      }

      return {
        questionIndex: i,
        status,
        correctAnswer: q.correct,
      };
    });
  };

  const handleViewSavedResult = () => {
    if (!content || !content.progress) return;

    const savedAnswers = content.progress.answers || {};
    const generatedResults = getSavedResultsArray(savedAnswers);

    navigate("/b1/read-listen/success", {
      state: {
        contentId: parseInt(contentId),
        score: parseFloat(content.progress.score),
        correctCount: parseInt(content.progress.correct_count),
        incorrectCount: parseInt(content.progress.incorrect_count),
        skippedCount: parseInt(content.progress.skipped_count),
        answers: savedAnswers,
        results: generatedResults,
        module: content.module,
        chapterId: content.chapter_id || "unassigned",
        totalQuestions: content.questions?.length || 0,
      },
    });
  };

  const handleSubmit = async () => {
    if (reviewMode) {
      navigate(`/b1/read-listen/list/${content?.module}/${content?.chapter_id || "unassigned"}`);
      return;
    }

    try {
      const payload = {
        contentId: parseInt(contentId),
        answers,
      };

      const res = await submitB1ReadingQuiz(payload);
      if (res.data) {
        const qCount = content?.questions?.length || 0;
        if (qCount > 0) {
          import("../../../api/streakApi")
            .then(({ logStreakPoints }) => {
              logStreakPoints({ points: qCount }).catch(() => {});
            })
            .catch(() => {});
        }

        navigate("/b1/read-listen/success", {
          state: {
            contentId: parseInt(contentId),
            score: res.data.score,
            correctCount: res.data.correctCount,
            incorrectCount: res.data.incorrectCount,
            skippedCount: res.data.skippedCount,
            answers,
            results: res.data.results,
            module: content?.module,
            chapterId: content?.chapter_id || "unassigned",
            totalQuestions: qCount,
          },
        });
      }
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      toast.error("Failed to submit quiz results. Please try again.");
    }
  };

  const getDifficultyBadgeStyle = (diff) => {
    const d = String(diff).toLowerCase();
    if (d === "easy") {
      return "bg-green-700/10 border-green-700/20 text-green-700";
    }
    if (d === "medium" || d === "intermediate") {
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

  if (!content) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white p-6 flex flex-col shadow-sm">
        <p className="text-center text-slate-400 py-12">Content not found.</p>
      </div>
    );
  }

  const questions = content.questions || [];
  const alphabet = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative">
      <Toaster position="top-center" />

      {/* Back & Module Title navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate(`/b1/read-listen/list/${content.module}/${content.chapter_id || "unassigned"}`)}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6 capitalize">
            {content.module === "news" ? "News" : "Articles"}
          </span>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 w-full overflow-y-auto">
        {/* Cover image & Headline section */}
        <div className="self-stretch px-4 pt-4 flex flex-col justify-start items-start gap-4">
          {content.hero_image_url && (
            <img
              className="self-stretch h-52 rounded-lg object-cover w-full"
              src={content.hero_image_url}
              alt={content.title}
            />
          )}

          <div className="self-stretch inline-flex justify-start items-start gap-4">
            <h1 className="justify-start text-sky-950 text-base font-semibold leading-5 text-left">
              {content.title}
            </h1>
          </div>

          <div className="self-stretch inline-flex justify-between items-center">
            <div className="flex justify-start items-start gap-1.5">
              <div className="px-2 py-0.5 bg-black/5 rounded-[40px] flex justify-center items-center gap-1.5">
                <span className="text-center text-neutral-500 text-xs font-medium leading-5">
                  {content.level_tag || "B1-B2"}
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-[40px] border flex justify-center items-center gap-1.5 ${getDifficultyBadgeStyle(
                  content.difficulty_tag,
                )}`}
              >
                <span className="text-center text-xs font-medium leading-5 capitalize">
                  {content.difficulty_tag || "Easy"}
                </span>
              </div>
            </div>

            <button
              onClick={handleListen}
              disabled={isLoadingAudio}
              className="h-7 px-2.5 bg-black/5 hover:bg-blue-950/20 active:scale-95 rounded-lg inline-flex justify-center items-center gap-1.5 cursor-pointer border-0 outline-none transition-all"
            >
              {isLoadingAudio ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-950" />
              ) : (
                <Volume2
                  className={`w-3.5 h-3.5 text-blue-950 ${
                    isSpeaking ? "animate-pulse" : ""
                  }`}
                />
              )}
              <span className="text-blue-950 text-xs font-medium">
                {isLoadingAudio ? "Loading..." : isSpeaking ? "Stop" : "Listen"}
              </span>
            </button>
          </div>
        </div>

        {/* Text Body */}
        <div className="w-full pt-6 pb-10 bg-white flex flex-col justify-start items-center gap-6 px-5">
          <div className="w-full justify-start text-black text-xs font-normal leading-6 text-left break-words">
            {renderVocabContent()}
          </div>
        </div>

        {/* Questions Header */}
        <div className="self-stretch w-full px-4 py-4 bg-black/5 inline-flex justify-center items-center gap-3.5">
          <div className="w-9 h-9 relative bg-blue-950 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
            <span className="text-white text-base font-bold">?</span>
          </div>
          <h2 className="flex-1 justify-start text-sky-950 text-base font-semibold leading-5 text-left">
            Questions
          </h2>
        </div>

        {/* Questions Cards List */}
        <div className="self-stretch px-4 pt-4 pb-24 bg-black/5 flex flex-col justify-start items-center gap-6">
          {questions.map((q, qIdx) => {
            const userSelectedIdx = answers[qIdx];
            const result = quizResults.find((r) => r.questionIndex === qIdx);
            const isQuestionSkipped = result?.status === "skipped";
            const qType = q.type || "mcq_single";

            if (qType === "fill_blanks") {
              const value = String(answers[qIdx] || "").trim();
              const isCorrect = result?.status === "correct";
              let inputClass =
                "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white border-zinc-300 text-xs text-slate-800";
              if (reviewMode) {
                if (isCorrect) {
                  inputClass =
                    "w-full px-3 py-2 border rounded-lg bg-emerald-50/20 border-green-700 text-green-700 font-semibold";
                } else {
                  inputClass =
                    "w-full px-3 py-2 border rounded-lg bg-red-50/20 border-red-600 text-red-500 font-semibold";
                }
              }

              return (
                <div
                  key={qIdx}
                  className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-start gap-4"
                >
                  <div className="self-stretch justify-start text-sky-950 text-sm font-semibold leading-5 text-left">
                    {qIdx + 1}. {q.question}
                  </div>
                  <div className="self-stretch w-full">
                    <input
                      type="text"
                      value={answers[qIdx] || ""}
                      disabled={reviewMode}
                      onChange={(e) => {
                        if (reviewMode) return;
                        setAnswers((prev) => ({
                          ...prev,
                          [qIdx]: e.target.value,
                        }));
                      }}
                      placeholder="Schreibe die Antwort hier..."
                      className={inputClass}
                    />
                  </div>
                  {reviewMode && (
                    <div className="self-stretch border-t border-zinc-100 pt-2.5 mt-1">
                      {!isCorrect ? (
                        <div className="text-left">
                          <span className="text-red-500 text-xs font-semibold">
                            Incorrect / Skipped:
                          </span>
                          <p className="text-red-500 text-[11px] font-normal leading-normal mt-0.5">
                            Your answer: "{value || "(empty)"}".
                          </p>
                          <span className="text-green-700 text-xs font-semibold mt-1 block">
                            Correct Answer:
                          </span>
                          <p className="text-green-700 text-[11px] font-normal leading-normal mt-0.5">
                            {Array.isArray(q.correct)
                              ? q.correct.join(" or ")
                              : q.correct}
                          </p>
                        </div>
                      ) : (
                        <div className="text-left">
                          <span className="text-green-700 text-xs font-semibold">
                            Correct:
                          </span>
                          <p className="text-green-700 text-[11px] font-normal leading-normal mt-0.5">
                            {q.explanation ||
                              `The correct answer is "${Array.isArray(q.correct) ? q.correct.join(" or ") : q.correct}".`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={qIdx}
                className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-start gap-4"
              >
                <div className="self-stretch justify-start text-sky-950 text-sm font-semibold leading-5 text-left">
                  {qIdx + 1}. {q.question}
                </div>

                <div className="self-stretch flex flex-col justify-start items-start gap-2">
                  {q.options?.map((opt, optIdx) => {
                    let isSelected = false;
                    let isCorrectAnswer = false;

                    if (qType === "mcq_multi") {
                      isSelected =
                        Array.isArray(userSelectedIdx) &&
                        userSelectedIdx.includes(optIdx);
                      let correctArr = [];
                      if (Array.isArray(q.correct)) {
                        correctArr = q.correct.map((v) =>
                          String(v).trim().toLowerCase(),
                        );
                      } else if (typeof q.correct === "string") {
                        correctArr = q.correct
                          .split(",")
                          .map((v) => v.trim().toLowerCase())
                          .filter(Boolean);
                      }
                      isCorrectAnswer = correctArr.includes(
                        String(opt).trim().toLowerCase(),
                      );
                    } else {
                      isSelected = userSelectedIdx === optIdx;
                      isCorrectAnswer =
                        String(opt).trim().toLowerCase() ===
                        String(q.correct).trim().toLowerCase();
                    }

                    let cardClass = "bg-white border-zinc-200";
                    let letterContainerClass = "bg-black/5 text-gray-900/30";
                    let letterTextClass = "text-gray-900/30";
                    let optionTextClass = "text-slate-900";
                    let showGreenDot = false;

                    if (reviewMode) {
                      if (isCorrectAnswer) {
                        cardClass = "bg-emerald-100/30 border-green-700";
                        letterContainerClass = "bg-green-700/10 text-green-700";
                        letterTextClass = "text-green-700";
                        optionTextClass = "text-green-700 font-semibold";
                        showGreenDot = true;
                      } else if (isSelected) {
                        cardClass = "bg-red-100/40 border-red-600";
                        letterContainerClass = "bg-red-500/10 text-red-500";
                        letterTextClass = "text-red-500";
                        optionTextClass = "text-red-500 font-semibold";
                      } else {
                        cardClass = "bg-white border-zinc-200 opacity-60";
                        letterContainerClass = "bg-black/5 text-gray-900/20";
                        letterTextClass = "text-gray-900/20";
                        optionTextClass = "text-slate-400";
                      }
                    } else if (isSelected) {
                      cardClass = "bg-blue-600/5 border-blue-600";
                      letterContainerClass = "bg-blue-600/10 text-blue-600";
                      letterTextClass = "text-blue-600";
                      optionTextClass = "text-blue-600 font-semibold";
                    }

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleOptionClick(qIdx, optIdx)}
                        className={`w-full p-2.5 rounded-lg border inline-flex justify-start items-center gap-3 transition-all ${
                          reviewMode
                            ? "cursor-default"
                            : "cursor-pointer hover:bg-slate-50/50"
                        } ${cardClass}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-sm overflow-hidden shrink-0 flex items-center justify-center ${letterContainerClass}`}
                        >
                          <span
                            className={`text-sm font-medium leading-6 ${letterTextClass}`}
                          >
                            {alphabet[optIdx]}
                          </span>
                        </div>
                        <div className="flex-1 flex justify-start items-center gap-2.5 min-w-0">
                          <span
                            className={`flex-1 justify-start text-xs font-medium leading-5 text-left break-words ${optionTextClass}`}
                          >
                            {opt}
                          </span>
                          {showGreenDot && (
                            <div className="w-2.5 h-2.5 bg-green-700 rounded-full shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation text box in Review Mode */}
                {reviewMode && (
                  <div className="self-stretch border-t border-zinc-100 pt-2.5 mt-1">
                    {q.explanation ? (
                      <div className="text-left">
                        <span className="text-green-700 text-xs font-semibold">
                          Correct:
                        </span>
                        <p className="text-green-700 text-[11px] font-normal leading-normal mt-0.5">
                          {q.explanation}
                        </p>
                      </div>
                    ) : (
                      <div className="text-left">
                        <span className="text-green-700 text-xs font-semibold">
                          Correct Option:
                        </span>
                        <p className="text-green-700 text-[11px] font-normal leading-normal mt-0.5">
                          The correct answer is Option{" "}
                          {qType === "mcq_multi"
                            ? (() => {
                                let correctArr = [];
                                if (Array.isArray(q.correct)) {
                                  correctArr = q.correct.map((v) =>
                                    String(v).trim().toLowerCase(),
                                  );
                                } else if (typeof q.correct === "string") {
                                  correctArr = q.correct
                                    .split(",")
                                    .map((v) => v.trim().toLowerCase())
                                    .filter(Boolean);
                                }
                                return q.options
                                  ?.map((o, oi) =>
                                    correctArr.includes(
                                      String(o).trim().toLowerCase(),
                                    )
                                      ? alphabet[oi]
                                      : null,
                                  )
                                  .filter(Boolean)
                                  .join(", ");
                              })()
                            : alphabet[
                                q.options?.findIndex(
                                  (o) =>
                                    String(o).trim().toLowerCase() ===
                                    String(q.correct).trim().toLowerCase(),
                                )
                              ]}
                          : "
                          {Array.isArray(q.correct)
                            ? q.correct.join(", ")
                            : q.correct}
                          "
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Button Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center gap-2.5 z-40 shrink-0 bg-[#F5F5F5]">
        <button
          onClick={reviewMode ? handleViewSavedResult : handleSubmit}
          className="w-full max-w-[380px] bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-semibold py-3 rounded-lg shadow-md transition-all cursor-pointer text-center text-sm"
        >
          {reviewMode ? "View Overall Result" : "Check Result"}
        </button>
      </div>

      {/* Vocabulary Modal Popup */}
      {selectedVocab && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedVocab(null)}
          />
          <div className="relative w-full max-w-[280px] bg-white rounded-3xl p-6 shadow-2xl text-center border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-extrabold text-blue-950 mb-1 capitalize">
              {selectedVocab.word}
            </h3>
            {selectedVocab.article && (
              <span className="inline-block px-2 py-0.5 bg-blue-50 text-[#002856] rounded-md text-[10px] font-bold mb-3">
                {selectedVocab.article}
              </span>
            )}
            <div className="h-px bg-slate-100 w-full my-3"></div>
            <p className="text-slate-600 font-bold text-sm leading-relaxed mb-6">
              Meaning:{" "}
              <span className="text-blue-950">{selectedVocab.meaning}</span>
            </p>
            <button
              onClick={() => setSelectedVocab(null)}
              className="w-full py-2.5 rounded-xl font-bold bg-[#002856] text-white text-xs shadow-md hover:bg-[#003c82] active:scale-95 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
