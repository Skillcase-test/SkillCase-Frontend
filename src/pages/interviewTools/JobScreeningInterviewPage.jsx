import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Mic,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Phone,
  CheckCircle2,
  Camera,
} from "lucide-react";
import { interviewToolsApi } from "../../api/interviewToolsApi";
import { getProgress, checkInterview } from "../../api/jobScreeningApi";
import api from "../../api/axios";
import InterviewVideoPlayer from "./shared/InterviewVideoPlayer";
import useInterviewRecorder from "./shared/useInterviewRecorder";
import { uploadFileToSignedUrl } from "./shared/uploadFileToSignedUrl";
import mayaShocked from "../../assets/onboarding/mayaShocked.webp";

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

// Stages where the candidate is actively engaged in the interview.
// Navigation away from these stages risks losing progress.
const ACTIVE_STAGES = new Set([
  "instructions",
  "intro",
  "question",
  "thinking",
  "recording",
  "reviewless-stop",
  "farewell",
]);

export default function JobScreeningInterviewPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);
  const [position, setPosition] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [form, setForm] = useState({
    candidate_name: "",
    candidate_email: "",
    candidate_phone: "",
  });

  const isJobScreeningFlow = true;
  const isJobScreeningCandidate = isAuthenticated || !!user || !!token;

  // Sync candidate details from React Router state, Redux user profile, or API
  useEffect(() => {
    const syncFormDetails = async () => {
      if (isJobScreeningCandidate) {
        const stateName = location.state?.name;
        const stateEmail = location.state?.email;
        const statePhone = location.state?.phone;

        // 1. Try React Router state
        if (stateName || stateEmail || statePhone) {
          setForm({
            candidate_name: stateName || "",
            candidate_email: stateEmail || "",
            candidate_phone: statePhone || "",
          });
          return;
        }

        // 2. Try Redux user profile details (admin-configured fields)
        if (user) {
          const profileName = user.fullname || user.name || "";
          const profileEmail = user.email || "";
          const profilePhone = user.number || user.phone || user.phone_number || "";

          if (profileName && profileEmail && profilePhone) {
            setForm({
              candidate_name: profileName,
              candidate_email: profileEmail,
              candidate_phone: profilePhone,
            });
            return;
          }
        }

        // 3. Retrieve from user profile API directly (contains admin-set details)
        try {
          const profileRes = await api.get("/user/profile");
          if (profileRes.data?.profile) {
            const p = profileRes.data.profile;
            const pName = p.fullname || p.name || "";
            const pEmail = p.email || "";
            const pPhone = p.number || p.phone || p.phone_number || "";

            if (pName && pEmail && pPhone) {
              setForm({
                candidate_name: pName,
                candidate_email: pEmail,
                candidate_phone: pPhone,
              });
              return;
            }
          }
        } catch (err) {
          console.error("Failed to load candidate details from user profile API:", err);
        }

        // 3. Fallback to API progress candidate details
        try {
          const { data } = await getProgress();
          if (data?.success) {
            setForm({
              candidate_name: data.data.candidate_name || user?.fullname || user?.name || "",
              candidate_email: data.data.candidate_email || user?.email || "",
              candidate_phone: data.data.candidate_phone || user?.number || user?.phone || user?.phone_number || "",
            });
          }
        } catch (err) {
          console.error(
            "Failed to load candidate details on bootstrap:",
            err,
          );
        }
      }
    };
    syncFormDetails();
  }, [isJobScreeningCandidate, location.state, user]);

  const [globalTimeLeft, setGlobalTimeLeft] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingNavigationRef = useRef(null);
  const [stage, setStage] = useState("loading");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [thinkingRemaining, setThinkingRemaining] = useState(0);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [postInstructionsStage, setPostInstructionsStage] =
    useState("question");
  const [replayKey, setReplayKey] = useState(0);
  const [questionEnded, setQuestionEnded] = useState(false);
  const [retakesUsed, setRetakesUsed] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const streamVideoRef = useRef(null);
  const stageRef = useRef(stage);
  const submissionRef = useRef(submission);
  const handleAutoSubmitRef = useRef(null);
  const recordedBlobRef = useRef(null);
  const timerExpireSubmitRef = useRef(null);

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

  // Keep refs in sync with latest state so the timer interval
  // can always read the current values without being a dependency.
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  useEffect(() => {
    submissionRef.current = submission;
  }, [submission]);
  useEffect(() => {
    recordedBlobRef.current = recordedBlob;
  }, [recordedBlob]);

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

  // Block in-app React Router navigation when the candidate is mid-interview.
  const isInterviewActive = ACTIVE_STAGES.has(stage);

  // Intercept browser back/forward buttons.
  useEffect(() => {
    if (!isInterviewActive) return;
    window.history.pushState({ interviewGuard: true }, "");
    const handlePopstate = () => {
      if (ACTIVE_STAGES.has(stageRef.current)) {
        window.history.pushState({ interviewGuard: true }, "");
        pendingNavigationRef.current = () => window.history.go(-2);
        setShowLeaveModal(true);
      }
    };
    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [isInterviewActive]);

  // Intercept in-app link clicks (navbar, etc.) in the capture phase.
  useEffect(() => {
    if (!isInterviewActive) return;
    const handleClick = (e) => {
      const anchor = e.target.closest("a[href]");
      if (!anchor || anchor.target === "_blank") return;
      if (!ACTIVE_STAGES.has(stageRef.current)) return;
      e.preventDefault();
      e.stopPropagation();
      const href = anchor.getAttribute("href");
      pendingNavigationRef.current = () => {
        window.location.href = href;
      };
      setShowLeaveModal(true);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isInterviewActive]);

  // Prevent browser refresh / tab close during active interview.
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (ACTIVE_STAGES.has(stage)) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [stage]);

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
        if (isJobScreeningCandidate) {
          try {
            const { data } = await getProgress();
            if (data?.success) {
              const steps = data.data.steps_config || [];
              const interviewStep = steps.find(s => s.id === "interview_attempt");
              if (interviewStep && interviewStep.status === "completed") {
                navigate("/job-screening", { replace: true });
                return;
              }
            }
          } catch (progressErr) {
            console.error("Failed to check screening progress on bootstrap:", progressErr);
          }
        }

        const query = new URLSearchParams(window.location.search);
        const inviteFromQuery = String(query.get("invite") || "").trim();
        setInviteToken(inviteFromQuery);

        let meta = null;
        if (inviteFromQuery) {
          try {
            const inviteRes = await interviewToolsApi.resolveInvite(
              slug,
              inviteFromQuery,
            );
            meta = inviteRes.data.data.position;
          } catch (inviteErr) {
            console.error("Invite resolve failed", inviteErr);
          }
        }

        if (!meta) {
          const metaRes = await interviewToolsApi.getPublicPosition(slug);
          meta = metaRes.data.data;
        }
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

  const startSubmissionFlow = async () => {
    try {
      setIsStarting(true);

      // Force media permission check here as well
      await requestStream();

      // Retrieve candidate details directly from user profile API right before starting
      let candidateDetails = {
        candidate_name: form.candidate_name,
        candidate_email: form.candidate_email,
        candidate_phone: form.candidate_phone,
      };

      if (token || isAuthenticated || isJobScreeningCandidate) {
        try {
          const profileRes = await api.get("/user/profile");
          if (profileRes.data?.profile) {
            const p = profileRes.data.profile;
            candidateDetails.candidate_name = p.fullname || p.name || candidateDetails.candidate_name || "";
            candidateDetails.candidate_email = p.email || candidateDetails.candidate_email || "";
            candidateDetails.candidate_phone = p.number || p.phone || p.phone_number || candidateDetails.candidate_phone || "";
          }
        } catch (err) {
          console.error("Failed to load user profile in startSubmissionFlow:", err);
        }

        // Secondary fallback to progress details
        if (!candidateDetails.candidate_name || !candidateDetails.candidate_email || !candidateDetails.candidate_phone) {
          try {
            const { data } = await getProgress();
            if (data?.success) {
              candidateDetails.candidate_name = candidateDetails.candidate_name || data.data.candidate_name || "";
              candidateDetails.candidate_email = candidateDetails.candidate_email || data.data.candidate_email || "";
              candidateDetails.candidate_phone = candidateDetails.candidate_phone || data.data.candidate_phone || "";
            }
          } catch (progressErr) {
            console.error("Failed to load progress in startSubmissionFlow:", progressErr);
          }
        }
      }

      // If still empty, use fallback from Redux user state
      if (user && (!candidateDetails.candidate_name || !candidateDetails.candidate_email || !candidateDetails.candidate_phone)) {
        candidateDetails.candidate_name = candidateDetails.candidate_name || user.fullname || user.name || "";
        candidateDetails.candidate_email = candidateDetails.candidate_email || user.email || "";
        candidateDetails.candidate_phone = candidateDetails.candidate_phone || user.number || user.phone || user.phone_number || "";
      }

      const existingSessionToken = localStorage.getItem(getStorageKey(slug));
      const res = await interviewToolsApi.startSubmission(slug, {
        ...candidateDetails,
        existing_session_token: existingSessionToken || null,
        invite_token: inviteToken || null,
      });
      setPosition(res.data.data.position);
      setSubmission(res.data.data.submission);
      localStorage.setItem(
        getStorageKey(slug),
        res.data.data.submission.session_token,
      );

      if (!localStorage.getItem(`interview_started_${slug}`)) {
        localStorage.setItem(
          `interview_started_${slug}`,
          Date.now().toString(),
        );
      }

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
  handleAutoSubmitRef.current = handleAutoSubmit;

  const timerExpireSubmit = async (blobToSave) => {
    const currentSubmission = submissionRef.current;
    if (!currentSubmission || !activeQuestion) {
      setStage("done");
      return;
    }

    setSubmittingAnswer(true);
    try {
      if (blobToSave) {
        const answerMimeType = blobToSave.type || "video/webm";
        const answerExtension = getMediaExtensionFromMime(answerMimeType);
        const uploadUrlRes = await interviewToolsApi.getPublicUploadUrl(
          currentSubmission.submission_id,
          {
            session_token: currentSubmission.session_token,
            question_id: activeQuestion.question_id,
            fileName: `answer.${answerExtension}`,
            contentType: answerMimeType,
          },
        );
        const { uploadUrl, key } = uploadUrlRes.data.data;
        await uploadFileToSignedUrl({
          file: blobToSave,
          uploadUrl,
          contentType: answerMimeType,
        });
        await interviewToolsApi.saveAnswer(currentSubmission.submission_id, {
          session_token: currentSubmission.session_token,
          question_id: activeQuestion.question_id,
          answer_order: activeQuestionIndex + 1,
          answer_video_key: key,
          answer_duration_seconds: recordingSeconds,
          retake_count: retakesUsed,
          next_question_index: activeQuestionIndex + 1,
        });
      }
    } catch (err) {
      console.error("Timer-expiry save failed", err);
    } finally {
      setSubmittingAnswer(false);
    }

    try {
      await interviewToolsApi.finishSubmission(
        currentSubmission.submission_id,
        {
          session_token: currentSubmission.session_token,
        },
      );
      if (isJobScreeningCandidate) {
        try {
          await checkInterview();
        } catch (checkErr) {
          console.error(
            "Failed to auto-verify job screening interview status",
            checkErr,
          );
        }
      }
    } catch (_) {}
    localStorage.removeItem(getStorageKey(slug));
    localStorage.removeItem(`interview_started_${slug}`);
    setStage("done");
  };
  timerExpireSubmitRef.current = timerExpireSubmit;

  useEffect(() => {
    if (!position?.overall_time_limit_minutes) return;

    const startedAt = localStorage.getItem(`interview_started_${slug}`);
    if (!startedAt) return;

    const limitMs = Number(position.overall_time_limit_minutes) * 60 * 1000;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - Number(startedAt);
      const remainingMs = limitMs - elapsedMs;

      if (remainingMs <= 0) {
        clearInterval(interval);
        setGlobalTimeLeft(0);

        const currentStage = stageRef.current;

        (async () => {
          if (currentStage === "recording") {
            const blob = await stopRecording();
            await timerExpireSubmitRef.current?.(
              blob || recordedBlobRef.current,
            );
          } else if (
            currentStage === "reviewless-stop" &&
            recordedBlobRef.current
          ) {
            await timerExpireSubmitRef.current?.(recordedBlobRef.current);
          } else {
            await timerExpireSubmitRef.current?.(null);
          }
        })();
      } else {
        setGlobalTimeLeft(Math.floor(remainingMs / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [position, slug]);

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
    if (isFinishing) return;
    setIsFinishing(true);
    try {
      await interviewToolsApi.finishSubmission(submission.submission_id, {
        session_token: submission.session_token,
      });
      localStorage.removeItem(getStorageKey(slug));
      localStorage.removeItem(`interview_started_${slug}`);
      if (isJobScreeningCandidate) {
        try {
          await checkInterview();
        } catch (checkErr) {
          console.error(
            "Failed to auto-verify job screening interview status",
            checkErr,
          );
        }
      }
      setStage("done");
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not finish interview");
    } finally {
      setIsFinishing(false);
    }
  };

  if (stage === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#002856] border-t-transparent rounded-full animate-spin" />
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#002856]">
            Loading Interview
          </div>
        </div>
      </div>
    );
  }

  if (stage === "closed" || stage === "missing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <Surface className="max-w-xl px-8 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold text-[#002856]">
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
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-md px-4 py-4">
        {globalTimeLeft !== null && (
          <div className="fixed top-4 right-4 z-50 bg-rose-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 tabular-nums">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {Math.floor(globalTimeLeft / 60)}:
            {(globalTimeLeft % 60).toString().padStart(2, "0")} left
          </div>
        )}

        {showLeaveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 mx-auto mb-5">
                <AlertCircle className="h-7 w-7 text-rose-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Leave Interview?
              </h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
                Your progress may not be saved if you leave now. Recorded
                answers that have not been submitted will be lost.
              </p>
              <div className="mt-7 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    pendingNavigationRef.current = null;
                    setShowLeaveModal(false);
                  }}
                  className="w-full rounded-full bg-[#002856] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#001c3d]"
                >
                  Stay in Interview
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowLeaveModal(false);
                    if (isRecording) {
                      try {
                        await stopRecording();
                      } catch (_) {}
                    }
                    pendingNavigationRef.current?.();
                    pendingNavigationRef.current = null;
                  }}
                  className="w-full rounded-full border border-slate-200 px-6 py-3.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  Leave Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {statusMessage ? (
          <div className="mb-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        ) : null}

        {stage === "permission" ? (
          <div className="w-full flex flex-col justify-start items-start">
            {/* Sub-Header bar */}
            <div className="w-full flex justify-between items-center pb-2.5">
              <button
                onClick={() => navigate("/job-screening")}
                className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0"
              >
                <ArrowLeft className="w-4 h-4 text-black" />
                <span className="text-[#0f172a] text-sm font-semibold">
                  Back
                </span>
              </button>
              <span className="text-neutral-500 text-sm font-semibold">
                Job Progress
              </span>
            </div>

            {/* View State A: Pre-Permission Setup Screen */}
            {!stream ? (
              <div className="w-full flex flex-col justify-start items-start mt-6">
                <div className="w-full flex flex-col gap-3 mb-6">
                  <h1 className="text-blue-950 text-2xl font-semibold">
                    Your Skillcase interview
                  </h1>
                  <p className="text-blue-950/70 text-sm font-medium leading-relaxed">
                    This speaking assessment helps us evaluate your language
                    fluency and communication skills for the nursing placement.
                  </p>
                </div>

                {/* Points to remember card */}
                <div className="w-full p-4 bg-white rounded-2xl border border-slate-200 flex flex-col gap-6 overflow-hidden mb-6 text-left">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-slate-900 text-base font-semibold leading-6">
                      Points to remember
                    </span>
                    <span className="px-2.5 py-0.5 bg-green-700/10 rounded-full text-green-700 text-xs font-semibold uppercase tracking-wider">
                      in progress
                    </span>
                  </div>
                  <div className="flex flex-col gap-8 w-full">
                    {/* Point 1 */}
                    <div className="flex justify-start items-start gap-4 w-full">
                      <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center text-blue-950 shrink-0">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-slate-900 text-sm font-semibold leading-tight">
                          Language screening nursing
                        </span>
                        <span className="text-zinc-500 text-xs mt-0.5">
                          {questions.length || 5} questions, video &amp; audio
                        </span>
                      </div>
                    </div>
                    {/* Point 2 */}
                    <div className="flex justify-start items-start gap-4 w-full">
                      <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center text-blue-950 shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-slate-900 text-sm font-semibold leading-tight">
                          About 10 minutes
                        </span>
                        <span className="text-zinc-500 text-xs mt-0.5">
                          Answer at your own pace, re-record if needed.
                        </span>
                      </div>
                    </div>
                    {/* Point 3 */}
                    <div className="flex justify-start items-start gap-4 w-full">
                      <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center text-blue-950 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-slate-900 text-sm font-semibold leading-tight">
                          Find a quiet, well-lit spot
                        </span>
                        <span className="text-zinc-500 text-xs mt-0.5">
                          Ensure you are in a quiet room with good lighting.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Please note card */}
                <div className="w-full bg-gradient-to-r from-[#e0f2fe] to-[#cbeaff] rounded-2xl border border-blue-200 flex items-center gap-3.5 shadow-sm text-left mb-6 overflow-hidden">
                  <img
                    src={mayaShocked}
                    alt="Mascot Notice"
                    className="w-20 h-20 object-contain shrink-0 select-none"
                    draggable="false"
                  />
                  <div className="min-w-0 flex-1 pr-4 py-3">
                    <span className="text-[#002856] text-xs sm:text-sm font-bold block">
                      Please note
                    </span>
                    <span className="text-slate-500 text-[10px] sm:text-xs mt-0.5 block leading-normal">
                      We will ask for camera and mic access on the next screen.
                      Nothing is recorded until you press start.
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={handleRequestStream}
                  className="w-full py-3 bg-[#002856] hover:bg-[#001c3d] text-white rounded-lg font-semibold text-base transition-all shadow-sm cursor-pointer border-none"
                >
                  Set up camera and mic
                </button>
              </div>
            ) : (
              /* View State B: Start Assessment Screen (Camera Granted) */
              <div className="w-full flex flex-col justify-start items-start mt-6">
                {/* Video Preview */}
                <div className="w-full h-52 relative rounded-lg overflow-hidden bg-black flex items-center justify-center mb-6">
                  <video
                    ref={streamVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Points to remember card */}
                <div className="w-full p-4 bg-white rounded-2xl border border-slate-200 flex flex-col gap-6 overflow-hidden mb-6 text-left">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-slate-900 text-base font-semibold leading-6">
                      Points to remember
                    </span>
                    <span className="px-2.5 py-0.5 bg-green-700/10 rounded-full text-green-700 text-xs font-semibold uppercase tracking-wider">
                      in progress
                    </span>
                  </div>
                  <div className="flex flex-col gap-8 w-full">
                    {/* Point 1 */}
                    <div className="flex justify-start items-start gap-4 w-full">
                      <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center text-blue-950 shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-slate-900 text-sm font-semibold leading-tight">
                          Allow camera &amp; mic
                        </span>
                        <span className="text-zinc-500 text-xs mt-0.5">
                          Tap on &quot;Allow&quot; when your browser asks.
                        </span>
                      </div>
                    </div>
                    {/* Point 2 */}
                    <div className="flex justify-start items-start gap-4 w-full">
                      <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center text-blue-950 shrink-0">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-slate-900 text-sm font-semibold leading-tight">
                          Check it isn&apos;t muted
                        </span>
                        <span className="text-zinc-500 text-xs mt-0.5">
                          Close other apps using the mic (calls, recorder).
                        </span>
                      </div>
                    </div>
                    {/* Point 3 */}
                    <div className="flex justify-start items-start gap-4 w-full">
                      <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center text-blue-950 shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-slate-900 text-sm font-semibold leading-tight">
                          Still stuck?
                        </span>
                        <span className="text-zinc-500 text-xs mt-0.5">
                          If you get stuck with something, reach out to
                          Skillcase support.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={startSubmissionFlow}
                  disabled={isStarting}
                  className="w-full py-3 bg-[#002856] hover:bg-[#001c3d] text-white rounded-lg font-semibold text-base transition-all shadow-sm cursor-pointer border-none flex justify-center items-center gap-2"
                >
                  {isStarting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <span>Start interview</span>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {stage === "instructions" ? (
          <div className="w-full bg-white flex flex-col items-center justify-center text-center py-12 min-h-[500px]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#002856]/[0.07] mb-8">
              <Mic className="h-7 w-7 text-[#002856]" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#002856] mb-3">
              Before You Begin
            </div>
            <h2 className="text-3xl font-extrabold text-[#002856] tracking-tight">
              You&apos;re almost ready.
            </h2>
            <p className="mt-6 text-sm font-medium leading-relaxed text-slate-500">
              Listen carefully to each question before you begin answering. Once
              the prompt ends, your response will be recorded automatically.
            </p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
              You&apos;ll have a short preparation window before each answer —
              use it to gather your thoughts. Your recorded responses will be
              reviewed by our team.
            </p>
            <div className="mt-10 w-16 h-0.5 rounded-full bg-slate-250" />
            <button
              type="button"
              onClick={() => setStage(postInstructionsStage)}
              className="mt-10 flex items-center justify-center gap-2 rounded-full bg-[#002856] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#001c3d]"
            >
              I Understand, Let&apos;s Begin
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {stage === "intro" || stage === "farewell" ? (
          <div className="w-full bg-white flex flex-col min-h-[500px]">
            {/* Video Player */}
            <div className="w-full relative aspect-video rounded-xl overflow-hidden bg-black mb-6">
              <InterviewVideoPlayer
                src={
                  stage === "intro"
                    ? position?.intro_video_url
                    : position?.farewell_video_url
                }
                title={stage === "intro" ? "Introduction" : "Farewell"}
                autoPlay
                variant="minimal"
                className="w-full aspect-video border-none"
              />
            </div>

            {/* Text & Controls */}
            <div className="w-full flex flex-col justify-center text-left bg-white">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#002856] mb-2">
                {stage === "intro" ? "Introduction" : "Wrap Up"}
              </div>
              <h2 className="text-2xl font-bold text-[#002856] tracking-tight">
                {stage === "intro"
                  ? position?.intro_video_title || "Welcome"
                  : position?.farewell_video_title || "Thank You"}
              </h2>

              <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500">
                {stage === "intro"
                  ? position?.intro_video_description ||
                    "Watch the introduction, then continue to the interview."
                  : position?.farewell_video_description ||
                    "You are almost done. Finish when you are ready."}
              </p>

              <div className="mt-10">
                <button
                  type="button"
                  disabled={isFinishing}
                  onClick={() =>
                    stage === "intro" ? setStage("question") : finishInterview()
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#002856] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#001c3d] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {stage === "intro" ? (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : isFinishing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      Finishing...
                    </>
                  ) : (
                    <>
                      Finish Interview
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isQuestionFlow && activeQuestion ? (
          <div className="w-full bg-white flex flex-col min-h-[550px]">
            {/* Video Player */}
            <div className="w-full relative aspect-video mb-6">
              {/* Main Question Video */}
              <div
                className={`absolute w-full shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all duration-[800ms] overflow-hidden bg-[#041122] ${
                  ["thinking", "recording", "reviewless-stop"].includes(stage)
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
              {["thinking", "recording", "reviewless-stop"].includes(stage) ? (
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
                    <div className="absolute inset-0 bg-[#002856]/70 flex flex-col items-center justify-center backdrop-blur-sm z-30 rounded-[24px]">
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

            {/* Context & Controls */}
            <div className="w-full flex flex-col justify-center text-left bg-white">
              <div className="text-sm font-bold text-[#002856] tracking-wide mb-3 flex items-center gap-2">
                <span>Question {activeQuestionIndex + 1}</span>
                <span className="text-slate-400 font-medium">
                  of {questions.length}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#002856] tracking-tight">
                {activeQuestion.title}
              </h2>

              {activeQuestion.short_description && (
                <p className="mt-5 text-slate-600 leading-relaxed text-sm font-medium">
                  {activeQuestion.short_description}
                </p>
              )}

              <div className="mt-10 flex flex-wrap items-center gap-4">
                {stage === "question" && !questionEnded && (
                  <div className="w-full flex flex-col gap-3">
                    <p className="text-sm font-semibold text-slate-500 flex items-center gap-2.5 border border-slate-200 bg-slate-50 px-5 py-2.5 rounded-xl shadow-sm">
                      <AlertCircle className="w-4 h-4 text-[#002856] shrink-0" />
                      Prompt is playing. Listen carefully.
                    </p>
                    <button
                      type="button"
                      onClick={() => setReplayKey((k) => k + 1)}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm w-fit"
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
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#002856] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#001c3d] shadow-md"
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
                      className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition px-6 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm w-full"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Replay Question
                    </button>
                  </div>
                )}

                {stage === "thinking" && (
                  <button
                    onClick={skipThinkingTime}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-full font-bold hover:bg-emerald-700 transition flex items-center gap-2 text-sm shadow-[0_8px_20px_-8px_rgba(5,150,105,0.6)]"
                  >
                    Start Answer Now
                  </button>
                )}

                {stage === "recording" && (
                  <button
                    onClick={handleStopManual}
                    className="bg-[#bcc8d0] text-[#1a2f43] px-8 py-3 rounded-full font-extrabold hover:bg-[#a9b6c0] transition flex items-center gap-2.5 text-sm shadow-sm tracking-wide"
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
                      className="bg-[#00c875] text-white px-8 py-3 rounded-full font-extrabold hover:bg-[#00b065] transition flex items-center gap-2 text-sm shadow-[0_10px_25px_-10px_rgba(0,200,117,0.7)] disabled:opacity-50 border border-[#00c875]"
                    >
                      {submittingAnswer ? "Submitting..." : "Next question"}
                      {!submittingAnswer && (
                        <ArrowRight className="w-4 h-4 ml-1 inline" />
                      )}
                    </button>

                    {canRetake && (
                      <span className="text-sm text-slate-400 font-semibold mx-1">
                        or
                      </span>
                    )}

                    {canRetake && (
                      <button
                        onClick={handleRetake}
                        className="bg-white border-2 text-slate-500 border-slate-200 px-6 py-2.5 rounded-full font-bold hover:bg-slate-50 hover:text-slate-700 transition text-sm shadow-sm"
                      >
                        Retake ({position.allowed_retakes - retakesUsed} left)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {isQuestionFlow && !activeQuestion ? (
          <div className="w-full bg-white flex flex-col min-h-[400px] items-center justify-center p-8 text-center">
            <div className="h-16 w-16 flex items-center justify-center rounded-full bg-slate-100 mb-6">
              <AlertCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#002856] tracking-tight">
              No Questions Configured
            </h2>
            <p className="text-slate-500 mt-4 font-medium max-w-sm text-sm leading-relaxed">
              This assessment currently has no questions assigned. If you
              believe this is an error, please contact the administrator.
            </p>
          </div>
        ) : null}

        {stage === "done" ? (
          <div className="w-full bg-white flex flex-col min-h-[400px] items-center justify-center p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-8">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#002856]">
              Thank you!
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm font-medium leading-relaxed text-slate-500">
              {position?.thank_you_message ||
                "We've received your responses successfully. Our team will review them and get back to you soon."}
            </p>
            {isJobScreeningCandidate && (
              <button
                onClick={() => navigate("/job-screening")}
                className="mt-8 px-8 py-3 bg-[#002856] text-white hover:bg-[#001c3d] rounded-full font-bold text-sm transition-all shadow-md active:scale-[0.99]"
              >
                Go to Home
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
