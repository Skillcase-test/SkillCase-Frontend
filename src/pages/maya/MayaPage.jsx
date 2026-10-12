import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getB2MayaMeta, getB2MayaProgress, getB2MayaSession, getB2MayaSessions } from "../../../api/b2MayaApi";
import B2MayaRoom from "./B2MayaRoom";
import { Feedback, FeedbackError, Focus, NoSpeech, Processing, ProgressPage, Transcript } from "./B2MayaScreens";
import { feedbackReason } from "./mayaFormat";
import { Footer, Icon, Main, Title } from "./sp";
import "./b2Maya.css";

/**
 * Talk to Maya (B2): the room by default; ?view=progress for My progress; ?session=… for a
 * practice's report (&view=transcript for the conversation); ?focus=…&i=… for a focused
 * follow-up of one correction (&start=1 to start it). While a report is still being written
 * the page re-fetches every few seconds.
 */

/** A report still not ready after this stops polling (the server marks lost calls as abandoned). */
const POLL_LIMIT_MS = 10 * 60_000;
/** How long an unreachable server (e.g. restarting after a deploy) is retried before saying so. */
const UNREACHABLE_LIMIT_MS = 90_000;

const heardIt = (p) => (p.heard !== undefined ? p.heard : (p.transcript ?? []).some((l) => l.speaker === "candidate"));
const kindOf = (p) => (!heardIt(p) || feedbackReason(p.feedback) === "too_little_speech" ? "attempt" : p.feedback ? "completed" : "pending");

function Missing({ text }) {
  return (
    <>
      <Main>
        <div className="device-hero warning">
          <Icon name="info" />
        </div>
        <Title text="We couldn’t find that." desc={text} />
      </Main>
      <Footer>
        <Link className="primary" to="/b2/maya">
          Back to practice
        </Link>
      </Footer>
    </>
  );
}

const Loading = () => (
  <Main>
    <div role="status" aria-label="Loading">
      <div className="skel" style={{ width: 100, height: 100, borderRadius: "50%", margin: "28px auto 26px" }} />
      <div className="skel" style={{ height: 24, width: "65%", margin: "0 auto 12px" }} />
      <div className="skel" style={{ height: 12, width: "80%", margin: "0 auto 8px" }} />
      <div className="skel" style={{ height: 12, width: "55%", margin: "0 auto 28px" }} />
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            height: 74,
            borderRadius: 18,
            border: "1px solid var(--line)",
            background: "white",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 16px",
          }}
        >
          <span className="skel" style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            <span className="skel" style={{ display: "block", height: 12, width: "60%", marginBottom: 8 }} />
            <span className="skel" style={{ display: "block", height: 10, width: "80%" }} />
          </span>
        </div>
      ))}
    </div>
  </Main>
);

