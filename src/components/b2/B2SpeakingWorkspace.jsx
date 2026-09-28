import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Volume2, VolumeX, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { B2Page, B2State, B2Button } from "./B2UI";
import B2WorkspaceHeader from "./B2WorkspaceHeader";
import B2SpeakingRecorder from "./B2SpeakingRecorder";
import useB2Recorder from "../../hooks/useB2Recorder";
import useTextToSpeech from "../../hooks/useTextToSpeech";
import { hapticMedium } from "../../utils/haptics";
import { useQuestionPositionTelemetry } from "../../telemetry/learning";
import {
  getB2Exercise, submitB2ExerciseSpeakingAnswer, submitB2ExerciseSpeaking,
  startB2ExamSubmission, getB2ExamSectionContent, submitB2ExamSpeakingAudio,
} from "../../api/b2Api";

export default function B2SpeakingWorkspace({ assessment = false, resourceId }) {
  const navigate = useNavigate();
  const userId = useSelector((state) => state.auth.user?.user_id);
  const [submissionId, setSubmissionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deadline, setDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [skipCount, setSkipCount] = useState(0);
  const sending = useRef(false);
  const completed = useRef(false);
  const autoAttempted = useRef(false);
  const skipDialog = useRef(null);
  const actionTrigger = useRef(null);
  const { isSpeaking, isLoadingAudio, speakText, cancelSpeech } = useTextToSpeech();
  const block = questions[index];
  const taskKey = String(block?.id ?? index);
  const rawLimit = Number(block?.questions?.[0]?.speech_time_limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 60;
  const recorder = useB2Recorder(taskKey, limit);
  const { status, clip, getClip, markUploaded, stop } = recorder;
  const capturing = status !== "idle";
  const expired = assessment && timeLeft === 0;
  const last = index === questions.length - 1;
  const back = assessment ? "/b2/test" : "/b2/speaking";
  const results = assessment ? `/b2/exams/papers/${resourceId}/speaking/results` : `/b2/speaking/${resourceId}/results`;
  const timerKey = `b2_exam_timer_${userId || "guest"}_${resourceId}_speaking`;

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      if (assessment) {
        const start = await startB2ExamSubmission(resourceId);
        setSubmissionId(start.data?.submission_id || start.data?.id);
        const response = await getB2ExamSectionContent(resourceId, "speaking");
        const list = Array.isArray(response.data) ? response.data : [];
        setQuestions(list);
        let expiry = Date.now() + (Number(list[0]?.duration_minutes) || 30) * 60 * 1000;
        try {
          const saved = Number(localStorage.getItem(timerKey));
          if (Number.isFinite(saved) && saved > 0) expiry = saved;
          else localStorage.setItem(timerKey, String(expiry));
        } catch { /* The running timer still works if browser storage is unavailable. */ }
        setDeadline(expiry);
        setTimeLeft(Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));
      } else {
        const response = await getB2Exercise(resourceId);
        const exercise = response.data || {};
        if (exercise.module && exercise.module !== "speaking") throw new Error("Wrong module");
        setSubmissionId(resourceId);
        setQuestions((exercise.content?.blocks || []).map((item, i) => ({ id: i, ...item })));
      }
    } catch { setFetchError(true); }
    finally { setLoading(false); }
  }, [assessment, resourceId, timerKey]);

  useEffect(() => { if (userId) fetchContent(); }, [userId, fetchContent]);
  useEffect(() => {
    if (!assessment || !deadline || loading || fetchError) return;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [assessment, deadline, loading, fetchError]);
  useEffect(() => { cancelSpeech(); }, [index, cancelSpeech]);

  const submit = useCallback(async (finish = false) => {
    if (sending.current || completed.current || !submissionId) return;
    sending.current = true;
    setBusy(true);
    setSubmitError("");
    skipDialog.current?.close();
    cancelSpeech();
    try {
      // onstop delivers the final audio chunk asynchronously. Wait before uploading.
      await stop();
      const upload = async (item) => {
        const key = String(item.id);
        const answer = getClip(key);
        if (!answer || answer.uploaded) return;
        const form = new FormData();
        form.append("audio", answer.blob, answer.filename);
        form.append(assessment ? "questionId" : "questionKey", assessment ? item.id : `${item.id}_0`);
        form.append("recordDuration", answer.duration);
        if (assessment) await submitB2ExamSpeakingAudio(submissionId, form);
        else await submitB2ExerciseSpeakingAnswer(resourceId, form);
        markUploaded(key, answer);
      };
      // Moving forward saves this task; final submission also saves any revisited drafts.
      if (!finish) await upload(questions[index]);
      if (finish || (assessment && deadline <= Date.now())) {
        for (const item of questions) await upload(item);
        if (assessment) {
          await submitB2ExamSpeakingAudio(submissionId, new FormData());
          try { localStorage.removeItem(timerKey); } catch { /* Nothing else to clear. */ }
        } else await submitB2ExerciseSpeaking(resourceId);
        completed.current = true;
        navigate(results, { state: { submissionId } });
      } else setIndex((value) => value + 1);
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.alreadyCompleted) {
        completed.current = true;
        navigate(results, { state: { submissionId } });
      } else {
        setSubmitError("Couldn’t submit. Your recordings are still here. Keep this screen open and try again.");
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }, [submissionId, cancelSpeech, stop, questions, index, getClip, assessment, resourceId, markUploaded, deadline, timerKey, navigate, results]);

  useEffect(() => {
    if (!expired || busy || loading || fetchError || !questions.length || autoAttempted.current || completed.current) return;
    autoAttempted.current = true;
    submit(true);
  }, [expired, busy, loading, fetchError, questions.length, submit]);

  useQuestionPositionTelemetry({
    feature: assessment ? "b2.exam.speaking" : "b2.speaking", sectionType: "speaking", level: "B2",
    paperId: assessment ? resourceId : undefined, exerciseId: assessment ? undefined : resourceId,
    submissionId, question: block, currentIndex: index, totalQuestions: questions.length, loading,
  });

  const requestNext = () => {
    const missing = last ? questions.filter((item) => !getClip(String(item.id))).length : clip ? 0 : 1;
    if (missing) {
      setSkipCount(missing);
      actionTrigger.current = document.activeElement;
      skipDialog.current?.showModal();
    } else submit(last);
  };
  const start = () => {
    if (busy || expired) return;
    cancelSpeech();
    hapticMedium();
    recorder.start();
  };
  const readPrompt = () => {
    if (isSpeaking || isLoadingAudio) cancelSpeech();
    else {
      document.querySelector(".b2-speaking-recorder audio")?.pause();
      speakText(block.passage_text, "de-DE");
    }
  };

  if (loading) return <B2Page title="Speaking" back={back}><B2State loading /></B2Page>;
  if (fetchError || !questions.length) return <B2Page title="Speaking" back={back}><B2State title="Speaking tasks couldn’t load" description="Try again when you’re ready." onRetry={fetchContent} /></B2Page>;

  return (
    <main className="b2-ui b2-workspace b2-speaking-workspace">
      <B2WorkspaceHeader compact skill="speaking" assessment={assessment} index={index} total={questions.length}
        timeLeft={timeLeft} recording={capturing || recorder.hasUnsaved} onLeave={() => navigate(back)} />
      <div className="b2-speaking-body">
        <div className="b2-speaking-title">
          <h2>{block.block_title || "Your speaking task"}</h2>
          {block.passage_text && <button type="button" className="b2-speaking-read" onClick={readPrompt}
            disabled={capturing || busy || expired} aria-label={isSpeaking || isLoadingAudio ? "Stop reading prompt" : "Listen to prompt"} aria-pressed={isSpeaking}>
            {isLoadingAudio ? <Loader2 size={19} className="b2-record-spinner" /> : isSpeaking ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>}
        </div>
        {block.speaking_prompt_image && <img className="b2-speaking-image" src={block.speaking_prompt_image} alt="Speaking task illustration" />}
        {block.passage_text && <p className="b2-speaking-passage">{block.passage_text}</p>}
        {block.questions?.[0]?.question_text && <div className="b2-speaking-task">
          <strong>Your task</strong><p>{block.questions[0].question_text}</p>
        </div>}
        {expired && <p className="b2-note b2-note--warning" role="status">Time’s up. {busy ? "Submitting your recorded answers…" : "You can retry submitting your recorded answers."}</p>}
        <B2SpeakingRecorder recorder={recorder} limit={limit} disabled={busy || expired} onStart={start} onPlayback={cancelSpeech} />
        <div className="b2-speaking-actions" aria-label="Task actions">
          {submitError && <p className="b2-record-error" role="alert"><AlertCircle size={18} /><span>{submitError}</span></p>}
          {(clip || busy || expired) && <B2Button onClick={expired ? () => submit(true) : requestNext} disabled={busy || capturing}>
            {busy ? <><Loader2 size={18} className="b2-record-spinner" /> Submitting…</> : submitError ? "Try submitting again" : last || expired ? assessment ? "Submit section" : "Finish practice" : <>{clip?.uploaded ? "Next task" : "Save & next task"}<ArrowRight size={17} /></>}
          </B2Button>}
          {!clip && !busy && !capturing && !expired && <button className="b2-speaking-skip" type="button" onClick={requestNext}>{last ? "Skip and finish" : "Skip task"}</button>}
          {index > 0 && <B2Button variant="quiet" disabled={busy || capturing || expired} onClick={() => { setSubmitError(""); setIndex((value) => value - 1); }}>Previous task</B2Button>}
        </div>
      </div>
      <dialog ref={skipDialog} className="b2-ui b2-dialog" aria-labelledby="b2-speaking-skip-title" onClose={() => actionTrigger.current?.focus()}>
        <h2 id="b2-speaking-skip-title">{last ? "Finish with skipped answers?" : "Skip this task?"}</h2>
        <p>{skipCount} {skipCount === 1 ? "answer will" : "answers will"} be marked as skipped.</p>
        <B2Button onClick={() => skipDialog.current.close()}>Keep recording</B2Button>
        <B2Button variant="secondary" onClick={() => { skipDialog.current.close(); submit(last); }}>{last ? "Submit anyway" : "Skip task"}</B2Button>
      </dialog>
    </main>
  );
}
