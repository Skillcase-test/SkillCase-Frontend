import { trackB2Action } from "../../../utils/b2Telemetry";
import useB2SubmitGuard from "../../../hooks/useB2SubmitGuard";
import { B2Page, B2State } from "../../../components/b2/B2UI";
import useB2Draft from "../../../hooks/useB2Draft";
import B2WorkspaceHeader from "../../../components/b2/B2WorkspaceHeader";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Loader2, Camera } from "lucide-react";
import {
  getB2ExamSectionContent,
  submitB2ExamWritingAnswers,
  uploadB2ExamOcr,
  startB2ExamSubmission,
} from "../../../api/b2Api";
import OcrModal from "../components/OcrModal";
import UmlautKeyboard from "../../../components/b2/UmlautKeyboard";
import toast, { Toaster } from "react-hot-toast";
import { useQuestionPositionTelemetry } from "../../../telemetry/learning";

export default function ExamWritingWorkspace() {
  const navigate = useNavigate();
  const { paperId } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: "written text" }
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitGuard = useB2SubmitGuard({
    questions,
    answers,
    index: currentBlockIndex,
    skill: "writing",
  });
  const draft = useB2Draft({
    draftKey: `b2-draft:v1:${user?.user_id || "guest"}:assessment:${paperId}:${submission?.id || 0}:writing`,
    answers,
    setAnswers,
    blockIndex: currentBlockIndex,
    setBlockIndex: setCurrentBlockIndex,
    loading,
    totalBlocks: questions.length,
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);

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
      const startRes = await startB2ExamSubmission(paperId);
      setSubmission(startRes.data);

      const contentRes = await getB2ExamSectionContent(paperId, "writing");
      const list = Array.isArray(contentRes.data) ? contentRes.data : [];
      setQuestions(list);

      if (list.length > 0 && list[0].duration_minutes) {
        const timerKey = `b2_exam_timer_${user?.user_id || "guest"}_${paperId}_writing`;
        const storedExpire = localStorage.getItem(timerKey);
        if (storedExpire) {
          const expireTime = parseInt(storedExpire, 10);
          const remaining = Math.max(
            0,
            Math.floor((expireTime - Date.now()) / 1000),
          );
          setTimeLeft(remaining);
        } else {
          const durationSeconds = list[0].duration_minutes * 60;
          const expireTime = Date.now() + durationSeconds * 1000;
          localStorage.setItem(timerKey, expireTime.toString());
          setTimeLeft(durationSeconds);
        }
      }

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
    if (!user?.user_id || !paperId) return;
    fetchContent();
  }, [user?.user_id, paperId]);

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
    console.warn("[Exam] Time is up — auto-submitting writing section.");
    await executeSubmission(answersRef.current);
  };

  const executeSubmission = async (currentAnswers) => {
    if (submitting || !submission) return;
    setSubmitting(true);
    try {
      await submitB2ExamWritingAnswers(submission.id, {
        answers: currentAnswers,
      });
      localStorage.removeItem(
        `b2_exam_timer_${user?.user_id || "guest"}_${paperId}_writing`,
      );
      trackB2Action("section_submitted", {
        skill: "writing",
        mode: "assessment",
        entityId: paperId,
      });
      draft.clear();
      navigate(`/b2/exams/papers/${paperId}/writing/results`, {
        state: { submissionId: submission.id },
      });
    } catch (err) {
      console.error("Error submitting writing answers:", err);
      toast.error(
        err.response?.data?.error ||
          "Failed to evaluate writing. Please try again.",
      );
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

    try {
      const res = await uploadB2ExamOcr(formData);
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

  const currentBlock = questions[currentBlockIndex];
  useQuestionPositionTelemetry({
    feature: "b2.exam.writing",
    sectionType: "writing",
    level: "B2",
    paperId,
    submissionId: submission?.submission_id || submission?.id,
    question: currentBlock,
    currentIndex: currentBlockIndex,
    totalQuestions: questions.length,
    loading,
  });

  if (loading)
    return (
      <B2Page title="Writing" back="/b2/test">
        <B2State loading />
      </B2Page>
    );

  if (fetchError || questions.length === 0)
    return (
      <B2Page title="Writing" back="/b2/test">
        <B2State
          title="Writing tasks couldn’t load"
          description="Your connection may have dropped. Try again when you’re ready."
          onRetry={fetchContent}
        />
      </B2Page>
    );

  const isLastBlock = currentBlockIndex === questions.length - 1;
  const currentText = answers[currentBlock.id] || "";
  const wordLimit = currentBlock.questions?.[0]?.word_limit || 80;

  return (
    <div className="b2-ui b2-workspace w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden relative">
      {submitGuard.confirmation}
      <B2WorkspaceHeader
        skill="writing"
        assessment={true}
        index={currentBlockIndex}
        total={questions.length}
        timeLeft={timeLeft}
        draftStatus={draft.status}
        onLeave={() => navigate("/b2/test")}
      />

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

      <div className="flex-1 w-full overflow-y-auto bg-[#f5f5f5] px-4 pt-5 pb-6 flex flex-col gap-4">
        <div className="w-full h-60 p-2 bg-white rounded-xl border border-zinc-300 flex flex-col justify-between items-stretch gap-2 shadow-sm">
          <textarea
            aria-label="Your written response in German"
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

      <div className="b2-actionbar">
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
            onClick={() => submitGuard.request(handleNext)}
            disabled={submitting}
            className="b2-submit w-full bg-blue-950 hover:bg-blue-900 active:scale-95 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-lg shadow-md transition-all outline-none border-0 cursor-pointer flex justify-center items-center"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : isLastBlock ? (
              "Submit section"
            ) : (
              "Next"
            )}
          </button>

          {currentBlockIndex > 0 && (
            <button
              onClick={handlePrev}
              className="w-full py-3 bg-white hover:bg-slate-50 border border-zinc-300 active:scale-95 text-slate-700 text-sm font-semibold rounded-lg transition-all outline-none cursor-pointer flex justify-center items-center shadow-sm"
            >
              Previous task
            </button>
          )}
        </div>
      </div>

      {showOcrModal && (
        <OcrModal
          onClose={() => setShowOcrModal(false)}
          onUpload={handleOcrUpload}
        />
      )}

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
