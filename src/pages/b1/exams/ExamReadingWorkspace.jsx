import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Clock,
  Volume2,
  ChevronDown,
} from "lucide-react";
import {
  getB1ExamSectionContent,
  submitB1ExamReadingAnswers,
  startB1ExamSubmission,
} from "../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";
import useTextToSpeech from "../../pronounce/hooks/useTextToSpeech";

export default function ExamReadingWorkspace() {
  const navigate = useNavigate();
  const { paperId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech } =
    useTextToSpeech();

  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { blockId_questionIdx: "selected_option" }
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Timer state (seconds remaining)
  const [timeLeft, setTimeLeft] = useState(30 * 60); // Default 30 mins
  const timerRef = useRef(null);
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const fetchContent = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      // Get/start session
      const startRes = await startB1ExamSubmission(paperId);
      setSubmission(startRes.data);

      const contentRes = await getB1ExamSectionContent(paperId, "reading");
      const list = Array.isArray(contentRes.data) ? contentRes.data : [];
      setQuestions(list);

      // Set section timer from first block if custom limit exists
      if (list.length > 0 && list[0].duration_minutes) {
        const timerKey = `b1_exam_timer_${user?.user_id || "guest"}_${paperId}_reading`;
        const storedExpire = localStorage.getItem(timerKey);
        if (storedExpire) {
          const expireTime = parseInt(storedExpire, 10);
          const remaining = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
          setTimeLeft(remaining);
        } else {
          const durationSeconds = list[0].duration_minutes * 60;
          const expireTime = Date.now() + durationSeconds * 1000;
          localStorage.setItem(timerKey, expireTime.toString());
          setTimeLeft(durationSeconds);
        }
      }
    } catch (err) {
      console.error("Error fetching Reading content:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !paperId) return;
    fetchContent();
  }, [user?.user_id, paperId]);

  // Start Section Timer
  useEffect(() => {
    if (loading || fetchError || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, fetchError, questions]);

  const handleAutoSubmit = async () => {
    console.warn("[Exam] Time is up — auto-submitting reading section.");
    await executeSubmission(answersRef.current);
  };

  const executeSubmission = async (currentAnswers) => {
    if (submitting || !submission) return;
    setSubmitting(true);
    try {
      await submitB1ExamReadingAnswers(submission.id, {
        answers: currentAnswers,
      });
      localStorage.removeItem(`b1_exam_timer_${user?.user_id || "guest"}_${paperId}_reading`);
      navigate(`/b1/exams/papers/${paperId}/reading/results`, {
        state: { submissionId: submission.id },
      });
    } catch (err) {
      console.error("Error submitting reading answers:", err);
      toast.error("Failed to submit answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptionSelect = (blockId, qIdx, option, qType = "mcq_single") => {
    const ansKey = `${blockId}_${qIdx}`;
    if (qType === "mcq_multi") {
      const currentSelection = Array.isArray(answers[ansKey])
        ? answers[ansKey]
        : [];
      const nextSelection = currentSelection.includes(option)
        ? currentSelection.filter((item) => item !== option)
        : [...currentSelection, option];
      setAnswers((prev) => ({
        ...prev,
        [ansKey]: nextSelection,
      }));
    } else {
      setAnswers((prev) => ({
        ...prev,
        [ansKey]: option,
      }));
    }
  };

  const handleNext = () => {
    if (currentBlockIndex < questions.length - 1) {
      setCurrentBlockIndex((prev) => prev + 1);
    } else {
      executeSubmission(answers);
    }
  };

  const handlePrev = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex((prev) => prev - 1);
    }
  };

  const handleListen = () => {
    if (isSpeaking) {
      cancelSpeech();
    } else if (currentBlock?.passage_text) {
      speakText(currentBlock.passage_text, "de-DE");
    }
  };

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, [currentBlockIndex]);

  const formatSeconds = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  if (fetchError || questions.length === 0) {
    return (
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen flex flex-col items-center justify-center gap-3 bg-white px-6">
        <AlertCircle className="w-6 h-6 text-red-500" />
        <p className="text-slate-500 text-xs font-semibold text-center">
          Failed to load Reading questions. Check back later.
        </p>
        <button
          onClick={() => navigate(`/b1/exams/papers/${paperId}/dashboard`)}
          className="px-4 py-2 bg-sky-950 text-white rounded-lg text-xs font-semibold border-0 outline-none cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentBlock = questions[currentBlockIndex];
  const blockQuestions = currentBlock.questions || [];
  const isLastBlock = currentBlockIndex === questions.length - 1;
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

  const getBlockType = () => {
    const qType = blockQuestions[0]?.type;
    if (qType) return qType;

    const title = String(currentBlock.block_title || "").toLowerCase();
    if (title.includes("leseverstehen") && title.includes("teil 1")) {
      return "matching_headers";
    }
    if (title.includes("leseverstehen") && title.includes("teil 3")) {
      return "matching_ads";
    }
    if (title.includes("sprachbausteine") && title.includes("teil 1")) {
      return "cloze_mcq";
    }
    if (title.includes("sprachbausteine") && title.includes("teil 2")) {
      return "cloze_box";
    }

    return "mcq_single";
  };

  const blockType = getBlockType();

  const renderContentArea = () => {
    if (blockType === "matching_headers" || blockType === "matching_ads") {
      return (
        <MatchingHeadersLayout
          block={currentBlock}
          answers={answers}
          onSelect={handleOptionSelect}
        />
      );
    }
    if (blockType === "cloze_mcq" || blockType === "cloze_box") {
      return (
        <ClozeTestLayout
          block={currentBlock}
          answers={answers}
          onSelect={handleOptionSelect}
        />
      );
    }

    return (
      <>
        {/* Text Body */}
        <div className="w-full pt-6 pb-10 bg-white flex flex-col justify-start items-center gap-6 px-5">
          <div className="w-full justify-start text-black text-xs font-normal leading-6 text-left break-words whitespace-pre-line">
            {currentBlock.passage_text}
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
        <div className="self-stretch px-4 pt-4 pb-36 bg-black/5 flex flex-col justify-start items-center gap-6">
          {blockQuestions.map((q, qIdx) => {
            const ansKey = `${currentBlock.id}_${qIdx}`;
            const selectedOpt = answers[ansKey];
            const qType = q.type || "mcq_single";

            if (qType === "fill_blanks") {
              return (
                <div
                  key={qIdx}
                  className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-start gap-4"
                >
                  <div className="self-stretch justify-start text-sky-950 text-sm font-semibold leading-5 text-left">
                    {qIdx + 1}. {q.question_text}
                  </div>
                  <div className="self-stretch w-full">
                    <input
                      type="text"
                      value={selectedOpt || ""}
                      onChange={(e) => {
                        setAnswers((prev) => ({
                          ...prev,
                          [ansKey]: e.target.value,
                        }));
                      }}
                      placeholder="Type your answer here..."
                      className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={qIdx}
                className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-start gap-4"
              >
                <div className="self-stretch justify-start text-sky-950 text-sm font-semibold leading-5 text-left">
                  {qIdx + 1}. {q.question_text}
                </div>

                <div className="self-stretch flex flex-col justify-start items-start gap-2">
                  {(q.options || []).map((option, optIdx) => {
                    const optionLetter = alphabet[optIdx];
                    const isSelected =
                      qType === "mcq_multi"
                        ? Array.isArray(selectedOpt) &&
                          selectedOpt.includes(optionLetter)
                        : selectedOpt === optionLetter;

                    let cardClass = "bg-white border-zinc-200";
                    let letterContainerClass = "bg-black/5 text-gray-900/30";
                    let letterTextClass = "text-gray-900/30";
                    let optionTextClass = "text-slate-900";

                    if (isSelected) {
                      cardClass = "bg-blue-600/5 border-blue-600";
                      letterContainerClass = "bg-blue-600/10 text-blue-600";
                      letterTextClass = "text-blue-600";
                      optionTextClass = "text-blue-600 font-semibold";
                    }

                    return (
                      <div
                        key={optIdx}
                        onClick={() =>
                          handleOptionSelect(
                            currentBlock.id,
                            qIdx,
                            optionLetter,
                            qType,
                          )
                        }
                        className={`w-full p-2.5 rounded-lg border inline-flex justify-start items-center gap-3 cursor-pointer hover:bg-slate-50/50 transition-all ${cardClass}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-sm overflow-hidden shrink-0 flex items-center justify-center ${letterContainerClass}`}
                        >
                          <span
                            className={`text-sm font-medium leading-6 ${letterTextClass}`}
                          >
                            {optionLetter}
                          </span>
                        </div>
                        <div className="flex-1 flex justify-start items-center gap-2.5 min-w-0">
                          <span
                            className={`flex-1 justify-start text-xs font-medium leading-5 text-left break-words ${optionTextClass}`}
                          >
                            {option}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden relative">
      <Toaster position="top-center" />

      {/* Navigation and Title Bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate(`/b1/exams/papers/${paperId}/dashboard`)}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            Reading
          </span>
        </div>
      </div>

      {/* Progress & Time Limit Indicators */}
      <div className="self-stretch px-4 pt-1 flex flex-col justify-start items-start gap-4 shrink-0 bg-white ">
        <div className="self-stretch inline-flex justify-between items-center">
          <span className="text-sky-950 text-base font-semibold leading-5">
            Question {(currentBlockIndex + 1).toString().padStart(2, "0")} of{" "}
            {questions.length.toString().padStart(2, "0")}
          </span>
          <div className="px-2 py-1 bg-black/5 rounded-[40px] border border-black/5 flex justify-center items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-sky-950" />
            <span className="text-center text-sky-950 text-xs font-medium leading-5">
              {formatSeconds(timeLeft)}
            </span>
          </div>
        </div>

        {/* Horizontal progress bar */}
        <div className="self-stretch flex justify-start items-center gap-1.5 pb-4">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2.5 rounded-[200px] transition-all ${
                idx <= currentBlockIndex ? "bg-amber-300" : "bg-zinc-100"
              }`}
            ></div>
          ))}
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 w-full overflow-y-auto">
        {/* Cover image & Headline section */}
        <div className="self-stretch px-4 pt-4 flex flex-col justify-start items-start gap-4">
          {currentBlock.hero_image_url && (
            <img
              className="self-stretch h-52 rounded-lg object-cover w-full"
              src={currentBlock.hero_image_url}
              alt={currentBlock.block_title || "Leseverstehen"}
            />
          )}

          <div className="self-stretch inline-flex justify-start items-start gap-4">
            <h1 className="justify-start text-sky-950 text-base font-semibold leading-5 text-left">
              {currentBlock.block_title || "Leseverstehen"}
            </h1>
          </div>

          <div className="self-stretch inline-flex justify-between items-center w-full">
            <div className="flex justify-start items-start gap-1.5">
              <div className="px-2 py-0.5 bg-black/5 rounded-[40px] flex justify-center items-center gap-1.5">
                <span className="text-center text-neutral-500 text-xs font-medium leading-5">
                  B1
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded-[40px] border flex justify-center items-center gap-1.5 ${getDifficultyBadgeStyle(
                  currentBlock.difficulty_tag || "Medium",
                )}`}
              >
                <span className="text-center text-xs font-medium leading-5 capitalize">
                  {currentBlock.difficulty_tag || "Medium"}
                </span>
              </div>
            </div>

            <button
              onClick={handleListen}
              disabled={isLoadingAudio}
              className="h-7 px-2.5 bg-black/5 hover:bg-blue-950/20 active:scale-95 rounded-lg inline-flex justify-center items-center gap-1.5 cursor-pointer border-0 outline-none transition-all"
            >
              <Volume2
                className={`w-3.5 h-3.5 text-blue-950 ${
                  isSpeaking ? "animate-pulse" : ""
                }`}
              />
              <span className="text-blue-950 text-xs font-medium">
                {isSpeaking ? "Stop" : "Listen"}
              </span>
            </button>
          </div>
        </div>

        {renderContentArea()}
      </div>

      {/* Floating Bottom Button Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent flex flex-col gap-2.5 z-40 shrink-0">
        <button
          onClick={handleNext}
          disabled={submitting}
          className="w-full bg-blue-950 hover:bg-blue-900 active:scale-95 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : isLastBlock ? (
            "Finish Reading Test"
          ) : (
            "Next Question"
          )}
        </button>

        {currentBlockIndex > 0 && (
          <button
            onClick={handlePrev}
            className="w-full py-3 bg-white hover:bg-slate-50 border border-zinc-300 active:scale-95 text-slate-700 text-sm font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center shadow-sm"
          >
            Previous Question
          </button>
        )}
      </div>
    </div>
  );
}

// Custom Reusable Dropdown Component for B1 Exams

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select option",
  disabledOptions = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Find label of currently selected option
  const selectedLabel = value
    ? options.find((_, idx) => alphabet[idx] === value)
    : null;
  const displayValue = selectedLabel
    ? `${value}) ${selectedLabel.replace(/^[a-z]\)\s*/i, "")}`
    : placeholder;

  return (
    <div className="relative w-full text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-white border border-zinc-300 hover:border-zinc-400 rounded-lg text-xs text-slate-800 outline-none cursor-pointer flex justify-between items-center transition-all focus:ring-2 focus:ring-blue-600/25"
      >
        <span className="truncate font-medium">{displayValue}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ml-1.5 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto py-1">
          <div
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="px-3 py-2 text-xs text-red-500 hover:bg-slate-50 font-semibold cursor-pointer border-b border-zinc-100"
          >
            -- Clear Selection --
          </div>
          {options.map((opt, idx) => {
            const letter = alphabet[idx];
            const isSelected = value === letter;
            const isUsedElsewhere =
              disabledOptions.includes(letter) && !isSelected;

            return (
              <div
                key={idx}
                onClick={() => {
                  onChange(letter);
                  setIsOpen(false);
                }}
                className={`px-3 py-2.5 text-xs flex items-start gap-2 cursor-pointer transition-all hover:bg-slate-50 ${
                  isSelected
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-700"
                } ${
                  isUsedElsewhere
                    ? "opacity-35 line-through hover:opacity-100"
                    : ""
                }`}
              >
                <span
                  className={`font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    isSelected
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {letter}
                </span>
                <span className="break-words flex-1 leading-4">
                  {opt.replace(/^[a-z]\)\s*/i, "")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Custom Layout Modular Components for B1 Exams Rework

function MatchingHeadersLayout({ block, answers, onSelect }) {
  const questions = block.questions || [];
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
  const headings = questions[0]?.options || [];
  const selectedLetters = questions
    .map((_, idx) => answers[`${block.id}_${idx}`])
    .filter(Boolean);

  const isAds =
    String(block.block_title || "")
      .toLowerCase()
      .includes("anzeige") ||
    String(block.block_title || "")
      .toLowerCase()
      .includes("ad") ||
    questions[0]?.type === "matching_ads";

  const referenceTitle = isAds
    ? "Anzeigen (Reference List)"
    : "Überschriften (Reference List)";

  return (
    <div className="w-full flex flex-col pt-4">
      {/* Instructions & Reference list */}
      <div className="px-4 flex flex-col gap-4 mb-6">
        {block.passage_text && (
          <div className="w-full text-slate-600 text-xs leading-5 text-left border-l-4 border-amber-400 pl-3 py-1.5 bg-amber-50/30 rounded-r-lg">
            {block.passage_text}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2.5">
          <h3 className="text-sky-950 text-[10px] font-bold uppercase tracking-wider text-left">
            {referenceTitle}
          </h3>
          <div className="grid grid-cols-1 gap-1.5 text-left">
            {headings.map((heading, idx) => {
              const letter = alphabet[idx];
              const isUsed = selectedLetters.includes(letter);
              return (
                <div
                  key={idx}
                  className={`text-xs flex items-start gap-2 p-1 rounded transition-all ${
                    isUsed ? "opacity-30 line-through" : "text-slate-800"
                  }`}
                >
                  <span className="font-bold text-[10px] text-blue-950 bg-blue-100/50 px-1.5 py-0.5 rounded shrink-0">
                    {letter}
                  </span>
                  <span>{heading}</span>
                </div>
              );
            })}
          </div>
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

      {/* Texts List with Dark Background */}
      <div className="w-full px-4 pt-4 pb-36 bg-black/5 flex flex-col gap-5">
        {questions.map((q, qIdx) => {
          const ansKey = `${block.id}_${qIdx}`;
          const selectedValue = answers[ansKey] || "";

          return (
            <div
              key={qIdx}
              className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col gap-3"
            >
              <span className="text-[10px] font-bold text-sky-950 bg-sky-100 self-start px-2 py-0.5 rounded">
                Item {qIdx + 1}
              </span>
              <p className="text-slate-700 text-xs leading-5 text-left whitespace-pre-wrap">
                {q.question_text}
              </p>

              <div className="flex flex-col gap-1.5">
                <CustomDropdown
                  options={headings}
                  value={selectedValue}
                  onChange={(val) => onSelect(block.id, qIdx, val)}
                  placeholder="-- Choose matching option --"
                  disabledOptions={selectedLetters}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClozeTestLayout({ block, answers, onSelect }) {
  const questions = block.questions || [];
  const passageText = block.passage_text || "";
  const [activeGapIdx, setActiveGapIdx] = useState(null);

  const parsePassage = () => {
    const parts = [];
    const regex = /\[\s*(\d+)\s*\]/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(passageText)) !== null) {
      const textPart = passageText.substring(lastIndex, match.index);
      const gapNumber = parseInt(match[1], 10);

      parts.push({ type: "text", content: textPart });
      parts.push({ type: "gap", number: gapNumber });

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < passageText.length) {
      parts.push({ type: "text", content: passageText.substring(lastIndex) });
    }

    return parts;
  };

  const parsedParts = parsePassage();

  const getQuestionIndexByGapNumber = (num) => {
    return questions.findIndex((q) => {
      const qText = String(q.question_text).toLowerCase();
      return qText.includes(String(num));
    });
  };

  const activeQIdx =
    activeGapIdx !== null ? getQuestionIndexByGapNumber(activeGapIdx) : null;
  const activeQuestion =
    activeQIdx !== -1 && activeQIdx !== null ? questions[activeQIdx] : null;

  return (
    <div className="w-full flex flex-col gap-6 px-4 pt-4 pb-36">
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm text-left leading-7 text-xs text-slate-800 whitespace-pre-line">
        {parsedParts.map((part, idx) => {
          if (part.type === "text") {
            return <span key={idx}>{part.content}</span>;
          }

          const qIdx = getQuestionIndexByGapNumber(part.number);
          const ansKey = `${block.id}_${qIdx}`;
          const selectedLetter = answers[ansKey];

          let displayWord = `[${part.number}]`;
          if (selectedLetter && qIdx !== -1) {
            const optIdx = selectedLetter.charCodeAt(0) - 65;
            const optText = questions[qIdx]?.options?.[optIdx];
            if (optText) {
              displayWord = optText.replace(/^[a-z]\)\s*/i, "");
            }
          }

          const isActive = activeGapIdx === part.number;

          return (
            <button
              onClick={() => setActiveGapIdx(part.number)}
              className={`mx-1 px-2 py-0.5 rounded font-bold border transition-all cursor-pointer inline-block ${
                isActive
                  ? "bg-amber-300 border-amber-400 text-sky-950 scale-105"
                  : selectedLetter
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-zinc-100 border-zinc-300 text-zinc-500"
              }`}
            >
              {displayWord}
            </button>
          );
        })}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[140px] flex flex-col justify-center">
        {activeQuestion ? (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-zinc-200/60 pb-1.5">
              <span className="text-sky-950 text-xs font-bold uppercase tracking-wider">
                Select word for Gap {activeGapIdx}
              </span>
              <button
                onClick={() => setActiveGapIdx(null)}
                className="text-[10px] font-bold text-slate-500 bg-transparent border-0 cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {(activeQuestion.options || []).map((opt, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const ansKey = `${block.id}_${activeQIdx}`;
                const isSelected = answers[ansKey] === letter;

                return (
                  <button
                    key={optIdx}
                    onClick={() => {
                      onSelect(block.id, activeQIdx, letter);
                      const currentGapIndex = parsedParts.findIndex(
                        (p) => p.type === "gap" && p.number === activeGapIdx,
                      );
                      const nextGapPart = parsedParts
                        .slice(currentGapIndex + 1)
                        .find((p) => p.type === "gap");
                      if (nextGapPart) {
                        setActiveGapIdx(nextGapPart.number);
                      } else {
                        setActiveGapIdx(null);
                      }
                    }}
                    className={`p-2.5 border rounded-lg text-xs font-medium cursor-pointer text-left transition-all ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white font-bold"
                        : "bg-white border-zinc-200 text-slate-800 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="font-bold mr-1.5">{letter})</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-6 text-xs font-semibold">
            Tap a gap button `[21]` inside the letter above to see options.
          </div>
        )}
      </div>
    </div>
  );
}
