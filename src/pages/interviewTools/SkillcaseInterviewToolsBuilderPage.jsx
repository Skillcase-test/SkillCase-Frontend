import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Camera,
  Eye,
  Mic,
  Plus,
  RotateCcw,
  Save,
  Upload,
  Video,
  X,
  LayoutTemplate,
  MessageSquare,
  Settings,
  CheckCircle2,
  GripVertical,
  Trash2,
} from "lucide-react";
import { skillcaseInterviewToolsApi } from "../../api/skillcaseInterviewToolsApi";
import { uploadFileToSignedUrl } from "./shared/uploadFileToSignedUrl";
import InterviewVideoPlayer from "./shared/InterviewVideoPlayer";
import useInterviewRecorder from "./shared/useInterviewRecorder";

const emptyQuestion = () => ({
  local_id: crypto.randomUUID(),
  title: "",
  short_description: "",
  video_file: null,
  video_key: "",
  preview_url: "",
});

const defaultForm = {
  title: "",
  details: "",
  short_description: "",
  slug: "",
  status: "draft",
  thinking_time_seconds: 3,
  answer_time_seconds: "",
  overall_time_limit_minutes: "",
  enable_global_timer: false,
  allowed_retakes: 0,
  intro_video_title: "",
  intro_video_description: "",
  intro_video_key: "",
  intro_preview_url: "",
  intro_video_file: null,
  farewell_video_title: "",
  farewell_video_description: "",
  farewell_video_key: "",
  farewell_preview_url: "",
  farewell_video_file: null,
  thank_you_message:
    "Thank you for taking the time to complete this practice interview. We will review your responses and share feedback soon.",
};

function createRecordedFile(label, blob) {
  const safeLabel = String(label || "interview")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const mimeType = blob?.type || "video/webm";
  const extension = mimeType.includes("mp4") ? "mp4" : "webm";

  return new File([blob], `${safeLabel || "interview"}.${extension}`, {
    type: mimeType,
  });
}

