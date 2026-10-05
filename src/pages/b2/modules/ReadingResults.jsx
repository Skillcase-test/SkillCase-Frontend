import { B2Page, B2State } from "../../../components/b2/B2UI";
import B2ResultSummary from "../../../components/b2/B2ResultSummary";
import B2ReadingReviewHeader from "../../../components/b2/B2ReadingReviewHeader";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { getB2Exercise } from "../../../api/b2Api";
import useTextToSpeech from "../../../hooks/useTextToSpeech";

export default function ReadingResults() {
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [sectionData, setSectionData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewBlockIndex, setReviewBlockIndex] = useState(null);

  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech } =
    useTextToSpeech();

  const fetchResults = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      // The exercise row carries the same fields a section submission row
      // does (status/score/answers/feedback) — it IS the section result.
      const res = await getB2Exercise(exerciseId);
      const exercise = res.data || {};
      setSectionData(exercise);

      const blocks = (exercise.content?.blocks || []).map((block, idx) => ({
        id: idx,
        difficulty_tag: exercise.difficulty_tag,
        ...block,
      }));
      setQuestions(blocks);
    } catch (err) {
      console.error("Error fetching Reading results:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !exerciseId) return;
    fetchResults();
  }, [user?.user_id, exerciseId]);

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, [reviewBlockIndex, cancelSpeech]);

  const handleBackToDashboard = () => {
    navigate(`/b2/reading`);
  };

  const handleStartNextSection = () => {
    handleBackToDashboard();
  };

  const handleListen = (passageText) => {
    if (isSpeaking || isLoadingAudio) {
      cancelSpeech();
    } else if (passageText) {
      speakText(passageText, "de-DE");
    }
  };

  if (loading)
    return (
      <B2Page title="Reading" back="/b2/reading">
        <B2State loading />
      </B2Page>
    );

  if (fetchError || !sectionData)
    return (
      <B2Page title="Reading" back="/b2/reading">
        <B2State
          title="Reading feedback couldn’t load"
          description="Your connection may have dropped. Try again when you’re ready."
          onRetry={fetchResults}
        />
      </B2Page>
    );

  const answersMap = sectionData.answers || {};

  const isExamQuestionCorrect = (userAns, q) => {
    const type = q.type || "mcq_single";
    if (userAns === undefined || userAns === null) return false;
    if (typeof userAns === "string" && !userAns.trim()) return false;
    if (Array.isArray(userAns) && userAns.length === 0) return false;

    if (
      type === "mcq_single" ||
      type === "true_false" ||
      type === "matching_headers" ||
      type === "matching_ads" ||
      type === "cloze_mcq" ||
      type === "cloze_box"
    ) {
      return (
        String(userAns).trim().toLowerCase() ===
        String(q.correct_option).trim().toLowerCase()
      );
    }

    if (type === "mcq_multi") {
      const userArr = (Array.isArray(userAns) ? userAns : [userAns])
        .map((v) => String(v).trim().toLowerCase())
        .filter(Boolean);

      let correctArr = [];
      if (Array.isArray(q.correct_option)) {
        correctArr = q.correct_option.map((v) =>
          String(v).trim().toLowerCase(),
        );
      } else if (typeof q.correct_option === "string") {
        correctArr = q.correct_option
          .split(",")
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean);
      }
      if (userArr.length === 0) return false;
      return (
        userArr.length === correctArr.length &&
        userArr.every((v) => correctArr.includes(v))
      );
    }

    if (type === "fill_blanks") {
      const userStr = String(userAns).trim().toLowerCase();
      if (Array.isArray(q.correct_option)) {
        return q.correct_option.some(
          (opt) => String(opt).trim().toLowerCase() === userStr,
        );
      } else {
        return String(q.correct_option).trim().toLowerCase() === userStr;
      }
    }

    return false;
  };

  const flatQuestions = [];
  questions.forEach((block, blockIdx) => {
    const blockQuestions = block.questions || [];
    blockQuestions.forEach((q, idx) => {
      const ansKey = `${block.id}_${idx}`;
      const userSelection = answersMap[ansKey];
      const isCorrect = isExamQuestionCorrect(userSelection, q);

      flatQuestions.push({
        ...q,
        blockId: block.id,
        blockIndex: blockIdx,
        qIdx: idx,
        userSelection,
        isCorrect,
        passage_text: block.passage_text,
        hero_image_url: block.hero_image_url,
        block_title: block.block_title,
        difficulty_tag: block.difficulty_tag,
      });
    });
  });

  const padZero = (num) => {
    return String(num || 0).padStart(2, "0");
  };

  const currentBlock =
    reviewBlockIndex !== null ? questions[reviewBlockIndex] : null;
  const blockQuestions = currentBlock ? currentBlock.questions || [] : [];
  const alphabet = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];

  const questionStart = questions
    .slice(0, reviewBlockIndex ?? 0)
    .reduce((count, block) => count + (block.questions?.length || 0), 1);

  return (
    <div className={`b2-ui b2-review ${reviewMode && reviewBlockIndex !== null ? "b2-reading-review-detail" : ""} w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative`}>
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => {
              if (reviewMode) {
                if (reviewBlockIndex !== null) {
                  setReviewBlockIndex(null);
                } else {
                  setReviewMode(false);
                }
              } else {
                handleBackToDashboard();
              }
            }}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            {reviewBlockIndex !== null ? "Reading review" : "Reading Feedback"}
          </span>
        </div>
      </div>

      {!reviewMode ? (
        <B2ResultSummary
          skill="reading"
          assessment={false}
          data={sectionData}
          exerciseId={exerciseId}
          onReview={() => {
            setReviewMode(true);
            setReviewBlockIndex(null);
          }}
          onContinue={handleStartNextSection}
        />
      ) : reviewBlockIndex === null ? (
        <div className="flex-1 w-full overflow-y-auto px-4 py-3 flex flex-col gap-3 pb-24">
          <div className="flex flex-col items-start gap-1 pb-2">
            <h3 className="text-sky-950 text-base font-semibold">
              Reading Review
            </h3>
            <p className="text-slate-500 text-xs">
              Choose a task to review your answers.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {flatQuestions.map((q, idx) => {
              const skipped = !q.userSelection;
              const cardBg = q.isCorrect
                ? "bg-emerald-50 border-green-700/20 hover:border-green-700/40"
                : skipped
                  ? "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                  : "bg-rose-50 border-red-500/20 hover:border-red-500/40";

              const iconColor = q.isCorrect
                ? "text-green-700"
                : skipped
                  ? "text-zinc-400"
                  : "text-red-500";

              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setReviewBlockIndex(q.blockIndex)}
                  className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${cardBg}`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        q.isCorrect
                          ? "bg-green-700/10 text-green-700"
                          : skipped
                            ? "bg-zinc-100 text-zinc-400"
                            : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {padZero(q.qIdx + 1)}
                    </span>
                    <span className="text-slate-900 text-xs font-semibold leading-snug truncate">
                      {q.question_text}
                    </span>
                  </span>
                  <span className="shrink-0 ml-3">
                    {q.isCorrect ? (
                      <CheckCircle2 className={`w-5 h-5 ${iconColor}`} />
                    ) : skipped ? (
                      <HelpCircle className={`w-5 h-5 ${iconColor}`} />
                    ) : (
                      <XCircle className={`w-5 h-5 ${iconColor}`} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full flex flex-col justify-start items-center overflow-hidden">
          <div className="flex-1 w-full overflow-y-auto">
            <B2ReadingReviewHeader
              key={reviewBlockIndex}
              block={currentBlock}
              questionStart={questionStart}
              questionCount={blockQuestions.length}
              totalQuestions={flatQuestions.length}
              passageIndex={reviewBlockIndex}
              passageCount={questions.length}
              isSpeaking={isSpeaking}
              isLoadingAudio={isLoadingAudio}
              onListen={() => handleListen(currentBlock.passage_text)}
            />

            <div className="b2-reading-review-passage w-full bg-white">
              <div className="w-full justify-start text-black text-xs font-normal leading-6 text-left break-words whitespace-pre-line">
                {currentBlock.passage_text}
              </div>
            </div>

            <div className="self-stretch w-full px-4 py-4 bg-black/5 inline-flex justify-center items-center gap-3.5">
              <div className="w-9 h-9 relative bg-blue-950 rounded-sm overflow-hidden flex items-center justify-center shrink-0">
                <span className="text-white text-base font-bold">?</span>
              </div>
              <h2 className="flex-1 justify-start text-sky-950 text-base font-semibold leading-5 text-left">
                Questions
              </h2>
            </div>

            <div className="self-stretch px-4 pt-4 pb-48 bg-black/5 flex flex-col justify-start items-center gap-6">
              {blockQuestions.map((q, qIdx) => {
                const ansKey = `${currentBlock.id}_${qIdx}`;
                const userSelection = answersMap[ansKey];
                const isCorrect = isExamQuestionCorrect(userSelection, q);
                const qType = q.type || "mcq_single";

                return (
                  <div
                    key={qIdx}
                    className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-start gap-4 text-left"
                  >
                    <div className="self-stretch justify-start text-sky-950 text-sm font-semibold leading-5 text-left">
                      {qIdx + 1}. {q.question_text}
                    </div>

                    {qType === "fill_blanks" ? (
                      <div className="w-full">
                        <input
                          type="text"
                          disabled
                          value={userSelection || ""}
                          className={`w-full px-3.5 py-2.5 border rounded-lg text-xs font-semibold ${
                            isCorrect
                              ? "border-green-700 bg-emerald-50 text-green-700"
                              : "border-red-500 bg-red-50 text-red-500"
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="self-stretch flex flex-col justify-start items-start gap-2">
                        {(q.options || []).map((option, optIdx) => {
                          const letter = alphabet[optIdx];
                          let isCorrectOption = false;
                          let isUserSelection = false;

                          if (qType === "mcq_multi") {
                            let correctArr = [];
                            if (Array.isArray(q.correct_option)) {
                              correctArr = q.correct_option.map((v) =>
                                String(v).trim().toUpperCase(),
                              );
                            } else if (typeof q.correct_option === "string") {
                              correctArr = q.correct_option
                                .split(",")
                                .map((v) => v.trim().toUpperCase())
                                .filter(Boolean);
                            }
                            const userArr = (
                              Array.isArray(userSelection)
                                ? userSelection
                                : [userSelection]
                            )
                              .map((v) => String(v).trim().toUpperCase())
                              .filter(Boolean);

                            isCorrectOption = correctArr.includes(letter);
                            isUserSelection = userArr.includes(letter);
                          } else {
                            isCorrectOption = letter === q.correct_option;
                            isUserSelection = letter === userSelection;
                          }

                          let cardClass =
                            "bg-white border-zinc-200 text-slate-700";
                          let letterClass = "bg-black/5 text-gray-900/30";
                          let showCheck = false;
                          let showCross = false;

                          if (isCorrectOption) {
                            cardClass =
                              "bg-emerald-50 border-green-700 text-green-700 font-semibold";
                            letterClass = "bg-green-700/10 text-green-700";
                            if (isUserSelection) showCheck = true;
                          } else if (isUserSelection) {
                            cardClass =
                              "bg-red-50 border-red-500 text-red-500 font-semibold";
                            letterClass = "bg-red-500/10 text-red-500";
                            showCross = true;
                          } else {
                            cardClass =
                              "bg-white border-zinc-200 opacity-60 text-slate-400";
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`w-full p-2.5 rounded-lg border inline-flex justify-start items-center gap-3 ${cardClass}`}
                            >
                              <div
                                className={`w-8 h-8 rounded-sm overflow-hidden shrink-0 flex items-center justify-center ${letterClass}`}
                              >
                                <span className="text-sm font-medium leading-6">
                                  {letter}
                                </span>
                              </div>
                              <div className="flex-1 flex justify-between items-center min-w-0">
                                <span className="text-xs font-medium leading-5 break-words text-left">
                                  {option}
                                </span>
                                {showCheck && (
                                  <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0 ml-2 animate-in zoom-in-50 duration-150" />
                                )}
                                {showCross && (
                                  <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-2 animate-in zoom-in-50 duration-150" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {qType === "fill_blanks" ? (
                      userSelection ? (
                        isCorrect ? (
                          <div className="text-left mt-2">
                            <span className="text-green-700 text-xs font-semibold">
                              Correct:
                            </span>
                            <p className="text-green-700 text-[11px] leading-normal mt-0.5">
                              {q.explanation ||
                                `The correct answer is "${Array.isArray(q.correct_option) ? q.correct_option.join(" or ") : q.correct_option}".`}
                            </p>
                          </div>
                        ) : (
                          <div className="text-left mt-2">
                            <span className="text-red-500 text-xs font-semibold">
                              Incorrect:
                            </span>
                            <p className="text-red-500 text-[11px] leading-normal mt-0.5">
                              {q.explanation ||
                                `The correct answer is "${Array.isArray(q.correct_option) ? q.correct_option.join(" or ") : q.correct_option}".`}
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="text-left mt-2">
                          <span className="text-zinc-500 text-xs font-semibold">
                            Skipped:
                          </span>
                          <p className="text-zinc-500 text-[11px] leading-normal mt-0.5">
                            You skipped this question. The correct answer is "
                            {Array.isArray(q.correct_option)
                              ? q.correct_option.join(" or ")
                              : q.correct_option}
                            ".
                          </p>
                        </div>
                      )
                    ) : (
                      (() => {
                        const isSkipped =
                          qType === "mcq_multi"
                            ? !userSelection ||
                              (Array.isArray(userSelection) &&
                                userSelection.length === 0)
                            : !userSelection;

                        if (isSkipped) {
                          let correctStr = "";
                          if (Array.isArray(q.correct_option)) {
                            correctStr = q.correct_option.join(", ");
                          } else {
                            correctStr = String(q.correct_option);
                          }
                          return (
                            <div className="text-left">
                              <span className="text-zinc-500 text-xs font-semibold">
                                Skipped:
                              </span>
                              <p className="text-zinc-500 text-[11px] leading-normal mt-0.5">
                                You skipped this question. The correct option is{" "}
                                {correctStr}.
                              </p>
                            </div>
                          );
                        }

                        const displayCorrectOpt = Array.isArray(
                          q.correct_option,
                        )
                          ? q.correct_option.join(", ")
                          : q.correct_option;

                        if (isCorrect) {
                          return (
                            <div className="text-left">
                              <span className="text-green-700 text-xs font-semibold">
                                Correct:
                              </span>
                              <p className="text-green-700 text-[11px] leading-normal mt-0.5">
                                {q.explanation ||
                                  `The correct answer is Option ${displayCorrectOpt}.`}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="text-left">
                            <span className="text-red-500 text-xs font-semibold">
                              Incorrect:
                            </span>
                            <p className="text-red-500 text-[11px] leading-normal mt-0.5">
                              {q.explanation ||
                                `The correct answer is Option ${displayCorrectOpt}.`}
                            </p>
                          </div>
                        );
                      })()
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="b2-actionbar">
            <div className="w-full max-w-[380px] flex flex-col gap-2 mx-auto">
              {reviewBlockIndex < questions.length - 1 ? (
                <button
                  onClick={() => setReviewBlockIndex((prev) => prev + 1)}
                  className="w-full py-3 bg-[#002856] hover:bg-blue-900 active:scale-[0.99] text-white text-sm font-semibold rounded-lg transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
                >
                  Next passage
                </button>
              ) : null}
              {reviewBlockIndex > 0 && (
                <button
                  onClick={() => setReviewBlockIndex((prev) => prev - 1)}
                  className="w-full py-3 bg-[#002856] hover:bg-blue-900 active:scale-[0.99] text-white text-sm font-semibold rounded-lg transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
                >
                  Previous passage
                </button>
              )}
              <button
                onClick={handleStartNextSection}
                className="w-full py-3  border border-zinc-300 text-blue-950 hover:bg-slate-50 active:scale-[0.99] text-xs font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center"
              >
                Back to Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewMode && reviewBlockIndex === null && (
        <div className="absolute bottom-0 inset-x-0 bg-white  p-4 flex flex-col gap-2 shrink-0">
          <button
            onClick={handleStartNextSection}
            className="w-full py-3 bg-[#002856] hover:bg-blue-900 active:scale-[0.99] text-white text-base font-semibold rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
          >
            Back to Reading
          </button>
        </div>
      )}
    </div>
  );
}
