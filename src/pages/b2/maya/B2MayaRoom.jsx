import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { startB2Maya, b2MayaRelayUrl } from "../../../api/b2MayaApi";
import { SpokenCaption } from "../../../utils/b2MayaCaption";
import { VoicePlayer } from "../../../utils/b2MayaVoice";
import useB2Access from "../../../hooks/useB2Access";
import { trackFeatureEvent } from "../../../telemetry/events";
import { useUsageLimitModule } from "../../../hooks/useUsageLimits";
import { suggestedTopics } from "./topicSuggestions";
import { BottomNav, Brand, Footer, Header, Icon, Main, MayaFrame, MayaLive, MayaMark, Title } from "./sp";

/*
 * The B2 speaking flow: choose a practice (and a topic for everyday talk), then the call dials
 * straight in. The call runs over the relay WebSocket; the report is its own view afterwards
 * (?session=…).
 */

/** Captures the microphone as 24 kHz mono PCM16 in ~100 ms chunks, the format Voice Live expects. */
const WORKLET = `
class Pcm16 extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Int16Array(2400); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0).buffer, []); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("pcm16", Pcm16);`;

/** Maya's question on screen: her last one or two sentences, starting cleanly at a sentence. */
function lastSentences(text, max = 220) {
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+["“”„]?\s*|$)/g) ?? [text];
  let out = sentences.slice(-2).join("").trimStart();
  if (sentences.length >= 3 && sentences[sentences.length - 1].trim().length < 12) out = sentences.slice(-3).join("").trimStart();
  if (out.length <= max) return out;
  const tail = out.slice(-max);
  return tail.slice(tail.indexOf(" ") + 1);
}

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const clock = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

/** Bar heights (px, at full voice) of the waveforms either side of Maya and of the mic. */
const STAGE_LEFT = [14, 26, 20, 40, 32, 58, 84];
const STAGE_RIGHT = [80, 54, 36, 48, 24, 30, 12];
const MIC_LEFT = [8, 14, 22, 12, 18, 26, 16];
const MIC_RIGHT = [16, 26, 18, 12, 22, 14, 8];
const Wave = ({ heights }) => (
  <span className="wave" aria-hidden="true">
    {heights.map((h, i) => (
      <i key={i} style={{ "--h": `${h}px`, "--i": i }} />
    ))}
  </span>
);

export default function B2MayaRoom({ meta, focus }) {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  // Fresh lock state on entry; a locked learner gets the limit modal before the call dials, not after.
  useUsageLimitModule("B2", "maya");
  const access = useB2Access();
  const { level, coachName, firstName, modes, minutes: minutesMap, topics, words } = meta;
  const hasInterview = modes.length > 1;
  // Focused follow-ups skip the mode and topic picks and dial straight in.
  const [screen, setScreen] = useState(focus ? "connecting" : "choose");
  const [mode, setMode] = useState(modes[0]);
  const interview = mode !== "talk";
  const [topic, setTopic] = useState(""); // "" = General Conversation
  const [customTopic, setCustomTopic] = useState("");
  // Consent is asked once, on the practice screen; returning learners find the box already ticked.
  const [consent, setConsent] = useState(Boolean(meta.consented));
  const [noisyRoom, setNoisyRoom] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("thinking");
  const [userTalking, setUserTalking] = useState(false);
  const [caption, setCaption] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [flash, setFlash] = useState(null);
  const [greeting, setGreeting] = useState(true);
  const minutes = focus ? 3 : minutesMap[mode];
  const topicLabel = focus ? "Your focused follow-up" : topic || customTopic.trim() || "General Conversation";
  const modeName = interview ? "Nursing interview" : "Everyday German";

  const streamRef = useRef(null);
  const ctxRef = useRef(null);
  const wsRef = useRef(null);
  const tickRef = useRef(null);
  const spokenRef = useRef(new SpokenCaption());
  const captionTimerRef = useRef(null);
  const replyRef = useRef(null);
  const playerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const endedRef = useRef(false);
  const focusStartedRef = useRef(false);
  const liveRef = useRef(null);
  const cardRef = useRef(null);
  const levelsRef = useRef({ coach: 0, you: 0 });
  const answeredRef = useRef(false);
  const wakeLockRef = useRef(null);
  const liveAtRef = useRef(0);
  const sessionIdRef = useRef(null);

  // Same event names as B1's call so the shared Maya funnel lines up; never the topic text itself.
  const trackCall = (event, extra = {}) =>
    trackFeatureEvent("maya", event, {
      feature: "b2.maya",
      entityType: "maya_session",
      ...extra,
      attributes: { level: "B2", mode: focus ? "focus" : mode, ...extra.attributes },
    });
  const elapsedMs = () => (liveAtRef.current ? Date.now() - liveAtRef.current : 0);

  // A sleeping display kills the mic mid-call. The OS auto-releases the lock
  // when the app hides — `released` flips on the still-truthy sentinel.
  const requestWakeLock = async () => {
    if (!("wakeLock" in navigator)) return;
    if (wakeLockRef.current && !wakeLockRef.current.released) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch { /* unsupported or denied — the call still works */ }
  };

  const cleanup = () => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    if (captionTimerRef.current) clearInterval(captionTimerRef.current);
    captionTimerRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    if (wsRef.current && wsRef.current.readyState <= 1) wsRef.current.close();
    streamRef.current = null;
    ctxRef.current = null;
    wsRef.current = null;
  };
  useEffect(() => () => cleanup(), []);

  /** Smooths a voice level (fast up, slower down) and draws it on the call screen as --lvl-coach / --lvl-you. */
  const showLevel = (who, rms) => {
    const target = Math.min(1, Math.max(0, Math.sqrt(rms) * 2.6 - 0.14));
    const prev = levelsRef.current[who];
    const v = target > prev ? prev * 0.3 + target * 0.7 : prev * 0.78 + target * 0.22;
    levelsRef.current[who] = v;
    liveRef.current?.style.setProperty(`--lvl-${who}`, v.toFixed(3));
  };

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove("over");
    el.classList.toggle("over", el.scrollHeight > el.clientHeight + 1);
  });

  // A short buzz on phones that support it when the turn passes to the learner (like a walkie-talkie).
  const handedOver = screen === "live" && status === "listening" && !userTalking && !muted;
  useEffect(() => {
    if (handedOver && answeredRef.current) navigator.vibrate?.(40);
  }, [handedOver]);

  // If a reply never comes after an answer (the turn detector heard a noise, say), hand the turn back.
  useEffect(() => {
    if (screen !== "live" || status !== "thinking" || !answeredRef.current) return;
    const t = setTimeout(() => setStatus((s) => (s === "thinking" ? "listening" : s)), 8000);
    return () => clearTimeout(t);
  }, [screen, status]);

  // The screen must not sleep while a call is up — connecting and live both.
  useEffect(() => {
    const inCall = screen === "connecting" || screen === "live";
    if (inCall) requestWakeLock();
    else {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    }
    const onVis = () => {
      if (document.visibilityState === "visible" && inCall) requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [screen]);

  const audioConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
  const micDenied = (e) => e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");

  // Where "back" lands before a call is live: the topic pick, the mode pick, or — for a focused
  // follow-up, which has no in-room screens — its pre-screen (explicit URL, not history pop,
  // because a deep link has no in-app page to go back to).
  const backToStart = () =>
    focus ? navigate(`/b2/maya?focus=${focus.sessionId}&i=${focus.index}`, { replace: true }) : setScreen(interview ? "choose" : "topics");

  const start = async () => {
    setError(null);
    endedRef.current = false;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    } catch (e) {
      if (micDenied(e)) setScreen("mic-blocked");
      else {
        setError("We couldn't use your microphone. Check it's connected, then try again.");
        setScreen("failed");
      }
      return;
    }
    streamRef.current = stream;
    trackCall("call_started", { lifecycle: "started" });
    liveAtRef.current = 0;
    setMuted(false);
    setSheet(null);
    setScreen("connecting");
    setSeconds(0);
    setCaption("");
    setGreeting(true);
    setUserTalking(false);
    answeredRef.current = false;
    let greeted = false;
    playerRef.current = new VoicePlayer({
      onStart: () => {
        spokenRef.current.audio(1, Date.now());
        if (!greeted) {
          greeted = true;
          setTimeout(() => setGreeting(false), 2500);
        }
      },
      onEnd: () => {},
    });
    void playerRef.current.resume();
    const request = focus ? { focus: { sessionId: focus.sessionId, index: focus.index } } : !interview && (topic || customTopic.trim()) ? { topic: topic || customTopic.trim() } : {};
    let res;
    try {
      res = await startB2Maya({ consent, mode: focus ? "talk" : mode, ...request });
    } catch (e) {
      cleanup();
      setError(e?.response?.data?.msg || "We couldn't start the practice. Please try again.");
      // A focused follow-up has no screen to land back on — show the failure here instead.
      if (focus) setScreen("failed");
      else backToStart();
      return;
    }
    setSessionId(res.sessionId);
    sessionIdRef.current = res.sessionId;
    try {
      const ctx = new AudioContext({ sampleRate: 24000 });
      ctxRef.current = ctx;
      if (ctx.state !== "running") await ctx.resume().catch(() => {});
      const workletUrl = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);
      const node = new AudioWorkletNode(ctx, "pcm16");
      ctx.createMediaStreamSource(stream).connect(node);
      const wsUrl = b2MayaRelayUrl();
      const ws = new WebSocket(wsUrl);
      // The sealed ticket goes as the first message, not the URL — it's ~9 KB, over nginx's
      // request-line limit, and URLs shouldn't carry sealed credentials anyway.
      ws.onopen = () => ws.send(JSON.stringify({ type: "maya.auth", ticket: res.ticket }));
      ws.onerror = () => console.error("[maya] ws failed:", wsUrl);
      wsRef.current = ws;
      node.port.onmessage = (e) => {
        const pcm = new Int16Array(e.data);
        let sum = 0;
        for (let i = 0; i < pcm.length; i += 2) sum += (pcm[i] / 32768) ** 2;
        showLevel("you", Math.sqrt(sum / Math.max(1, pcm.length / 2)));
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: toBase64(e.data) }));
      };
      ws.onmessage = async (ev) => {
        const m = JSON.parse(ev.data);
        if (m.type === "session.updated") {
          if (captionTimerRef.current) return;
          goLive();
          ws.send(JSON.stringify({ type: "coach.ready" }));
        } else if (m.type === "response.audio.delta") {
          if (!replyRef.current || m.response_id === replyRef.current) playerRef.current?.push(String(m.delta ?? ""));
        } else if (m.type === "input_audio_buffer.speech_started") {
          spokenRef.current.stop(Date.now());
          playerRef.current?.interrupt();
          setStatus("listening");
          answeredRef.current = true;
          setUserTalking(true);
        } else if (m.type === "input_audio_buffer.speech_stopped") {
          setStatus("thinking");
          setUserTalking(false);
        } else if (m.type === "response.created") {
          replyRef.current = m.response?.id ?? null;
          spokenRef.current.reset(Date.now());
          setUserTalking(false);
          setStatus("speaking");
        } else if (m.type === "response.audio_transcript.delta") {
          if (!replyRef.current || m.response_id === replyRef.current) spokenRef.current.textDelta(m.delta ?? "", Date.now());
        } else if (m.type === "response.audio_timestamp.delta") {
          if ((!replyRef.current || m.response_id === replyRef.current) && m.timestamp_type !== "viseme")
            spokenRef.current.word(String(m.text ?? ""), Number(m.audio_offset_ms) || 0, Date.now(), Number(m.audio_duration_ms) || 0);
        } else if (m.type === "response.done") spokenRef.current.finish();
        else if (m.type === "room.noise") setNoisyRoom(Boolean(m.noisy));
        else if (m.type === "turn.ended") {
          setStatus("thinking");
          setUserTalking(false);
        }
        else if (m.type === "coach.answer") {
          const a = m;
          if (a.language === "target" && a.smoothness === "smooth" && a.words >= 12) {
            setFlash("thumbsup");
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
            flashTimerRef.current = setTimeout(() => setFlash(null), 2200);
          }
        } else if (m.type === "interview.ended") finished(res.sessionId);
        else if (m.type === "error") setError(m.message);
      };
      ws.onclose = (ev) => {
        if (endedRef.current) return;
        console.error("[maya] ws closed:", ev.code, ev.reason || "(no reason)");
        // Live and not ended by the relay: the connection dropped mid-call.
        if (liveAtRef.current)
          trackCall("call_ended", { entityId: res.sessionId, elapsedMs: elapsedMs(), lifecycle: "failed", outcome: "dropped", reasonCode: String(ev.code) });
        // 4xxx: the relay refused the call; 1012: the server is restarting. Both carry a reason to show.
        if (ev.code >= 4000 || ev.code === 1012) {
          setError(ev.reason || "The practice couldn't start.");
          setScreen("failed");
          cleanup();
          return;
        }
        setScreen((s) => {
          if (s === "connecting") {
            setError("We couldn't reach Maya. Check your internet connection, then try again.");
            cleanup();
            return "failed";
          }
          if (s === "live") {
            cleanup();
            return "dropped";
          }
          return s;
        });
      };
    } catch {
      setError("We couldn't start the call. Check your microphone and connection, then try again.");
      setScreen("failed");
      cleanup();
    }
  };

  /** The call has ended: the report view takes over (it waits for the feedback). */
  const finished = (id) => {
    endedRef.current = true;
    trackCall("call_ended", { entityId: id, elapsedMs: elapsedMs(), lifecycle: "succeeded" });
    cleanup();
    navigate(`/b2/maya?session=${encodeURIComponent(id)}`);
  };

  const goLive = () => {
    setScreen("live");
    const t0 = Date.now();
    liveAtRef.current = t0;
    trackCall("call_connected", { entityId: sessionIdRef.current, lifecycle: "succeeded" });
    tickRef.current = setInterval(() => setSeconds(Math.round((Date.now() - t0) / 1000)), 1000);
    captionTimerRef.current = setInterval(() => {
      const now = Date.now();
      const voice = playerRef.current ? playerRef.current.level() : 0;
      if (playerRef.current) spokenRef.current.audio(voice, now);
      showLevel("coach", voice);
      const text = spokenRef.current.current(now).replace(/[*`]+|__/g, "");
      if (text) setCaption(lastSentences(text));
      if (spokenRef.current.finishedSpeaking(now))
        setStatus((s) => {
          if (s === "speaking") setGreeting(false);
          return s === "speaking" ? "listening" : s;
        });
    }, 60);
  };

  const toggleMute = () => {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };
  const cancel = () => {
    endedRef.current = true;
    cleanup();
    backToStart();
  };

  // A focused follow-up has already passed its own Start button — dial straight in on mount.
  useEffect(() => {
    if (!focus || focusStartedRef.current) return;
    focusStartedRef.current = true;
    if (access("maya")) void start();
    else backToStart();
  });

  if (screen === "connecting")
    return (
      <>
        <Header title="Connecting" onBack={cancel} />
        <Main>
          <div className="call-avatar connecting-avatar">
            <MayaMark pose="smiling" user={user} />
          </div>
          <div className="center">
            <Title text={<>{coachName} will be<br />right with you.</>} desc="Getting your conversation ready." />
            <div className="call-status">
              <span className="spinner" /> Connecting…
            </div>
          </div>
          <div className="info-note">
            {interview ? "Your interview will begin with a short introduction." : "You don’t need a perfect first sentence. A simple “Hallo” is a good start."}
          </div>
        </Main>
        <Footer>
          <button key="cancel" type="button" className="secondary" onClick={cancel}>
            Cancel
          </button>
        </Footer>
      </>
    );

  if (screen === "live") {
    const speaking = status === "speaking";
    const pose = flash ?? (speaking ? (greeting ? "wave" : "smiling") : "looking");
    // Walkie-talkie turn signal: green on whoever's talking, amber while Maya thinks.
    const turn = muted ? "muted" : speaking ? "coach" : userTalking ? "you" : status === "listening" ? "yours" : "thinking";
    const coachLabel = {
      muted: "Microphone muted",
      coach: `${coachName} is talking`,
      yours: `${coachName} is listening`,
      you: `${coachName} is listening`,
      thinking: `${coachName} is thinking`,
    }[turn];
    const micLabel = {
      muted: "Your microphone is off",
      coach: `Wait for ${coachName}`,
      yours: `Your turn, ${firstName}. Speak now`,
      you: "Listening to you…",
      thinking: `Wait for ${coachName}`,
    }[turn];
    return (
      <div ref={liveRef} className={`call-live turn-${turn} ${noisyRoom ? "noisy" : ""}`}>
        <div className="call-top">
          <div>
            <strong>{focus ? "Focused practice" : modeName}</strong>
            <small>{interview ? "Job interview · Pflegefachkraft" : topicLabel}</small>
          </div>
          <span className="time" aria-label="Time">
            {clock(seconds)} / {String(minutes).padStart(2, "0")}:00
          </span>
        </div>
        <Main className="call-content">
          <section className={`tile tile-coach ${turn === "coach" ? "on" : ""} ${turn === "thinking" ? "thinking" : ""}`} aria-label={coachName}>
            <div className="stage">
              <Wave heights={STAGE_LEFT} />
              <div className="stage-ring">
                <MayaLive pose={pose} user={user} />
              </div>
              <Wave heights={STAGE_RIGHT} />
            </div>
            <div className="turn-pill" role="status">
              <b />
              {coachLabel}
            </div>
          </section>
          <div className={`call-question ${turn === "coach" ? "live" : ""}`}>
            <small>{coachName.toUpperCase()}</small>
            <blockquote ref={cardRef} lang="de" aria-live="polite">
              {caption ? (
                <span>{caption}</span>
              ) : (
                <span className="card-dots" aria-label="Waiting">
                  <i />
                  <i />
                  <i />
                </span>
              )}
            </blockquote>
          </div>
          <section className={`tile tile-you ${turn === "yours" || turn === "you" ? "on" : ""}`} aria-label={firstName}>
            {noisyRoom ? (
              <div className="noise-note" role="status">
                It’s noisy around you. Tap “I’m done” after each answer.
                <button type="button" className="text-button" onClick={() => wsRef.current?.send(JSON.stringify({ type: "turn.end" }))} disabled={speaking}>
                  I’m done
                </button>
              </div>
            ) : null}
            <div className="turn-mic-row" aria-hidden="true">
              <Wave heights={MIC_LEFT} />
              <span className="turn-mic-button">
                <Icon name={muted ? "muted" : "mic"} />
              </span>
              <Wave heights={MIC_RIGHT} />
            </div>
            <p className="turn-mic-label">{micLabel}</p>
          </section>
          {error ? (
            <p className="inline-error" role="alert">
              {error}
            </p>
          ) : null}
        </Main>
        <div className="call-controls">
          <button type="button" className={`call-control ${muted ? "on" : ""}`} onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Unmute microphone" : "Mute microphone"}>
            <b>
              <Icon name={muted ? "muted" : "mic"} />
            </b>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" className="call-control" onClick={() => wsRef.current?.send(JSON.stringify({ type: "coach.repeat" }))} disabled={speaking}>
            <b>
              <Icon name="repeat" />
            </b>
            Repeat
          </button>
          {interview ? null : (
            <button type="button" className="call-control" onClick={() => setSheet("help")}>
              <b>
                <Icon name="book" />
              </b>
              Need a word
            </button>
          )}
          <button type="button" className="call-control end" onClick={() => setSheet("end")}>
            <b>
              <Icon name="end" />
            </b>
            Finish
          </button>
        </div>
        <p className="call-footer">{coachName} is an AI coach · {interview ? "Your coaching comes after the interview" : "Voice only"}</p>
        {sheet ? (
          <div className="overlay" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
            {sheet === "help" ? (
              <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="help-title">
                <div className="sheet-handle" />
                <button type="button" className="icon-button sheet-close" onClick={() => setSheet(null)} aria-label="Close word help">
                  <Icon name="close" />
                </button>
                <h2 id="help-title">A word to keep you going.</h2>
                <p>
                  You can always ask {coachName} aloud:
                  <br />
                  <span lang="de">„Wie sagt man … auf Deutsch?“</span>
                </p>
                {(words?.length ? words.slice(0, 3) : HELP_PHRASES).map((w) => (
                  <div className="hint-card" key={w.german}>
                    <small>{words?.length ? "A word you’re learning" : "Useful in any conversation"}</small>
                    <strong lang="de">{w.german}</strong>
                    <p>{w.english}</p>
                  </div>
                ))}
                <button type="button" className="primary" onClick={() => setSheet(null)}>
                  Back to our conversation
                </button>
              </section>
            ) : (
              <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="end-title">
                <div className="sheet-handle" />
                <h2 id="end-title">Finish for today?</h2>
                <p>{coachName} will review your conversation and put together your feedback.</p>
                <div className="context-row">
                  <Icon name="clock" />
                  <div>
                    <strong>Every conversation is practice</strong>
                    <small>You can come back for another anytime.</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setSheet(null);
                    wsRef.current?.send(JSON.stringify({ type: "interview.end" }));
                  }}
                >
                  Finish &amp; see feedback
                </button>
                <button type="button" className="text-button full" onClick={() => setSheet(null)}>
                  Keep talking
                </button>
              </section>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  if (screen === "dropped")
    return (
      <>
        <Header title="Conversation paused" />
        <Main>
          <div className="device-hero warning">
            <Icon name="wifi" />
          </div>
          <Title text={<>The connection<br />dropped.</>} desc="Check your internet connection. What you said before the drop is usually saved." />
          <div className="context-row">
            <MayaMark user={user} />
            <div>
              <strong>Your conversation</strong>
              <small>
                {focus ? "Focused practice" : interview ? "Nursing interview" : topicLabel} · {clock(seconds)}
              </small>
            </div>
          </div>
          <div className="info-note">Your last words may not have reached {coachName}. You can see feedback for what was saved, or start a new conversation.</div>
        </Main>
        <Footer>
          {sessionId ? (
            <button type="button" className="primary" onClick={() => navigate(`/b2/maya?session=${encodeURIComponent(sessionId)}`)}>
              See my feedback
              <Icon name="arrow" />
            </button>
          ) : null}
          <button type="button" className="text-button full" onClick={backToStart}>
            Start a new conversation
          </button>
        </Footer>
      </>
    );

  if (screen === "failed")
    return (
      <>
        <Header title="Something went wrong" onBack={backToStart} />
        <Main>
          <div className="device-hero warning">
            <Icon name="info" />
          </div>
          <Title text="We couldn’t start the conversation." desc={error ?? "Please try again in a moment."} />
        </Main>
        <Footer>
          <button type="button" className="primary" onClick={backToStart}>
            Try again
            <Icon name="repeat" />
          </button>
        </Footer>
      </>
    );

  if (screen === "topics") {
    const suggestions = suggestedTopics(customTopic, 3);
    return (
      <>
        <Header title="Your conversation" onBack={() => setScreen("choose")} />
        <Main>
          <Title text="What’s on your mind?" desc="Pick a topic you feel like talking about." />
          <div className="topic-grid" role="group" aria-label="Conversation topic">
            <button
              type="button"
              className={`topic ${!topic && !customTopic.trim() ? "selected" : ""}`}
              aria-pressed={!topic && !customTopic.trim()}
              onClick={() => {
                setTopic("");
                setCustomTopic("");
              }}
            >
              <Icon name="shuffle" />
              General Conversation
            </button>
            {topics.map((t) => (
              <button
                type="button"
                key={t.id}
                className={`topic ${topic === t.label ? "selected" : ""}`}
                aria-pressed={topic === t.label}
                onClick={() => {
                  setTopic(topic === t.label ? "" : t.label);
                  setCustomTopic("");
                }}
              >
                <Icon name={t.icon} />
                {t.label}
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="custom-topic">
            Or bring your own topic
          </label>
          <input
            id="custom-topic"
            className="input"
            maxLength={100}
            placeholder="e.g. My favourite festival"
            value={customTopic}
            onChange={(e) => {
              setCustomTopic(e.target.value);
              if (e.target.value.trim()) setTopic("");
            }}
          />
          {suggestions.length ? (
            <div className="topic-drop" role="listbox" aria-label="Suggested topics">
              {suggestions.map((t) => (
                <button
                  type="button"
                  key={t}
                  role="option"
                  aria-selected="false"
                  className="topic-option"
                  onClick={() => {
                    setCustomTopic(t);
                    setTopic("");
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : null}
          <div className="info-note">{coachName} will follow your pace and help you find the words.</div>
          {error ? (
            <p className="inline-error" role="alert">
              {error}
            </p>
          ) : null}
        </Main>
        <Footer note={`About ${minutes} minutes · ${level} practice`}>
          <button
            type="button"
            className="primary"
            onClick={() => {
              trackCall("topic_selected", { attributes: { selection_code: topic ? "suggested" : customTopic.trim() ? "custom" : "general" } });
              if (access("maya")) void start();
            }}
          >
            Start with {coachName}
            <Icon name="arrow" />
          </button>
        </Footer>
      </>
    );
  }

  if (screen === "mic-blocked")
    return (
      <>
        <Header title="Microphone access" onBack={backToStart} />
        <Main>
          <div className="device-hero warning">
            <Icon name="muted" />
          </div>
          <Title text={<>Your microphone<br />needs permission.</>} desc="Maya can’t hear you yet. You can turn on access in your device settings." />
          <ol className="numbered">
            <li>Open the site or app settings for Skillcase.</li>
            <li>Find Microphone and choose Allow.</li>
            <li>Return here and try again.</li>
          </ol>
          <div className="info-note">If access is already allowed, check your device settings or close other apps using the microphone.</div>
        </Main>
        <Footer>
          <button type="button" className="primary" onClick={() => void start()}>
            Try microphone again
            <Icon name="repeat" />
          </button>
          <button type="button" className="text-button full" onClick={backToStart}>
            Back to practice
          </button>
        </Footer>
      </>
    );

  /* "choose": the start screen — the mode selection the feature card opens. */
  const card = (id, name, copy, metaText, ico) => (
    <button type="button" key={id} className={`mode ${mode === id ? "active" : ""}`} role="radio" aria-checked={mode === id} onClick={() => setMode(id)}>
      <span className="mode-symbol">
        <Icon name={ico} />
      </span>
      <span className="mode-copy">
        <span className="mode-title">{name}</span>
        <span className="mode-description">{copy}</span>
        <span className="mode-meta">{metaText}</span>
      </span>
      <span className="radio-mark" aria-hidden="true" />
    </button>
  );
  return (
    <>
      <Brand level={level} />
      <Main className="flush-top">
        <div className="intro welcome-intro">
          <p className="eyebrow">Guten Tag, {firstName}</p>
          <div className="welcome-heading">
            <h1>
              Speak German
              <br />
              with {coachName}
            </h1>
            <MayaFrame pose="wave" className="welcome-maya" user={user} />
          </div>
          <p>Build confidence in German with your AI speaking coach.</p>
        </div>
        <div className="section-label">{hasInterview ? "What would you like to practise?" : "Your practice"}</div>
        <div role="radiogroup" aria-label="Practice mode">
          {card("talk", "Everyday German", "Talk about everyday life and whatever interests you.", `Live tips · About ${minutesMap.talk} min`, "chat")}
          {hasInterview ? card(modes[1], "Nursing interview", "Get comfortable with a job interview in Germany.", `Feedback after · About ${minutesMap[modes[1]]} min`, "bag") : null}
        </div>
        {meta.consented ? null : (
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I understand that Maya is AI. My conversation will be transcribed, and Skillcase will keep the transcript and feedback to track my progress.</span>
          </label>
        )}
        {error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : null}
      </Main>
      <Footer note={consent ? "Voice only. Your camera stays off." : "Tick the box to continue."}>
        <button
          type="button"
          className="primary gold"
          disabled={!consent}
          onClick={() => {
            if (!access("maya")) return;
            if (interview) void start();
            else setScreen("topics");
          }}
        >
          {interview ? "Start the interview" : "Let’s practise"}
          <Icon name="arrow" />
        </button>
      </Footer>
      <BottomNav current="practice" />
    </>
  );
}

/** "Need a word?" when the learner has no words in their word bank yet. */
const HELP_PHRASES = [
  { german: "Wie sagt man … auf Deutsch?", english: "How do you say … in German?" },
  { german: "Können Sie das bitte wiederholen?", english: "Could you repeat that, please?" },
  { german: "Langsamer, bitte.", english: "Slower, please." },
];