function VideoRecorderModal({ title, description, onClose, onSave }) {
  const [countdown, setCountdown] = useState(3);
  const [stage, setStage] = useState("permission");
  const [previewUrl, setPreviewUrl] = useState(null);
  const streamVideoRef = useRef(null);
  const {
    stream,
    recordedBlob,
    isRecording,
    recordingSeconds,
    requestStream,
    startRecording,
    stopRecording,
    stopTracks,
    resetRecording,
  } = useInterviewRecorder();

  useEffect(() => {
    if (streamVideoRef.current && stream) {
      streamVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    let interval = null;
    if (stage === "countdown" && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            startRecording()
              .then(() => setStage("recording"))
              .catch(() => setStage("permission"));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stage, countdown, startRecording]);

  useEffect(() => {
    return () => stopTracks();
  }, [stopTracks]);

  const enableDevices = async () => {
    try {
      await requestStream();
      setStage("ready");
    } catch (error) {
      console.error(error);
    }
  };

  const beginRecordingFlow = () => {
    resetRecording();
    setCountdown(3);
    setStage("countdown");
  };

  const stopAndReview = async () => {
    const blob = await stopRecording();
    const finalBlob = blob || recordedBlob;
    if (finalBlob) {
      const url = URL.createObjectURL(finalBlob);
      setPreviewUrl(url);
    }
    setStage("review");
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    resetRecording();
    setCountdown(3);
    setStage("countdown");
  };

  const saveRecording = () => {
    if (!recordedBlob) return;
    onSave(recordedBlob);
    stopTracks();
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/95 p-4 flex items-center justify-center font-sans">
      <div className="w-full max-w-4xl rounded-xl bg-white p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#083262]">
              Record Video
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {description ||
                "Turn on camera and mic, wait for the 3-second countdown, then record your prompt."}
            </p>
          </div>
          <button
            onClick={() => {
              stopTracks();
              onClose();
            }}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_280px]">
          <div className="overflow-hidden rounded-xl bg-slate-900 relative aspect-video">
            <video
              ref={streamVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            {stage === "countdown" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-8xl font-black text-white">
                  {countdown}
                </div>
              </div>
            )}
          </div>

          {/* Review: recorded video playback */}
          {stage === "review" && previewUrl && (
            <div className="overflow-hidden rounded-xl bg-slate-900 relative aspect-video">
              <video
                src={previewUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="flex flex-col space-y-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    <Camera className="w-3.5 h-3.5" /> Camera
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {stream ? "Ready" : "Not Enabled"}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    <Mic className="w-3.5 h-3.5" /> Microphone
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {stream ? "Ready" : "Not Enabled"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    Duration
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {recordingSeconds}s
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end space-y-3">
              {!stream && (
                <button
                  onClick={enableDevices}
                  className="w-full rounded-full bg-[#083262] py-4 text-sm font-bold text-white transition hover:bg-[#052243] flex justify-center items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Enable Devices
                </button>
              )}
              {stream && (stage === "ready" || stage === "permission") && (
                <button
                  onClick={beginRecordingFlow}
                  className="w-full rounded-full bg-[#083262] py-4 text-sm font-bold text-white transition hover:bg-[#052243] flex justify-center items-center gap-2"
                >
                  <Video className="w-4 h-4" /> Start Recording
                </button>
              )}
              {isRecording && (
                <button
                  onClick={stopAndReview}
                  className="w-full rounded-full bg-rose-500 py-4 text-sm font-bold text-white transition hover:bg-rose-600"
                >
                  Stop Recording
                </button>
              )}
              {stage === "review" && recordedBlob && (
                <>
                  <button
                    onClick={saveRecording}
                    className="w-full rounded-full bg-slate-900 py-4 text-sm font-bold text-white transition hover:bg-black"
                  >
                    Use This Recording
                  </button>
                  <button
                    onClick={handleRetake}
                    className="w-full rounded-full border border-slate-200 bg-white py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 flex justify-center items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Retake
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InlinePreview({ form, questions }) {
  const introExists = Boolean(form.intro_preview_url || form.intro_video_key);
  const farewellExists = Boolean(
    form.farewell_preview_url || form.farewell_video_key,
  );

  const [step, setStep] = useState(introExists ? "intro" : "question");
  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => {
    setStep(introExists ? "intro" : "question");
    setQuestionIndex(0);
  }, [introExists]);

  const activeQuestion = questions[questionIndex];

  const nextFromQuestion = () => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
    } else if (farewellExists) {
      setStep("farewell");
    } else {
      setStep("done");
    }
  };

  const resetPreview = () => {
    setStep(introExists ? "intro" : "question");
    setQuestionIndex(0);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-12 font-sans w-full">
      <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col relative">
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-800">
              <Eye className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold">Learner Preview Mode</span>
          </div>
          <button
            onClick={resetPreview}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            Restart Flow
          </button>
        </div>

        <div className="p-8 lg:p-12 flex-1 flex flex-col items-center justify-center">
          {step === "intro" && (
            <div className="w-full max-w-2xl text-center space-y-6">
              <h2 className="text-3xl font-extrabold text-slate-900">
                {form.intro_video_title || "Introduction"}
              </h2>
              {introExists ? (
                <div className="rounded-2xl shadow-sm bg-slate-100 shrink-0 w-full">
                  <InterviewVideoPlayer
                    src={form.intro_preview_url}
                    title="Intro"
                  />
                </div>
              ) : (
                <div className="py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium">
                  No Intro Video Configured
                </div>
              )}
              <button
                onClick={() => setStep("question")}
                className="mt-8 rounded-full bg-[#083262] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#052243]"
              >
                Continue to Questions
              </button>
            </div>
          )}

          {step === "question" && activeQuestion && (
            <div className="w-full flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-4">
                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                  Question {questionIndex + 1} of {questions.length}
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
                  {activeQuestion.title || "Untitled Question"}
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {activeQuestion.short_description}
                </p>

                {activeQuestion.preview_url ? (
                  <div className="rounded-2xl shadow-sm bg-slate-900 shrink-0 mt-6 w-full">
                    <InterviewVideoPlayer
                      src={activeQuestion.preview_url}
                      title="Question Video"
                    />
                  </div>
                ) : (
                  <div className="py-10 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-400 text-sm mt-6">
                    No Video Setup
                  </div>
                )}
              </div>

              <div className="w-full lg:w-72 bg-slate-50 rounded-2xl border border-slate-100 p-6 flex flex-col relative">
                <div className="flex-1 flex flex-col justify-center space-y-6">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                      Thinking Time
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {form.thinking_time_seconds || 3}s
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                      Recording Limit
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {form.answer_time_seconds || "∞"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                      Retakes Allowed
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {form.allowed_retakes}
                    </div>
                  </div>
                </div>

                <button
                  onClick={nextFromQuestion}
                  className="w-full mt-8 rounded-full bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-black"
                >
                  Next Step
                </button>
              </div>
            </div>
          )}

          {step === "farewell" && (
            <div className="w-full max-w-2xl text-center space-y-6">
              <h2 className="text-3xl font-extrabold text-slate-900">
                {form.farewell_video_title || "Farewell"}
              </h2>
              {farewellExists ? (
                <div className="rounded-2xl shadow-sm bg-slate-100 shrink-0 w-full">
                  <InterviewVideoPlayer
                    src={form.farewell_preview_url}
                    title="Farewell"
                  />
                </div>
              ) : (
                <div className="py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium">
                  No Farewell Configured
                </div>
              )}
              <button
                onClick={() => setStep("done")}
                className="mt-8 rounded-full bg-slate-900 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-black"
              >
                Complete
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="w-full max-w-xl text-center">
              <div className="inline-flex w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900">
                Completion Screen
              </h2>
              <p className="mt-4 text-slate-500">{form.thank_you_message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable Tab Button
function TabButton({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center space-x-2 px-1 py-4 text-sm font-bold transition-colors ${
        active ? "text-[#083262]" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {typeof badge !== "undefined" && (
        <span
          className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${active ? "bg-[#083262] text-white" : "bg-slate-100 text-slate-600"}`}
        >
          {badge}
        </span>
      )}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#083262] rounded-t-full" />
      )}
    </button>
  );
}

export default function SkillcaseInterviewToolsBuilderPage({
  selectedInterviewPositionId,
  setActivePage,
}) {
  const [activeTab, setActiveTab] = useState("basics");
  const [form, setForm] = useState(defaultForm);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  const [draftUploadId, setDraftUploadId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [recordingTarget, setRecordingTarget] = useState(null);
  const isEditMode = Boolean(selectedInterviewPositionId);

  // Fallback to select first question if active is invalid
  useEffect(() => {
    if (
      questions.length > 0 &&
      (!activeQuestionId ||
        !questions.find((q) => q.local_id === activeQuestionId))
    ) {
      setActiveQuestionId(questions[0].local_id);
    }
  }, [questions, activeQuestionId]);

  useEffect(() => {
    if (!selectedInterviewPositionId) {
      setForm(defaultForm);
      setQuestions([emptyQuestion()]);
      setDraftUploadId(crypto.randomUUID());
      return;
    }

    const loadPosition = async () => {
      try {
        const res = await skillcaseInterviewToolsApi.getPosition(
          selectedInterviewPositionId,
        );
        const data = res.data.data;

        setForm({
          title: data.title || "",
          details: data.details || data.role_title || "",
          short_description: data.short_description || "",
          slug: data.slug || "",
          status: data.status || "draft",
          thinking_time_seconds: data.thinking_time_seconds ?? 3,
          answer_time_seconds: data.answer_time_seconds ?? "",
          overall_time_limit_minutes: data.overall_time_limit_minutes ?? "",
          enable_global_timer: Boolean(data.overall_time_limit_minutes),
          allowed_retakes: data.allowed_retakes ?? 0,
          intro_video_title: data.intro_video_title || "",
          intro_video_description: data.intro_video_description || "",
          intro_video_key: data.intro_video_key || "",
          intro_preview_url: data.intro_video_url || "",
          intro_video_file: null,
          farewell_video_title: data.farewell_video_title || "",
          farewell_video_description: data.farewell_video_description || "",
          farewell_video_key: data.farewell_video_key || "",
          farewell_preview_url: data.farewell_video_url || "",
          farewell_video_file: null,
          thank_you_message: data.thank_you_message || "",
        });

        const qData = (data.questions || []).map((item) => ({
          local_id: crypto.randomUUID(),
          title: item.title || "",
          short_description: item.short_description || "",
          video_file: null,
          video_key: item.video_key || "",
          preview_url: item.video_url || "",
        }));

        setQuestions(qData);
        if (qData.length > 0) setActiveQuestionId(qData[0].local_id);
      } catch (error) {
        console.error(error);
        setStatusMessage("Could not load interview setup");
      }
    };

    loadPosition();
  }, [selectedInterviewPositionId]);

  const uploadSingleVideo = async ({ file, kind, questionId = null }) => {
    if (!file) return { key: "" };
    const uploadUrlRes = await skillcaseInterviewToolsApi.getUploadUrl({
      kind,
      positionId: selectedInterviewPositionId || draftUploadId,
      questionId,
      fileName: file.name,
      contentType: file.type,
    });
    const { uploadUrl, key } = uploadUrlRes.data.data;
    await uploadFileToSignedUrl({ file, uploadUrl, contentType: file.type });
    return { key };
  };

  const moveQuestion = (e, index, direction) => {
    e.stopPropagation();
    const next = [...questions];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setQuestions(next);
  };

  const addQuestion = () => {
    const nq = emptyQuestion();
    setQuestions((prev) => [...prev, nq]);
    setActiveQuestionId(nq.local_id);
  };

  const removeQuestionSafely = (e, localId) => {
    e.stopPropagation();
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((item) => item.local_id !== localId));
  };

  const updateQuestion = (localId, patch) => {
    setQuestions((prev) =>
      prev.map((item) =>
        item.local_id === localId ? { ...item, ...patch } : item,
      ),
    );
  };

  const openRecorder = (target) => {
    setRecordingTarget(target);
  };

  const handleRecordingSave = (blob) => {
    if (!recordingTarget) return;

    const recordedFile = createRecordedFile(recordingTarget.label, blob);
    const previewUrl = URL.createObjectURL(recordedFile);

    if (recordingTarget.type === "intro") {
      setForm((prev) => ({
        ...prev,
        intro_video_file: recordedFile,
        intro_preview_url: previewUrl,
      }));
    }
    if (recordingTarget.type === "farewell") {
      setForm((prev) => ({
        ...prev,
        farewell_video_file: recordedFile,
        farewell_preview_url: previewUrl,
      }));
    }
    if (recordingTarget.type === "question" && recordingTarget.localId) {
      updateQuestion(recordingTarget.localId, {
        video_file: recordedFile,
        preview_url: previewUrl,
      });
    }
    setRecordingTarget(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStatusMessage("");

    try {
      let introVideoKey = form.intro_video_key;
      let farewellVideoKey = form.farewell_video_key;

      if (form.intro_video_file) {
        const result = await uploadSingleVideo({
          file: form.intro_video_file,
          kind: "intro",
        });
        introVideoKey = result.key;
      }
      if (form.farewell_video_file) {
        const result = await uploadSingleVideo({
          file: form.farewell_video_file,
          kind: "farewell",
        });
        farewellVideoKey = result.key;
      }

      const finalQuestions = [];
      for (const item of questions) {
        let videoKey = item.video_key;
        if (item.video_file) {
          const result = await uploadSingleVideo({
            file: item.video_file,
            kind: "question",
            questionId: item.local_id,
          });
          videoKey = result.key;
        }
        finalQuestions.push({
          title: item.title,
          short_description: item.short_description,
          video_key: videoKey,
        });
      }

      const payload = {
        title: form.title,
        details: form.details,
        short_description: form.short_description,
        slug: form.slug,
        status: form.status,
        thinking_time_seconds: Number(form.thinking_time_seconds || 3),
        answer_time_seconds: form.answer_time_seconds
          ? Number(form.answer_time_seconds)
          : null,
        overall_time_limit_minutes: (form.enable_global_timer && form.overall_time_limit_minutes)
          ? Number(form.overall_time_limit_minutes)
          : null,
        allowed_retakes: Number(form.allowed_retakes || 0),
        intro_video_key: introVideoKey || null,
        intro_video_title: form.intro_video_title,
        intro_video_description: form.intro_video_description,
        farewell_video_key: farewellVideoKey || null,
        farewell_video_title: form.farewell_video_title,
        farewell_video_description: form.farewell_video_description,
        thank_you_message: form.thank_you_message,
        questions: finalQuestions,
      };

      if (isEditMode) {
        await skillcaseInterviewToolsApi.updatePosition(
          selectedInterviewPositionId,
          payload,
        );
      } else {
        await skillcaseInterviewToolsApi.createPosition(payload);
      }
      setActivePage("interview-tools-positions");
    } catch (error) {
      console.error(error);
      setStatusMessage(
        error?.response?.data?.message || "Could not save interview setup",
      );
    } finally {
      setLoading(false);
    }
  };

  // --- TAB RENDERS ---
  const renderBasicsTab = () => (
    <div className="flex-1 overflow-y-auto bg-slate-50 w-full font-sans pb-24">
      <div className="max-w-4xl mx-auto py-10 px-6 space-y-10">
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-900 mb-6">
            Interview Details
          </h3>
          <div className="grid gap-5">
            <div>
              <label className="block text[11px] font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                Details
              </label>
              <input
                value={form.details}
                onChange={(e) =>
                  setForm((pr) => ({ ...pr, details: e.target.value }))
                }
                placeholder="e.g. Learning practice for B1 speaking"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
              />
            </div>
            <div>
              <label className="block text[11px] font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                Short Description
              </label>
              <textarea
                value={form.short_description}
                onChange={(e) =>
                  setForm((pr) => ({
                    ...pr,
                    short_description: e.target.value,
                  }))
                }
                placeholder="Briefly explain what learners should expect in this interview..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-900 mb-6">
            Global Rules
          </h3>
          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <label className="block text[11px] font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                Thinking Time (s)
              </label>
              <input
                type="number"
                value={form.thinking_time_seconds}
                onChange={(e) =>
                  setForm((pr) => ({
                    ...pr,
                    thinking_time_seconds: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
              />
            </div>
            <div>
              <label className="block text[11px] font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                Max Answer Time (s)
              </label>
              <input
                type="number"
                placeholder="No limit"
                value={form.answer_time_seconds}
                onChange={(e) =>
                  setForm((pr) => ({
                    ...pr,
                    answer_time_seconds: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
              />
            </div>
            <div>
              <label className="block text[11px] font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                Allowed Retakes
              </label>
              <input
                type="number"
                value={form.allowed_retakes}
                onChange={(e) =>
                  setForm((pr) => ({ ...pr, allowed_retakes: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
              />
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.enable_global_timer}
                onChange={(e) =>
                  setForm((pr) => ({ ...pr, enable_global_timer: e.target.checked }))
                }
                className="w-5 h-5 rounded border-slate-300 text-[#083262] focus:ring-[#083262]"
              />
              <span className="text-sm font-bold text-slate-700">Enforce Global Interview Time Limit</span>
            </label>
            
            {form.enable_global_timer && (
              <div className="mt-4 max-w-xs">
                <label className="block text-[11px] font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                  Overall Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 20"
                  value={form.overall_time_limit_minutes}
                  onChange={(e) =>
                    setForm((pr) => ({ ...pr, overall_time_limit_minutes: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
                />
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Intro Video{" "}
                <span className="text-slate-400 font-normal text-sm ml-2">
                  (Optional)
                </span>
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Play a welcoming message before the first question.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <input
                value={form.intro_video_title}
                onChange={(e) =>
                  setForm((pr) => ({
                    ...pr,
                    intro_video_title: e.target.value,
                  }))
                }
                placeholder="Intro Title"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
              />
              <textarea
                value={form.intro_video_description}
                onChange={(e) =>
                  setForm((pr) => ({
                    ...pr,
                    intro_video_description: e.target.value,
                  }))
                }
                placeholder="Description (optional)"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
              />
              <div className="flex flex-col gap-3">
                <label className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 transition hover:bg-slate-50">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-bold text-slate-700">
                    Upload File
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setForm((pr) => ({
                        ...pr,
                        intro_video_file: file,
                        intro_preview_url: URL.createObjectURL(file),
                      }));
                    }}
                  />
                </label>
                <button
                  onClick={() =>
                    openRecorder({
                      type: "intro",
                      label: form.intro_video_title || "intro",
                    })
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 transition hover:bg-slate-50"
                >
                  <Camera className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-bold text-slate-700">
                    Record Now
                  </span>
                </button>
              </div>
            </div>
            <div className="bg-slate-100 rounded-2xl flex flex-col items-center justify-center border border-slate-200 shadow-sm w-full">
              {form.intro_preview_url ? (
                <InterviewVideoPlayer
                  src={form.intro_preview_url}
                  title="Intro"
                />
              ) : (
                <span className="text-slate-400 font-medium text-sm py-20">
                  No video configured
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Farewell & Thank You{" "}
                <span className="text-slate-400 font-normal text-sm ml-2">
                  (Optional)
                </span>
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Wrap up the interview nicely.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <input
                value={form.farewell_video_title}
                onChange={(e) =>
                  setForm((pr) => ({
                    ...pr,
                    farewell_video_title: e.target.value,
                  }))
                }
                placeholder="Farewell Title"
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
              />
              <textarea
                value={form.farewell_video_description}
                onChange={(e) =>
                  setForm((pr) => ({
                    ...pr,
                    farewell_video_description: e.target.value,
                  }))
                }
                placeholder="Description (optional)"
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
              />
              <textarea
                value={form.thank_you_message}
                onChange={(e) =>
                  setForm((pr) => ({
                    ...pr,
                    thank_you_message: e.target.value,
                  }))
                }
                placeholder="Completion screen message"
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition shadow-sm"
              />
              <div className="flex flex-col gap-3">
                <label className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 transition hover:bg-slate-50">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-bold text-slate-700">
                    Upload File
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setForm((pr) => ({
                        ...pr,
                        farewell_video_file: file,
                        farewell_preview_url: URL.createObjectURL(file),
                      }));
                    }}
                  />
                </label>
                <button
                  onClick={() =>
                    openRecorder({
                      type: "farewell",
                      label: form.farewell_video_title || "farewell",
                    })
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 transition hover:bg-slate-50"
                >
                  <Camera className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-bold text-slate-700">
                    Record Now
                  </span>
                </button>
              </div>
            </div>
            <div className="bg-slate-100 rounded-2xl flex flex-col items-center justify-center border border-slate-200 shadow-sm w-full">
              {form.farewell_preview_url ? (
                <InterviewVideoPlayer
                  src={form.farewell_preview_url}
                  title="Farewell"
                />
              ) : (
                <span className="text-slate-400 font-medium text-sm py-20">
                  No video configured
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const renderQuestionsTab = () => {
    const activeQ = questions.find((q) => q.local_id === activeQuestionId);

    return (
      <div className="flex-1 flex overflow-hidden w-full bg-white font-sans">
        {/* Active Sidebar Layout */}
        <div className="w-80 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0 h-full overflow-y-auto md:flex">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-slate-50 z-10">
            <span className="font-extrabold text-slate-900 text-sm tracking-wide uppercase">
              Questions Flow
            </span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 rounded-full">
              {questions.length}
            </span>
          </div>

          <div className="flex-1 p-3 space-y-2">
            {questions.map((q, idx) => {
              const isActive = q.local_id === activeQuestionId;
              return (
                <div
                  key={q.local_id}
                  onClick={() => setActiveQuestionId(q.local_id)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition select-none ${isActive ? "bg-white shadow-sm border border-[#083262] scale-[1.02]" : "hover:bg-slate-100 border border-transparent"}`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={(e) => moveQuestion(e, idx, "up")}
                        className="text-slate-300 hover:text-slate-600"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => moveQuestion(e, idx, "down")}
                        className="text-slate-300 hover:text-slate-600"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex-1 truncate">
                      <div
                        className={`text-xs font-bold mb-0.5 uppercase tracking-wide ${isActive ? "text-[#083262]" : "text-slate-500"}`}
                      >
                        Q. {idx + 1}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {q.title || "Untitled Question"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => removeQuestionSafely(e, q.local_id)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 sticky bottom-0 z-10">
            <button
              onClick={addQuestion}
              className="w-full flex justify-center items-center space-x-2 py-3 rounded-xl border border-dashed border-slate-300 text-slate-600 font-bold text-sm hover:bg-white hover:border-slate-400 transition"
            >
              <Plus className="w-4 h-4" /> <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* Right Editor Pane */}
        <div className="flex-1 bg-white overflow-y-auto p-8 lg:p-14">
          {activeQ ? (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="mb-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#083262] mb-2">
                  Edit Question Details
                </div>
                <input
                  value={activeQ.title}
                  onChange={(e) =>
                    updateQuestion(activeQ.local_id, { title: e.target.value })
                  }
                  placeholder="Enter Question Target (e.g. Behavioral / Technical)"
                  className="text-3xl lg:text-4xl font-extrabold text-slate-900 outline-none w-full placeholder-slate-300 bg-transparent focus:underline decoration-slate-200 underline-offset-8"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2 ml-1 uppercase tracking-wider">
                  Learner Context / Description
                </label>
                <textarea
                  value={activeQ.short_description}
                  onChange={(e) =>
                    updateQuestion(activeQ.local_id, {
                      short_description: e.target.value,
                    })
                  }
                  placeholder="Detailed prompt shown next to the video..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-medium text-slate-800 outline-none focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5 transition-all shadow-sm"
                />
              </div>

              <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
                <div className="bg-slate-100 rounded-[2rem] overflow-hidden aspect-video flex items-center justify-center border border-slate-200 relative group">
                  {activeQ.preview_url ? (
                    <InterviewVideoPlayer
                      src={activeQ.preview_url}
                      title="Preview"
                    />
                  ) : (
                    <span className="text-slate-400 font-medium text-sm">
                      No video uploaded
                    </span>
                  )}
                </div>

                <div className="flex flex-col justify-center space-y-4">
                  <h4 className="text-lg font-bold text-slate-900 leading-tight">
                    Video Prompt
                  </h4>
                  <p className="text-sm text-slate-500">
                    Record yourself asking the question, or upload an existing
                    file. This creates a human connection.
                  </p>
                  <div className="pt-2 flex flex-col gap-3">
                    <label className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3.5 transition hover:bg-slate-100">
                      <Upload className="w-4 h-4 text-slate-700" />
                      <span className="text-sm font-bold text-slate-700">
                        Upload Video
                      </span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          updateQuestion(activeQ.local_id, {
                            video_file: file,
                            preview_url: URL.createObjectURL(file),
                          });
                        }}
                      />
                    </label>
                    <button
                      onClick={() =>
                        openRecorder({
                          type: "question",
                          localId: activeQ.local_id,
                          label: activeQ.title || "question",
                        })
                      }
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 transition hover:bg-black text-white"
                    >
                      <Camera className="w-4 h-4" />
                      <span className="text-sm font-bold">Record Camera</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400 font-medium border-2 flex-col gap-4 border-dashed rounded-[3rem] p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300" />
              Add a question using the sidebar to begin editing configuration.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen h-screen bg-slate-50 flex flex-col font-sans text-slate-900 absolute inset-0 z-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm relative z-10">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setActivePage("interview-tools-positions")}
            className="text-slate-500 hover:bg-slate-100 p-2 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <input
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Interview Title (e.g. A2 Speaking Practice)"
            className="text-xl font-extrabold outline-none placeholder-slate-300 bg-transparent w-80 lg:w-96 focus:ring-0 px-2 py-1 truncate"
          />
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, status: e.target.value }))
            }
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#083262]"
          >
            <option value="draft">Draft - Hidden</option>
            <option value="published_open">Published Open</option>
            <option value="published_closed">Published Closed</option>
          </select>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#083262] hover:bg-[#052243] text-white px-8 py-2.5 rounded-md text-sm font-bold transition flex items-center space-x-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>
              {loading
                ? "Saving..."
                : isEditMode
                  ? "Update Config"
                  : "Create Interview"}
            </span>
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 px-6 shrink-0 flex justify-center z-10 relative">
        <div className="flex space-x-8">
          <TabButton
            active={activeTab === "basics"}
            onClick={() => setActiveTab("basics")}
            icon={Settings}
            label="Basics & Setup"
          />
          <TabButton
            active={activeTab === "questions"}
            onClick={() => setActiveTab("questions")}
            icon={MessageSquare}
            label="Questions Flow"
            badge={questions.length}
          />
          <TabButton
            active={activeTab === "preview"}
            onClick={() => setActiveTab("preview")}
            icon={Eye}
            label="Learner Preview"
          />
        </div>
      </div>

      {statusMessage && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full bg-rose-50 border border-rose-100 text-rose-700 px-5 py-3 rounded-2xl text-sm font-semibold flex items-center space-x-2 shadow-lg">
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col relative w-full h-full">
        {activeTab === "basics" && renderBasicsTab()}
        {activeTab === "questions" && renderQuestionsTab()}
        {activeTab === "preview" && (
          <InlinePreview form={form} questions={questions} />
        )}
      </div>

      {recordingTarget && (
        <VideoRecorderModal
          title={`Record ${recordingTarget.type === "question" ? "Question" : recordingTarget.type === "intro" ? "Intro" : "Farewell"}`}
          description="Prepare yourself. Recording starts after a clean 3-second countdown."
          onClose={() => setRecordingTarget(null)}
          onSave={handleRecordingSave}
        />
      )}
    </div>
  );
}
