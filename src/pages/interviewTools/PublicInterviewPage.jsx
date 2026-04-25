import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Camera,
  CheckCircle2,
  Mic,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Square,
  User,
} from "lucide-react";
import { interviewToolsApi } from "../../api/interviewToolsApi";
import InterviewVideoPlayer from "./shared/InterviewVideoPlayer";
import useInterviewRecorder from "./shared/useInterviewRecorder";
import { uploadFileToSignedUrl } from "./shared/uploadFileToSignedUrl";

function getStorageKey(slug) {
  return `interview-tool-session:${slug}`;
}

function formatSeconds(value) {
  if (!Number.isFinite(value) || value < 0) return "0s";
  return `${Math.floor(value)}s`;
}

function getMediaExtensionFromMime(mimeType = "") {
  const lower = String(mimeType).toLowerCase();
  if (lower.includes("mp4")) return "mp4";
  if (lower.includes("quicktime")) return "mov";
  if (lower.includes("ogg")) return "ogg";
  if (lower.includes("webm")) return "webm";
  return "webm";
}

function Surface({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function MetricCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "primary"
      ? "border-[#083262]/10 bg-[#083262]/[0.03]"
      : "border-slate-200 bg-slate-50";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

export default function PublicInterviewPage() {
  const { slug } = useParams();
  const [position, setPosition] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [form, setForm] = useState({
    candidate_name: "",
    candidate_email: "",
    candidate_phone: "",
  });
  const [stage, setStage] = useState("loading");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [thinkingRemaining, setThinkingRemaining] = useState(0);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);
  const [postInstructionsStage, setPostInstructionsStage] =
    useState("question");
  const [replayKey, setReplayKey] = useState(0);
  const [questionEnded, setQuestionEnded] = useState(false);
  const [retakesUsed, setRetakesUsed] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const streamVideoRef = useRef(null);

  const {
    stream,
    recordedBlob,
    isRecording,
    recordingSeconds,
    recordingHasAudioSignal,
    error: recorderError,
    requestStream,
    startRecording,
    stopRecording,
    stopTracks,
    resetRecording,
  } = useInterviewRecorder();

  const handleRequestStream = async () => {
    try {
      await requestStream();
      setStatusMessage("");
    } catch (error) {
      console.error(error);
      setStatusMessage(
        "Microphone is not capturing audio. Please allow camera and mic access, then try again.",
      );
    }
  };

  // Prevent user from closing tab during active recording or submission to avoid corrupted videos
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRecording || submittingAnswer) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRecording, submittingAnswer]);

  useEffect(() => {
    if (streamVideoRef.current && stream) {
      streamVideoRef.current.srcObject = stream;
    }
  }, [stream, stage]);

  useEffect(() => {
    if (!recorderError) return;
    setStatusMessage(recorderError);
  }, [recorderError]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const metaRes = await interviewToolsApi.getPublicPosition(slug);
        const meta = metaRes.data.data;
        setPosition(meta);

        if (meta.status === "published_closed") {
          setStage("closed");
          return;
        }

        const savedToken = localStorage.getItem(getStorageKey(slug));

        if (savedToken) {
          try {
            const restoreRes = await interviewToolsApi.restoreSubmission(
              slug,
              savedToken,
            );
            const restoredSub = restoreRes.data.data.submission;
            setPosition(restoreRes.data.data.position);
            setSubmission(restoredSub);
            setAnswers(restoreRes.data.data.answers || []);

            if (restoredSub.status === "completed") {
              setStage("done");
              return;
            }

            setActiveQuestionIndex(restoredSub.current_question_index || 0);
            setStage("question");
            return;
          } catch (error) {
            console.error("Restore failed", error);
            localStorage.removeItem(getStorageKey(slug));
          }
        }

        setStage("permission");
      } catch (error) {
        console.error(error);
        setStage("missing");
      }
    };

    bootstrap();

    return () => {
      stopTracks();
    };
  }, [slug, stopTracks]);

  useEffect(() => {
    let interval = null;

    if (stage === "thinking" && thinkingRemaining > 0) {
      interval = setInterval(() => {
        setThinkingRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            startRecording()
              .then(() => setStage("recording"))
              .catch(() => {});
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stage, thinkingRemaining, startRecording]);

  useEffect(() => {
    if (
      stage === "recording" &&
      position?.answer_time_seconds &&
      recordingSeconds >= Number(position.answer_time_seconds)
    ) {
      handleAutoSubmit();
    }
  }, [stage, recordingSeconds, position]);

  useEffect(() => {
    if (stage === "question") {
      setRetakesUsed(0);
      resetRecording();
      setReplayKey(0);
      setQuestionEnded(false);
    }
  }, [stage, activeQuestionIndex, resetRecording]);

  const questions = position?.questions || [];
  const activeQuestion = questions[activeQuestionIndex];
  const farewellExists = Boolean(position?.farewell_video_url);
  const canRetake =
    retakesUsed < Number(position?.allowed_retakes || 0) && !!recordedBlob;
  const questionProgress = useMemo(() => {
    if (!questions.length) return 0;
    return ((activeQuestionIndex + 1) / questions.length) * 100;
  }, [activeQuestionIndex, questions.length]);

  const startSubmissionFlow = async () => {
    try {
      setIsStarting(true);

      // Force media permission check here as well, so candidates who skip
      // the separate enable button still get a browser prompt/error.
      await requestStream();

      const existingSessionToken = localStorage.getItem(getStorageKey(slug));
      const res = await interviewToolsApi.startSubmission(slug, {
        ...form,
        existing_session_token: existingSessionToken || null,
      });
      setPosition(res.data.data.position);
      setSubmission(res.data.data.submission);
      localStorage.setItem(
        getStorageKey(slug),
        res.data.data.submission.session_token,
      );
      const nextStage = res.data.data.position?.intro_video_url
        ? "intro"
        : "question";
      setPostInstructionsStage(nextStage);
      setStage("instructions");
      setStatusMessage("");
    } catch (error) {
      console.error(error);
      setStatusMessage(
        error?.response?.data?.message ||
          "Camera/microphone permission is required to start this interview.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const beginQuestionRecording = async () => {
    resetRecording();
    setRetakesUsed(0);

    try {
      await requestStream();
    } catch (error) {
      setStatusMessage(
        "Microphone is not capturing audio. Please allow camera and mic access, then try again.",
      );
      return;
    }

    const thinkingTime = Number(position?.thinking_time_seconds || 3);
    setThinkingRemaining(thinkingTime > 0 ? thinkingTime : 3);
    setStage("thinking");
  };

  const skipThinkingTime = async () => {
    setThinkingRemaining(0);
    try {
      await startRecording();
      setStage("recording");
    } catch (error) {
      console.error(error);
      setStatusMessage(
        "Microphone is not capturing audio. Please check mic permissions and try again.",
      );
    }
  };

  const handleStopManual = async () => {
    await stopRecording();
    setStage("reviewless-stop");
  };

  const handleRetake = async () => {
    resetRecording();
    setRetakesUsed((prev) => prev + 1);
    try {
      await startRecording();
      setStage("recording");
      setStatusMessage("");
    } catch (error) {
      console.error(error);
      setStatusMessage(
        "Microphone is not capturing audio. Please check mic permissions and try again.",
      );
    }
  };

  const handleAutoSubmit = async () => {
    const blob = await stopRecording();
    setStage("reviewless-stop");
    await submitCurrentAnswer(blob || recordedBlob);
  };

  const submitCurrentAnswer = async (finalBlob = recordedBlob) => {
    if (!finalBlob || !submission || !activeQuestion) return;

    if (!recordingHasAudioSignal) {
      setStatusMessage(
        "No voice was detected in this recording. Please retake after verifying your microphone input.",
      );
      return;
    }

    setSubmittingAnswer(true);

    try {
      const answerMimeType = finalBlob.type || "video/webm";
      const answerExtension = getMediaExtensionFromMime(answerMimeType);

      const uploadUrlRes = await interviewToolsApi.getPublicUploadUrl(
        submission.submission_id,
        {
          session_token: submission.session_token,
          question_id: activeQuestion.question_id,
          fileName: `answer.${answerExtension}`,
          contentType: answerMimeType,
        },
      );

      const { uploadUrl, key } = uploadUrlRes.data.data;

      await uploadFileToSignedUrl({
        file: finalBlob,
        uploadUrl,
        contentType: answerMimeType,
      });

      await interviewToolsApi.saveAnswer(submission.submission_id, {
        session_token: submission.session_token,
        question_id: activeQuestion.question_id,
        answer_order: activeQuestionIndex + 1,
        answer_video_key: key,
        answer_duration_seconds: recordingSeconds,
        retake_count: retakesUsed,
        next_question_index: activeQuestionIndex + 1,
      });

      const nextAnswers = [
        ...answers.filter(
          (item) => item.question_id !== activeQuestion.question_id,
        ),
        {
          question_id: activeQuestion.question_id,
          answer_video_key: key,
          answer_duration_seconds: recordingSeconds,
          retake_count: retakesUsed,
        },
      ];
      setAnswers(nextAnswers);

      if (activeQuestionIndex < questions.length - 1) {
        setActiveQuestionIndex((prev) => prev + 1);
        setStage("question");
      } else if (farewellExists) {
        setStage("farewell");
      } else {
        await finishInterview();
      }

      resetRecording();
      setRetakesUsed(0);
      setStatusMessage("");
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not save your answer. Please try again.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const finishInterview = async () => {
    try {
      await interviewToolsApi.finishSubmission(submission.submission_id, {
        session_token: submission.session_token,
      });
      localStorage.removeItem(getStorageKey(slug));
      setStage("done");
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not finish interview");
    }
  };

  if (stage === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#083262]" />
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Loading Interview
          </div>
        </div>
      </div>
    );
  }

  if (stage === "closed" || stage === "missing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Surface className="max-w-xl px-8 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold text-slate-900">
            {stage === "closed" ? "Applications Closed" : "Interview Not Found"}
          </h1>
          <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
            {stage === "closed"
              ? "This interview is no longer accepting submissions."
              : "The interview link is invalid or not available right now."}
          </p>
        </Surface>
      </div>
    );
  }

  const isQuestionFlow = [
    "question",
    "thinking",
    "recording",
    "reviewless-stop",
  ].includes(stage);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-0 py-0 md:px-8 md:py-8">
        {statusMessage ? (
          <div className="mb-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        ) : null}

        {stage === "permission" ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center md:p-4">
            <div className="w-full bg-white rounded-none md:rounded-3xl shadow-none md:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[500px]">
              {/* Left Column: Camera preview — hidden on mobile step 1 */}
              <div
                className={`w-full md:flex md:w-[55%] relative flex-col p-0 md:p-8 lg:p-12 ${
                  mobileStep === 1 ? "hidden md:flex" : "flex"
                }`}
              >
                {/* Video Stack Wrapper */}
                <div className="relative w-full aspect-video mt-auto mb-auto">
                  <div className="absolute inset-0 md:rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    {!stream ? (
                      <div className="flex flex-col items-center justify-center text-white/50 h-full w-full">
                        <Camera className="w-10 h-10 mb-3 opacity-30" />
                        <p className="font-medium text-sm">Camera inactive</p>
                      </div>
                    ) : (
                      <video
                        ref={streamVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>

                {/* Mobile step 2 action panel — hidden on desktop */}
                <div className="md:hidden px-6 pb-6 pt-4 flex flex-col gap-3 bg-white">
                  {!stream ? (
                    <button
                      type="button"
                      onClick={handleRequestStream}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#062446] shadow-md"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Enable Camera &amp; Mic
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startSubmissionFlow}
                      disabled={isStarting}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#062446] shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isStarting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          Starting...
                        </>
                      ) : (
                        <>
                          Start Interview
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileStep(1)}
                    className="text-center text-sm font-semibold text-slate-400 hover:text-slate-600 transition py-1"
                  >
                    Back to details
                  </button>
                </div>
              </div>

              {/* Right Column: Form + desktop buttons — hidden on mobile step 2 */}
              <div
                className={`w-full md:flex md:w-[45%] flex-col justify-center bg-white ${
                  mobileStep === 2 ? "hidden md:flex" : "flex"
                } p-6 md:p-8 lg:p-12`}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#083262] mb-2">
                  Before You Start
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Welcome
                </h2>
                <p className="mt-4 text-[15px] font-medium leading-relaxed text-slate-500">
                  Please enter your details to begin the interview.
                </p>

                <div className="mt-8 space-y-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Full Name
                    </label>
                    <input
                      value={form.candidate_name}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          candidate_name: e.target.value,
                        }))
                      }
                      placeholder="Jane Doe"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Email Address
                    </label>
                    <input
                      value={form.candidate_email}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          candidate_email: e.target.value,
                        }))
                      }
                      placeholder="jane@example.com"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Phone Number
                    </label>
                    <input
                      value={form.candidate_phone}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setForm((prev) => ({ ...prev, candidate_phone: val }));
                      }}
                      placeholder="9999999999"
                      maxLength={10}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#083262] focus:ring-4 focus:ring-[#083262]/5"
                    />
                  </div>
                </div>

                {/* Mobile: Next button */}
                <div className="mt-8 md:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileStep(2)}
                    disabled={
                      !form.candidate_name ||
                      !form.candidate_email ||
                      form.candidate_phone.length !== 10
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#062446] shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Desktop: Camera + Start buttons */}
                <div className="mt-10 hidden md:flex flex-col gap-3">
                  {!stream ? (
                    <button
                      type="button"
                      onClick={handleRequestStream}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#062446] shadow-md"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Enable Camera &amp; Mic
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startSubmissionFlow}
                      disabled={
                        isStarting ||
                        !form.candidate_name ||
                        !form.candidate_email ||
                        !form.candidate_phone ||
                        form.candidate_phone.length !== 10
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#062446] shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isStarting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          Starting...
                        </>
                      ) : (
                        <>
                          Start Interview
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {stage === "instructions" ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center md:p-4">
            <div className="w-full bg-white rounded-none md:rounded-3xl shadow-none md:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col items-center justify-center text-center px-8 py-16 md:px-16 md:py-20 min-h-[500px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#083262]/[0.07] mb-8">
                <Mic className="h-7 w-7 text-[#083262]" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#083262] mb-3">
                Before You Begin
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight max-w-lg">
                You&apos;re almost ready.
              </h2>
              <p className="mt-6 text-[15px] font-medium leading-relaxed text-slate-500 max-w-xl">
                Listen carefully to each question before you begin answering.
                Once the prompt ends, your response will be recorded
                automatically.
              </p>
              <p className="mt-3 text-[15px] font-medium leading-relaxed text-slate-500 max-w-xl">
                You&apos;ll have a short preparation window before each answer —
                use it to gather your thoughts. Your recorded responses will be
                reviewed by our team.
              </p>
              <div className="mt-10 w-16 h-0.5 rounded-full bg-slate-200" />
              <button
                type="button"
                onClick={() => setStage(postInstructionsStage)}
                className="mt-10 flex items-center justify-center gap-2 rounded-full bg-[#083262] px-10 py-4 text-sm font-bold text-white transition hover:bg-[#062446] shadow-md"
              >
                I Understand, Let&apos;s Begin
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {stage === "intro" || stage === "farewell" ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center md:p-4">
            <div className="w-full bg-white rounded-none md:rounded-3xl shadow-none md:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[500px]">
              {/* Left Column: Video Player */}
              <div className="w-full md:w-[55%] relative flex flex-col justify-center p-0 md:p-8 lg:p-12">
                <div className="relative w-full aspect-video">
                  <div className="absolute inset-0 rounded-xl overflow-hidden bg-black">
                    <InterviewVideoPlayer
                      src={
                        stage === "intro"
                          ? position?.intro_video_url
                          : position?.farewell_video_url
                      }
                      title={stage === "intro" ? "Introduction" : "Farewell"}
                      autoPlay
                      variant="minimal"
                      className="w-full aspect-video border-none !rounded-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Text & Controls */}
              <div className="w-full md:w-[45%] p-6 md:p-8 lg:p-12 flex flex-col justify-center bg-white">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#083262] mb-2">
                  {stage === "intro" ? "Introduction" : "Wrap Up"}
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {stage === "intro"
                    ? position?.intro_video_title || "Welcome"
                    : position?.farewell_video_title || "Thank You"}
                </h2>

                <p className="mt-4 text-[15px] font-medium leading-relaxed text-slate-500">
                  {stage === "intro"
                    ? position?.intro_video_description ||
                      "Watch the introduction, then continue to the interview."
                    : position?.farewell_video_description ||
                      "You are almost done. Finish when you are ready."}
                </p>

                <div className="mt-10">
                  <button
                    type="button"
                    onClick={() =>
                      stage === "intro"
                        ? setStage("question")
                        : finishInterview()
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#062446] shadow-md"
                  >
                    {stage === "intro" ? "Continue" : "Finish Interview"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isQuestionFlow && activeQuestion ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center md:p-4">
            <div className="w-full bg-white rounded-none md:rounded-3xl shadow-none md:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[600px]">
              {/* Left Column: Video Player */}
              <div className="w-full md:w-[55%] relative flex flex-col p-0 md:p-8 lg:p-12">
                {/* Video Stack Wrapper */}
                <div className="relative w-full aspect-video flex-1 flex items-center justify-center mt-auto mb-auto">
                  {/* Main Question Video */}
                  <div
                    className={`absolute w-full shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all duration-[800ms] overflow-hidden bg-[#041122] ${
                      ["thinking", "recording", "reviewless-stop"].includes(
                        stage,
                      )
                        ? "scale-[0.88] -rotate-[3deg] opacity-[0.65] blur-[4px] z-10 origin-bottom-right translate-x-4 -translate-y-4 rounded-3xl"
                        : "scale-100 rotate-0 opacity-100 z-10 origin-center translate-x-0 translate-y-0 rounded-2xl"
                    }`}
                  >
                    <InterviewVideoPlayer
                      key={replayKey}
                      src={activeQuestion.video_url}
                      title="Prompt"
                      autoPlay
                      variant="minimal"
                      className="w-full aspect-video border-none !rounded-none"
                      onEnded={() => {
                        if (stage === "question") {
                          setQuestionEnded(true);
                        }
                      }}
                    />
                  </div>

                  {/* Picture-in-Picture layover Candidate Video */}
                  {["thinking", "recording", "reviewless-stop"].includes(
                    stage,
                  ) ? (
                    <div className="absolute z-20 w-[90%] aspect-video rounded-[24px] shadow-[0_20px_50px_-5px_rgba(0,0,0,0.6)] bg-black transition-all duration-[800ms] top-1/2 -translate-y-1/2 left-[5%] isolate border-none">
                      <video
                        ref={streamVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 h-full w-full object-cover rounded-[24px]"
                      />

                      {/* Overlays for Candidate Feed */}
                      {stage === "thinking" && (
                        <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center backdrop-blur-sm z-30 rounded-[24px]">
                          <div className="text-white text-6xl font-extrabold tracking-tight mb-2 drop-shadow-md">
                            {thinkingRemaining}
                          </div>
                          <div className="text-white/80 font-semibold uppercase tracking-widest text-[10px]">
                            Prepare
                          </div>
                        </div>
                      )}

                      {stage === "recording" && (
                        <div className="absolute inset-0 z-30 pointer-events-none rounded-[24px]">
                          <div className="absolute top-4 right-4 flex items-center gap-2 text-rose-500 font-bold text-xs tracking-wider bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md uppercase pointer-events-auto border border-white/10">
                            <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse mt-0.5" />
                            REC
                          </div>
                          <div className="absolute bottom-4 left-4 text-white font-mono font-bold text-lg drop-shadow-md bg-black/60 px-3.5 py-1.5 rounded-xl backdrop-blur-md pointer-events-auto border border-white/10">
                            {formatSeconds(recordingSeconds)}
                          </div>
                        </div>
                      )}

                      {stage === "reviewless-stop" && (
                        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-md z-30 rounded-[24px]">
                          <div className="bg-[#00c875] text-white px-7 py-3 rounded-full font-bold shadow-[0_10px_30px_-10px_rgba(0,200,117,0.7)] flex items-center gap-2.5 text-[15px] border border-[#00c875]">
                            <CheckCircle2 className="w-5 h-5" />
                            Recorded
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Right Column: Context & Controls */}
              <div className="w-full md:w-[45%] p-6 md:p-8 lg:p-12 flex flex-col justify-center bg-white">
                <div className="text-sm font-bold text-[#083262] tracking-wide mb-3 flex items-center gap-2">
                  <span>Question {activeQuestionIndex + 1}</span>
                  <span className="text-slate-400 font-medium">
                    of {questions.length}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#083262] tracking-tight">
                  {activeQuestion.title}
                </h2>

                {activeQuestion.short_description && (
                  <p className="mt-5 text-slate-600 leading-relaxed text-[15px] font-medium max-w-sm">
                    {activeQuestion.short_description}
                  </p>
                )}

                <div className="mt-12 flex flex-wrap items-center gap-4">
                  {stage === "question" && !questionEnded && (
                    <div className="w-full flex flex-col gap-3">
                      <p className="text-[15px] font-semibold text-slate-500 flex items-center gap-2.5 border border-slate-200 bg-slate-50 px-5 py-2.5 rounded-2xl shadow-sm">
                        <AlertCircle className="w-4 h-4 text-[#083262] shrink-0" />
                        Prompt is playing. Listen carefully.
                      </p>
                      <button
                        type="button"
                        onClick={() => setReplayKey((k) => k + 1)}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm w-fit"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Replay Question
                      </button>
                    </div>
                  )}

                  {stage === "question" && questionEnded && (
                    <div className="w-full flex flex-col gap-3">
                      <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1">
                        Question ended
                      </p>
                      <button
                        type="button"
                        onClick={beginQuestionRecording}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#083262] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#062446] shadow-md"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Proceed to Answer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestionEnded(false);
                          setReplayKey((k) => k + 1);
                        }}
                        className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm w-full"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Replay Question
                      </button>
                    </div>
                  )}

                  {stage === "thinking" && (
                    <button
                      onClick={skipThinkingTime}
                      className="bg-emerald-600 text-white px-8 py-4 rounded-full font-bold hover:bg-emerald-700 transition flex items-center gap-2 text-[15px] shadow-[0_8px_20px_-8px_rgba(5,150,105,0.6)]"
                    >
                      Start Answer Now
                    </button>
                  )}

                  {stage === "recording" && (
                    <button
                      onClick={handleStopManual}
                      className="bg-[#bcc8d0] text-[#1a2f43] px-8 py-3.5 rounded-[24px] font-extrabold hover:bg-[#a9b6c0] transition flex items-center gap-2.5 text-[15px] shadow-sm tracking-wide"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Stop Recording
                    </button>
                  )}

                  {stage === "reviewless-stop" && (
                    <>
                      <button
                        onClick={() => submitCurrentAnswer()}
                        disabled={submittingAnswer}
                        className="bg-[#00c875] text-white px-9 py-4 rounded-full font-extrabold hover:bg-[#00b065] transition flex items-center gap-2 text-[15px] shadow-[0_10px_25px_-10px_rgba(0,200,117,0.7)] disabled:opacity-50 border border-[#00c875]"
                      >
                        {submittingAnswer ? "Submitting..." : "Next question"}
                        {!submittingAnswer && (
                          <ArrowRight className="w-4 h-4 ml-1 inline" />
                        )}
                      </button>

                      {canRetake && (
                        <span className="text-[15px] text-slate-400 font-semibold mx-1">
                          or
                        </span>
                      )}

                      {canRetake && (
                        <button
                          onClick={handleRetake}
                          className="bg-white border-2 text-slate-500 border-slate-200 px-7 py-3 rounded-full font-bold hover:bg-slate-50 hover:text-slate-700 transition text-[15px] shadow-sm"
                        >
                          Retake ({position.allowed_retakes - retakesUsed} left)
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isQuestionFlow && !activeQuestion ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center p-4">
            <div className="w-full bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] flex flex-col min-h-[400px] items-center justify-center p-8 text-center border-t-4 border-[#083262]">
              <div className="h-20 w-20 flex items-center justify-center rounded-full bg-slate-100/80 mb-6 drop-shadow-sm">
                <AlertCircle className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-3xl font-extrabold text-[#083262] tracking-tight">
                No Questions Configured
              </h2>
              <p className="text-slate-500 mt-4 font-medium max-w-md text-lg leading-relaxed">
                This assessment currently has no questions assigned. If you
                believe this is an error, please contact the administrator.
              </p>
            </div>
          </div>
        ) : null}
        {stage === "done" ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col min-h-[400px] items-center justify-center p-8 lg:p-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-8">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-[#083262]">
                Thank you for completing the interview.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg font-medium leading-relaxed text-slate-500">
                {position?.thank_you_message ||
                  "We’ve received your responses successfully. Our team will review them and get back to you soon."}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
