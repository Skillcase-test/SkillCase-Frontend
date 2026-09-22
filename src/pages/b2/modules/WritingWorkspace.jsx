import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, Loader2, AlertCircle, Camera } from "lucide-react";
import {
  getB2Exercise,
  submitB2ExerciseWriting,
  uploadB2ExerciseOcr,
} from "../../../api/b2Api";
import OcrModal from "../components/OcrModal";
import UmlautKeyboard from "../../../components/b2/UmlautKeyboard";
import toast, { Toaster } from "react-hot-toast";
import { useQuestionPositionTelemetry } from "../../../telemetry/learning";

export default function WritingWorkspace() {
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: "written text" }
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);

  const fetchContent = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await getB2Exercise(exerciseId);
      const exercise = res.data || {};
      // Guard against a cross-module deep link (e.g. /b2/writing/<reading-id>)
      if (exercise.module && exercise.module !== "writing") {
        setFetchError(true);
        return;
      }
      setSubmission({ id: exerciseId });

      const list = (exercise.content?.blocks || []).map((block, idx) => ({
        id: idx,
        difficulty_tag: exercise.difficulty_tag,
        ...block,
      }));
      setQuestions(list);

      // Initialize answers
      const initialAnswers = {};
      list.forEach((q) => {
        initialAnswers[q.id] = "";
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error("Error fetching Writing content:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !exerciseId) return;
    fetchContent();
  }, [user?.user_id, exerciseId]);

  const executeSubmission = async (currentAnswers) => {
    if (submitting || !submission) return;
    setSubmitting(true);
    try {
      await submitB2ExerciseWriting(exerciseId, {
        answers: currentAnswers,
      });
      navigate(`/b2/writing/${exerciseId}/results`);
    } catch (err) {
      console.error("Error submitting writing answers:", err);
      toast.error("Failed to evaluate writing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTextChange = (qId, text) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: text,
    }));
  };

  const handleInsertUmlaut = (char) => {
    const textareaId = `exam-writing-textarea-${currentBlock.id}`;
    const input = document.getElementById(textareaId);
    const current = currentText || "";
    if (!input) {
      handleTextChange(currentBlock.id, current + char);
      return;
    }
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? start;
    const newVal = current.slice(0, start) + char + current.slice(end);
    handleTextChange(currentBlock.id, newVal);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    });
  };

  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowOcrModal(false);

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
    ];
    const allowedExts = ["png", "jpg", "jpeg", "webp", "pdf"];
    const ext = file.name.split(".").pop().toLowerCase();

    if (file.type && !allowed.includes(file.type)) {
      toast.error("Only PNG, JPG, JPEG, WEBP, and PDF files are allowed.");
      return;
    }
    if (!file.type && !allowedExts.includes(ext)) {
      toast.error("Only PNG, JPG, JPEG, WEBP, and PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10 MB.");
      return;
    }

    setOcrLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("exerciseId", exerciseId);

    try {
      const res = await uploadB2ExerciseOcr(formData);
      const currentBlock = questions[currentBlockIndex];
      const prevText = answers[currentBlock.id] || "";
      const spacing = prevText ? " " : "";
      handleTextChange(
        currentBlock.id,
        prevText + spacing + (res.data.text || ""),
      );
    } catch (err) {
      console.error("OCR Error:", err);
      toast.error("Failed to parse handwriting from image. Please try again.");
    } finally {
      setOcrLoading(false);
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

  const getWordCount = (str) => {
    if (!str || typeof str !== "string") return 0;
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const padZero = (num) => {
    return String(num || 0).padStart(2, "0");
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

  const currentBlock = questions[currentBlockIndex];
  useQuestionPositionTelemetry({
    feature: "b2.writing",
    sectionType: "writing",
    level: "B2",
    exerciseId,
    submissionId: exerciseId,
    question: currentBlock,
    currentIndex: currentBlockIndex,
    totalQuestions: questions.length,
    loading,
  });

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
          Failed to load Writing tasks.
        </p>
        <button
          onClick={() => navigate(`/b2/writing`)}
          className="px-4 py-2 bg-sky-950 text-white rounded-lg text-xs font-semibold border-0 outline-none cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isLastBlock = currentBlockIndex === questions.length - 1;
  const currentText = answers[currentBlock.id] || "";
  const wordLimit = currentBlock.questions?.[0]?.word_limit || 80;

  return (
    <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden relative">
      {/* Navigation bar */}
      <div
        className="self-stretch px-4 pb-2.5 flex flex-col justify-start items-start gap-2.5 bg-white shrink-0 z-10"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate(`/b2/writing`)}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            Writing
          </span>
        </div>
      </div>

      {/* Progress & Time Limit Indicators */}
      <div className="self-stretch px-4 pt-1 flex flex-col justify-start items-start gap-2 shrink-0 bg-white z-10">
        <div className="self-stretch inline-flex justify-between items-center">
          <span className="text-sky-950 text-base font-semibold leading-5">
            Question {padZero(currentBlockIndex + 1)} of{" "}
            {padZero(questions.length)}
          </span>
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

      {/* Top Content Area (White background) */}
      <div className="self-stretch bg-white px-4 pb-10 flex flex-col gap-4 border-b border-zinc-100 shrink-0 z-10">
        {currentBlock.hero_image_url && (
          <img
            className="self-stretch max-h-72 rounded-lg object-contain w-full bg-zinc-50 border border-zinc-100"
            src={currentBlock.hero_image_url}
            alt="Writing prompt task"
          />
        )}

        <div className="flex justify-between items-center w-full">
          <h2 className="text-sky-950 text-base font-bold leading-5 text-left">
            {currentBlock.block_title ||
              (currentBlock.passage_text
                ? "Write your response in German"
                : "Write about this image in German")}
          </h2>
        </div>

        {currentBlock.passage_text && (
          <div className="w-full text-slate-700 text-xs leading-5 text-left bg-slate-50 border border-slate-200 rounded-xl p-4 whitespace-pre-line font-normal">
            {currentBlock.passage_text}
          </div>
        )}
      </div>

      {/* Bottom Content Area (Grey background) */}
      <div className="flex-1 w-full overflow-y-auto bg-[#f5f5f5] px-4 pt-5 pb-48 flex flex-col gap-4">
        {/* Text Area Card */}
        <div className="w-full h-60 p-2 bg-white rounded-xl border border-zinc-300 flex flex-col justify-between items-stretch gap-2 shadow-sm">
          <textarea
            id={`exam-writing-textarea-${currentBlock.id}`}
            value={currentText}
            onChange={(e) => handleTextChange(currentBlock.id, e.target.value)}
            placeholder="Schreibe hier..."
            className="flex-1 w-full text-xs font-normal leading-5 text-slate-800 placeholder-slate-400 bg-transparent border-0 focus:outline-none focus:ring-0 focus:border-transparent resize-none"
            style={{ outline: "none", boxShadow: "none" }}
          />
          <div
            className={`text-right text-xs font-medium select-none ${
              getWordCount(currentText) > wordLimit + 2
                ? "text-red-500 font-bold"
                : "text-blue-950/40"
            }`}
          >
            {getWordCount(currentText)}/{wordLimit} words
          </div>
        </div>
        <div className="w-full flex justify-center mb-2">
          <UmlautKeyboard onInsert={handleInsertUmlaut} />
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="absolute bottom-0 inset-x-0 bg-[#f5f5f5] p-4 flex flex-col gap-2.5 shrink-0 z-40 border-t border-zinc-200/20">
        <div className="w-full flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowOcrModal(true)}
            className="w-full py-3 rounded-lg border border-zinc-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-1.5 outline-none cursor-pointer active:scale-95 shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Upload writing image</span>
          </button>

          <button
            onClick={handleNext}
            disabled={submitting}
            className="w-full bg-blue-950 hover:bg-blue-900 active:scale-95 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : isLastBlock ? (
              "Finish Writing Test"
            ) : (
              "Next"
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

      {/* OCR Select Options Modal popup */}
      {showOcrModal && (
        <OcrModal
          onClose={() => setShowOcrModal(false)}
          onUpload={handleOcrUpload}
        />
      )}

      {/* Full screen loader — shown during OCR image parse OR writing AI submit */}
      {(ocrLoading || submitting) && (
        <div className="fixed inset-0 z-[2000] bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center gap-3 select-none">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
          <span className="text-white text-sm font-semibold">
            {ocrLoading
              ? "Analyzing image and extracting text..."
              : "Evaluating Writing..."}
          </span>
        </div>
      )}
      <Toaster position="top-center" />
    </div>
  );
}
