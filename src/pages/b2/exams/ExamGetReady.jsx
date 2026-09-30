import { trackB2Action } from "../../../utils/b2Telemetry";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Headphones,
  Mic,
  Clock3,
  ArrowRight,
  Check,
  Volume2,
} from "lucide-react";
import { getB2TestOverview, startB2ExamSubmission } from "../../../api/b2Api";
import useB2Access from "../../../hooks/useB2Access";
import {
  B2Page,
  B2Button,
  B2SkillStrip,
  B2State,
} from "../../../components/b2/B2UI";
export default function ExamGetReady({
  overview: overviewProp,
  onBack,
  onStarted,
} = {}) {
  const navigate = useNavigate(),
    open = useB2Access();
  const [overview, setOverview] = useState(overviewProp ?? null),
    [loading, setLoading] = useState(!overviewProp),
    [error, setError] = useState(""),
    [starting, setStarting] = useState(false),
    [mic, setMic] = useState(""),
    [audioChecked, setAudioChecked] = useState(false);
  const startingRef = useRef(false),
    mounted = useRef(true);
  const load = () => {
    setLoading(true);
    setError("");
    getB2TestOverview()
      .then((r) => setOverview(r.data))
      .catch(() =>
        setError("We couldn’t load your assessment. Please try again."),
      )
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    mounted.current = true;
    if (!overviewProp) load();
    return () => {
      mounted.current = false;
    };
  }, [overviewProp]);
  const next = overview?.nextPaper;
  const checkMic = async () => {
    setMic("checking");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      if (mounted.current) setMic("ready");
    } catch {
      if (mounted.current) setMic("denied");
    }
  };
  const checkAudio = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      await ctx.resume();
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.frequency.value = 523;
      gain.gain.value = 0.12;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => ctx.close();
      setAudioChecked(true);
    } catch {
      setError("Sound could not play. Check your device’s audio settings.");
    }
  };
  const begin = async () => {
    if (startingRef.current || !next || !open("exams")) return;
    startingRef.current = true;
    setStarting(true);
    setError("");
    try {
      await startB2ExamSubmission(next.paperId);
      trackB2Action(
        next.inProgress ? "assessment_resumed" : "assessment_started",
        { mode: "assessment", entityId: next.paperId, source: "preparation" },
      );
      onStarted?.();
      navigate(`/b2/exams/papers/${next.paperId}/dashboard`, { replace: true });
    } catch (e) {
      if (e.response?.status === 403 && e.response?.data?.alreadyCompleted) {
        onStarted?.();
        navigate(`/b2/exams/papers/${next.paperId}/congratulations`, {
          replace: true,
        });
      } else {
        setError(
          e.response?.status === 402
            ? "Your assessment limit has been reached. You can return to practice."
            : "Your test couldn’t start. Please try again.",
        );
        startingRef.current = false;
        setStarting(false);
      }
    }
  };
  return (
    <div className={onBack ? "b2-ui b2-welcome" : undefined}>
      <B2Page
        className="b2-preparation"
        title="Test preparation"
        back="/b2/test"
        onBack={onBack}
      >
        {loading ? (
          <B2State loading />
        ) : !next ? (
          <B2State
            title={error ? "Your test didn’t load" : "You’re all caught up"}
            description={
              error || "Practise a skill while you wait for your next test."
            }
            onRetry={error ? load : () => navigate("/")}
          />
        ) : (
          <div className="b2-content">
            <div className="b2-stack">
              <span className="b2-eyebrow">
                {next.inProgress
                  ? "In progress"
                  : `Assessment ${(overview.completed ?? 0) + 1}${overview.total ? ` of ${overview.total}` : ""}`}
              </span>
              <h1>
                {next.inProgress ? "Resume your test" : "Ready for your test?"}
              </h1>
              <B2SkillStrip />
            </div>
            <div className="b2-panel">
              <h2>Before you begin</h2>
              <ul className="b2-steps">
                <li>
                  <span className="b2-icon">
                    <Clock3 size={20} />
                  </span>
                  <div>
                    <strong>
                      {next.durationMinutes > 0
                        ? `${next.durationMinutes} min total`
                        : "Timed sections"}
                    </strong>
                    <p>
                      Each section is timed. The timer keeps running if you
                      leave.
                    </p>
                  </div>
                </li>
                <li>
                  <span className="b2-icon">
                    <Headphones size={20} />
                  </span>
                  <div className="b2-grow">
                    <strong>Check your sound</strong>
                    <p>Use headphones in a quiet place.</p>
                    <button className="b2-back" onClick={checkAudio}>
                      {audioChecked ? (
                        <Check size={17} />
                      ) : (
                        <Volume2 size={17} />
                      )}{" "}
                      {audioChecked ? "Replay sound" : "Test sound"}
                    </button>
                  </div>
                </li>
                <li>
                  <span className="b2-icon">
                    <Mic size={20} />
                  </span>
                  <div className="b2-grow">
                    <strong>Microphone access</strong>
                    <p>Required for Speaking. You can allow access later.</p>
                    <button
                      className="b2-back"
                      onClick={checkMic}
                      disabled={mic === "checking"}
                    >
                      {mic === "ready" ? (
                        <Check size={17} />
                      ) : (
                        <Mic size={17} />
                      )}{" "}
                      {mic === "ready"
                        ? "Microphone ready"
                        : mic === "checking"
                          ? "Checking…"
                          : "Check microphone"}
                    </button>
                    {mic === "denied" && (
                      <p role="alert" className="b2-note b2-note--warning">
                        Microphone access is unavailable. Allow it in your
                        browser settings before Speaking.
                      </p>
                    )}
                  </div>
                </li>
              </ul>
            </div>
            <div className="b2-note">
              Unanswered questions count as skipped. Text drafts save here;
              submit recordings before leaving.
            </div>
            {error && (
              <p role="alert" className="b2-note b2-note--error">
                {error}
              </p>
            )}
            <div className="b2-prep-actions">
              <B2Button onClick={begin} disabled={starting}>
                {starting
                  ? "Opening test…"
                  : next.inProgress
                    ? "Resume test"
                    : "Start test"}
                <ArrowRight size={18} />
              </B2Button>
            </div>
          </div>
        )}
      </B2Page>
    </div>
  );
}