export default function B2MayaPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session");
  const focusId = params.get("focus");
  const view = params.get("view");
  const wantsTranscript = view === "transcript";
  const wantsProgress = view === "progress";
  const filter = params.get("filter") === "Completed" || params.get("filter") === "Attempts" ? params.get("filter") : "All";

  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState(false);
  const [session, setSession] = useState(null); // {session, best} for ?session= and ?focus=
  const [sessionMissing, setSessionMissing] = useState(false);
  const [rows, setRows] = useState(null);
  const [progress, setProgress] = useState(null);
  const [stalled, setStalled] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const pollRef = useRef(null);

  // The room's fixed data (modes, topics, minutes, word bank, names) — needed before any call screen.
  const needsMeta = !sessionId && !wantsProgress;
  useEffect(() => {
    if (!needsMeta) return;
    let on = true;
    getB2MayaMeta()
      .then((m) => on && setMeta(m))
      .catch(() => on && setMetaError(true));
    return () => {
      on = false;
    };
  }, [needsMeta]);

  // ?session=… (report) and ?focus=… (the correction it follows up) both load one session.
  const loadId = sessionId ?? focusId;
  const loadSession = useCallback(
    (id) =>
      getB2MayaSession(id)
        .then((data) => {
          setSessionMissing(false);
          setLoadFailed(false);
          setSession(data);
          return data.session;
        })
        // Only a 404 means it's gone (null); anything else — offline, server restarting — is
        // unreachable (undefined) and retried.
        .catch((e) => {
          if (e?.response?.status === 404) {
            setSessionMissing(true);
            return null;
          }
          setLoadFailed(true);
          return undefined;
        }),
    [],
  );

  useEffect(() => {
    setSession(null);
    setSessionMissing(false);
    setLoadFailed(false);
    setStalled(false);
    const stop = () => {
      clearInterval(pollRef.current);
      pollRef.current = null;
    };
    stop();
    if (!loadId) return;
    let active = true;
    loadSession(loadId).then((s) => {
      if (!active || !sessionId || s === null) return; // focus doesn't poll; a missing session never will
      // A report that's still being written re-fetches until the feedback lands; an unreachable
      // server (s undefined) is retried the same way, for a shorter while.
      const pending = s && (s.status === "started" || (heardIt(s) && !s.feedback?.ok && feedbackReason(s.feedback) !== "too_little_speech" && feedbackReason(s.feedback) !== "failed"));
      if (s && !pending) return;
      const t0 = Date.now();
      let loaded = Boolean(s);
      pollRef.current = setInterval(() => {
        if (Date.now() - t0 > (loaded ? POLL_LIMIT_MS : UNREACHABLE_LIMIT_MS)) {
          stop();
          setStalled(true);
          return;
        }
        loadSession(loadId).then((p) => {
          if (p) loaded = true;
          if (p === null || (p && p.status !== "started" && p.feedback)) stop();
        });
      }, 3000);
    });
    return () => {
      active = false;
      stop();
    };
  }, [loadId, sessionId, loadSession]);

  // ?view=progress: the session list + the progress card data.
  useEffect(() => {
    if (!wantsProgress) return;
    setRows(null);
    setProgress(null);
    getB2MayaProgress()
      .then((p) => setProgress(p.progress))
      .catch(() => setProgress({ week: { done: 0, goal: 3, streak: 0 }, mistakes: [], words: { learned: 0, practising: 0, new: 0, next: [] } }));
    getB2MayaSessions()
      .then((sessions) => setRows(sessions.map((practice) => ({ practice, kind: kindOf(practice) }))))
      .catch(() => setRows([]));
  }, [wantsProgress]);

  let screen;
  if (sessionId) {
    const p = session?.session;
    if (sessionMissing) screen = <Missing text="This practice wasn’t found on your account." />;
    else if (!p) screen = stalled ? <Missing text="Please check your connection and try again." /> : <Loading />;
    else if (wantsTranscript) screen = <Transcript practice={p} feedback={p.feedback?.ok ? p.feedback.feedback : null} />;
    else if (stalled && (p.status === "started" || !p.feedback))
      screen = <Missing text="This conversation is taking longer than usual to save. Check My progress again in a little while." />;
    else if (p.status === "started") screen = <Processing saved={false} />;
    else if (!heardIt(p) || feedbackReason(p.feedback) === "too_little_speech") screen = <NoSpeech sessionId={p.id} hasTranscript={(p.transcript ?? []).length > 0} />;
    else if (feedbackReason(p.feedback) === "failed") screen = <FeedbackError sessionId={p.id} onRetried={() => loadSession(loadId)} />;
    else if (!p.feedback?.ok) screen = <Processing saved />;
    else screen = <Feedback practice={p} feedback={p.feedback.feedback} analysis={p.analysis} target="B2" best={session.best ?? {}} />;
  } else if (focusId) {
    const p = session?.session;
    if (sessionMissing) screen = <Missing text="This practice wasn’t found on your account." />;
    else if (!p || !meta) screen = metaError || loadFailed ? <Missing text="Please check your connection and try again." /> : <Loading />;
    else {
      const index = Number(params.get("i") ?? 0);
      const c = p.feedback?.ok ? p.feedback.feedback.corrections[index] : undefined;
      screen = !c ? (
        <Missing text="That correction isn’t there any more." />
      ) : params.get("start") ? (
        <B2MayaRoom meta={meta} focus={{ sessionId: p.id, index, better: c.better, why: c.why }} />
      ) : (
        <Focus sessionId={p.id} index={index} correction={c} interview={p.mode !== "talk"} />
      );
    }
  } else if (wantsProgress) {
    screen = rows && progress ? <ProgressPage level="B2" rows={rows} filter={filter} progress={progress} /> : <Loading />;
  } else {
    screen = meta ? <B2MayaRoom meta={meta} /> : metaError ? <Missing text="Please check your connection and try again." /> : <Loading />;
  }

  return (
    <div className="sp-page">
      <div className="sp">{screen}</div>
    </div>
  );
}
