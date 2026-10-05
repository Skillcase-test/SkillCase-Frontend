import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { images } from "../../../assets/images";
import RetryFeedback from "./RetryFeedback";
import SayItAgain from "./SayItAgain";
import { SMOOTHNESS_LABEL, callSmoothness, englishWords, modeName } from "./mayaFormat";
import { BottomNav, Brand, Footer, Header, Icon, Main, MayaFrame, MayaHero, MayaMark, ScoreRing, Title } from "./sp";

/*
 * The screens after a practice, and My progress. Each lives on the same route under a different
 * query (?session=…, ?view=progress), so refresh and deep links keep working.
 */

const TZ = "Asia/Kolkata";
const day = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: TZ });
const when = (d) => {
  const t = new Date(d);
  const today = new Date().toLocaleDateString("en-GB", { timeZone: TZ });
  const time = t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return t.toLocaleDateString("en-GB", { timeZone: TZ }) === today ? `Today, ${time}` : `${t.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ })}, ${time}`;
};
const mmss = (ms) => `${Math.floor(ms / 60_000)}:${String(Math.round((ms % 60_000) / 1000)).padStart(2, "0")}`;
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILL = { range: "Vocabulary", accuracy: "Grammar", fluency: "Fluency", interaction: "Conversation", coherence: "Linking ideas" };

/** While the call is being saved and the feedback written; the parent re-polls. */
export function Processing({ saved }) {
  return (
    <>
      <Header title="Your feedback" back="/b2/maya?view=progress" />
      <Main>
        <MayaHero pose="looking" />
        <Title text="A moment to reflect." desc="Maya is turning your conversation into something you can practise next." />
        <ul className="loading-steps">
          <li>{saved ? <Icon name="check" /> : <span className="spinner" />}Conversation saved</li>
          <li>{saved ? <Icon name="check" /> : <span className="spinner" />}Reviewing your German</li>
          <li>
            <span className="spinner" />
            Finding your next step
          </li>
        </ul>
        <p style={{ fontSize: 11 }}>This takes about 20 seconds. You can leave this screen: look for your session in My progress.</p>
      </Main>
    </>
  );
}

/** Too little speech to review: no score, and a way back to speaking. */
export function NoSpeech({ sessionId, hasTranscript }) {
  return (
    <>
      <Header title="Your session" back="/b2/maya?view=progress" />
      <Main>
        <div className="device-hero warning">
          <Icon name="mic" />
        </div>
        <Title text={<>We didn’t hear<br />enough to review.</>} desc="This can happen when the microphone is quiet or the conversation ends early." />
        <div className="info-note">No score was added. This attempt is saved in your history, separate from completed practice.</div>
        <h2 style={{ marginTop: 29 }}>Let’s get you speaking.</h2>
        <ul className="checklist">
          <li>
            <Icon name="mic" />
            <div>
              <strong>Check your microphone</strong>
              <span>Make sure the meter moves when you speak.</span>
            </div>
          </li>
          <li>
            <Icon name="chat" />
            <div>
              <strong>Give yourself a few sentences</strong>
              <span>Let Maya finish, then share one idea and a little detail.</span>
            </div>
          </li>
        </ul>
        {hasTranscript ? (
          <Link className="insight-link" to={`/b2/maya?session=${sessionId}&view=transcript`}>
            View the conversation
            <Icon name="arrow" />
          </Link>
        ) : null}
      </Main>
      <Footer>
        <Link className="primary" to="/b2/maya">
          Check mic &amp; try again
          <Icon name="repeat" />
        </Link>
        <Link className="text-button full" to="/b2/maya?view=progress">
          Back to my progress
        </Link>
      </Footer>
    </>
  );
}

/** The call was saved but the feedback couldn't be written. */
export function FeedbackError({ sessionId, onRetried }) {
  return (
    <>
      <Header title="Your feedback" back="/b2/maya?view=progress" />
      <Main>
        <div className="device-hero warning">
          <Icon name="info" />
        </div>
        <Title text={<>Your conversation<br />is here. Feedback<br />is taking longer.</>} desc="We saved the transcript, but couldn’t finish the feedback yet." />
        <div className="info-note">You don’t need to repeat the call. You can read your conversation now or try the feedback again.</div>
        <Link className="insight-link" to={`/b2/maya?session=${sessionId}&view=transcript`}>
          Read my conversation
          <Icon name="arrow" />
        </Link>
      </Main>
      <Footer>
        <RetryFeedback sessionId={sessionId} onRetried={onRetried} />
        <Link className="text-button full" to="/b2/maya?view=progress">
          Back to my progress
        </Link>
      </Footer>
    </>
  );
}

/** Feedback you can use: what worked, one thing to practise (with "Try it"), and the details on request. */
export function Feedback({ practice: p, feedback: f, analysis: a, target, best }) {
  const user = useSelector((state) => state.auth.user);
  const interview = p.mode !== "talk";
  const learnerLines = (p.transcript ?? []).filter((l) => l.speaker === "candidate");
  const spokeMs = learnerLines.reduce((ms, l) => ms + (l.duration_ms ?? 0), 0);
  const first = f.corrections[0];
  const rest = f.corrections.slice(1);
  const reached = (l) => LEVELS.indexOf(l) >= LEVELS.indexOf(target);
  const smooth = callSmoothness(a);
  const german = Math.round(a.targetShare * 100);
  return (
    <>
      <Header
        title={interview ? "Interview feedback" : "Your feedback"}
        back="/b2/maya?view=progress"
        tag={`${target} practice`}
        end={a.pronunciation ? <ScoreRing score={a.pronunciation.score} /> : undefined}
      />
      <Main className="flush-top">
        <div className="feedback-header">
          <MayaFrame pose="thumbsup" className="feedback-maya" user={user} />
          <div className="session-meta">
            <span>{day(p.started_at)}</span>·<span>{modeName(p.mode)}</span>
          </div>
          <h1>{f.headline ?? "Gut gemacht."}</h1>
          <p>{f.summary ?? f.level_note}</p>
        </div>
        <div className="stats">
          <div>
            <strong>{mmss((p.seconds ?? 0) * 1000)}</strong>
            <span>Conversation</span>
          </div>
          <div>
            <strong>{mmss(spokeMs)}</strong>
            <span>You spoke</span>
          </div>
          <div>
            <strong>{learnerLines.length}</strong>
            <span>Your turns</span>
          </div>
        </div>

        {f.strengths.length ? (
          <>
            <h2>What worked well</h2>
            {f.strengths.slice(0, 3).map((s, i) => (
              <div className="strength" key={i}>
                <Icon name="check" />
                <div>
                  <p>{s}</p>
                </div>
              </div>
            ))}
          </>
        ) : null}

        {first ? (
          <div className="focus-card">
            <p className="eyebrow">One thing to practise next</p>
            <h2>{first.why}</h2>
            <div className="sentence">
              <small>You said</small>
              <span lang="de">
                „<s>{first.you_said}</s>“
              </span>
            </div>
            <div className="sentence">
              <small>Try this</small>
              <span lang="de">
                „<mark>{first.better}</mark>“
              </span>
            </div>
            <SayItAgain sessionId={p.id} index={0} best={best[0]} />
          </div>
        ) : null}

        <Link className="insight-link" to={`/b2/maya?session=${p.id}&view=transcript`}>
          Read the whole conversation
          <Icon name="arrow" />
        </Link>

        <details className="more">
          <summary>
            <span>
              Your level today: {f.estimated_level} <span style={{ fontWeight: 400, color: "var(--muted)" }}>· aiming for {target}</span>
            </span>
            <Icon name="chevron" />
          </summary>
          <div className="more-body">
            <p style={{ fontSize: 13 }}>{f.level_note}</p>
            {f.skills.map((k) => (
              <div className="level-row" key={k.skill}>
                <div>
                  <strong>{SKILL[k.skill] ?? k.skill}</strong>
                  <small>{k.note}</small>
                </div>
                <span className={`level-chip ${reached(k.level) ? "reached" : ""}`}>{k.level}</span>
              </div>
            ))}
            <p style={{ fontSize: 10, margin: "10px 0 0" }}>An AI estimate from this one conversation, to guide your practice. It isn’t an official certificate.</p>
          </div>
        </details>

        {rest.length ? (
          <details className="more">
            <summary>
              More sentences to practise ({rest.length})
              <Icon name="chevron" />
            </summary>
            <div className="more-body">
              {rest.map((c, i) => (
                <div className="fix" key={i}>
                  <div className="sentence">
                    <small>You said</small>
                    <span lang="de">
                      „<s>{c.you_said}</s>“
                    </span>
                  </div>
                  <div className="sentence">
                    <small>Try this</small>
                    <span lang="de">
                      „<mark>{c.better}</mark>“
                    </span>
                  </div>
                  <p style={{ fontSize: 12, margin: 0 }}>{c.why}</p>
                  <SayItAgain sessionId={p.id} index={i + 1} best={best[i + 1]} />
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <details className="more">
          <summary>
            How you spoke
            <Icon name="chevron" />
          </summary>
          <div className="more-body">
            <div className="measure-grid">
              <div className="measure">
                <strong>{german}%</strong>
                <span>German · {a.switches.length ? `${a.switches.length} English switch${a.switches.length === 1 ? "" : "es"}` : "stayed in German"}</span>
              </div>
              <div className="measure">
                <strong>{a.fluency.averageAnswerWords}</strong>
                <span>words per answer{a.fluency.repeatedAfterCoach ? ` (not counting ${a.fluency.repeatedAfterCoach} repeated after Maya)` : ""}</span>
              </div>
              {a.pronunciation ? (
                <div className="measure">
                  <strong>{a.pronunciation.score}</strong>
                  <span>Pronunciation (0–100)</span>
                </div>
              ) : null}
              {smooth ? (
                <div className="measure">
                  <strong>{SMOOTHNESS_LABEL[smooth]}</strong>
                  <span>{a.hesitation?.perMinute} hesitations a minute</span>
                </div>
              ) : null}
              {a.fluency.wordsPerMinute !== null ? (
                <div className="measure">
                  <strong>{a.fluency.wordsPerMinute}</strong>
                  <span>Words a minute</span>
                </div>
              ) : null}
            </div>
            {!a.pronunciation || !smooth || a.fluency.wordsPerMinute === null ? (
              <p style={{ fontSize: 12, margin: "8px 0 0" }}>
                {[!a.pronunciation ? "pronunciation" : "", !smooth ? "smoothness" : "", a.fluency.wordsPerMinute === null ? "pace" : ""].filter(Boolean).join(", ").replace(/^./, (c) => c.toUpperCase())}: not enough of
                your own speech to judge yet. {first ? "For pronunciation, use “Try it” above." : ""}
              </p>
            ) : null}
            {a.hardToHear ? <p style={{ fontSize: 12, margin: "8px 0 0" }}>{a.hardToHear} answer(s) were hard to hear over background noise, so they weren’t scored.</p> : null}
          </div>
        </details>

        {f.vocabulary.length ? (
          <details className="more">
            <summary>
              Words to learn ({f.vocabulary.length})
              <Icon name="chevron" />
            </summary>
            <div className="more-body">
              {f.vocabulary.map((v, i) => (
                <div className="word-row" key={i}>
                  <div>
                    <strong lang="de">{v.german}</strong>
                    <small lang="de">{v.example}</small>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)", textAlign: "right" }}>{v.english}</span>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {f.pronunciation?.length ? (
          <details className="more">
            <summary>
              Words to say more clearly ({f.pronunciation.length})
              <Icon name="chevron" />
            </summary>
            <div className="more-body">
              {f.pronunciation.map((w, i) => (
                <div className="word-row" key={i}>
                  <div>
                    <strong lang="de">{w.word}</strong>
                    <small>{w.tip}</small>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {interview && f.interview_tips.length ? (
          <details className="more">
            <summary>
              For the real interview
              <Icon name="chevron" />
            </summary>
            <div className="more-body">
              {f.interview_tips.map((t, i) => (
                <div className="strength" key={i}>
                  <Icon name="bag" />
                  <div>
                    <p>{t}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {f.next_steps.length ? (
          <details className="more">
            <summary>
              For your next practice
              <Icon name="chevron" />
            </summary>
            <div className="more-body">
              {f.next_steps.map((t, i) => (
                <div className="strength" key={i}>
                  <Icon name="arrow" />
                  <div>
                    <p>{t}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <p style={{ fontSize: 10, margin: "13px 0 0" }}>AI feedback is a practice aid, not an official language assessment.</p>
      </Main>
      <Footer>
        <Link className="primary gold" to="/b2/maya">
          Start another conversation
          <Icon name="arrow" />
        </Link>
      </Footer>
    </>
  );
}

/** The whole conversation, with each correction beside the sentence it's about. */
export function Transcript({ practice: p, feedback }) {
  const user = useSelector((state) => state.auth.user);
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const transcript = p.transcript ?? [];
  const heard = transcript.some((l) => l.speaker === "candidate");
  const back = `/b2/maya?session=${p.id}`;
  return (
    <>
      <Header title="Your conversation" back={back} />
      <Main>
        <div className="session-meta">
          {day(p.started_at)} · {modeName(p.mode)}
        </div>
        <h1 style={{ fontSize: 26 }}>
          A conversation
          <br />
          to learn from.
        </h1>
        <p className="transcript-info">Automatic transcript · Some words may be inaccurate.</p>
        {!heard ? <div className="info-note">No learner speech was captured in this attempt.</div> : null}
        {transcript.map((l, i) => {
          const you = l.speaker === "candidate";
          const fix = you ? feedback?.corrections.find((c) => c.you_said && norm(l.text).includes(norm(c.you_said))) : undefined;
          const en = you ? new Set(englishWords(l.text)) : null;
          return (
            <article className={`turn ${you ? "you" : ""}`} key={i}>
              <div className="turn-label">
                {you ? null : <MayaMark pose="smiling" user={user} />}
                <strong>{you ? "You" : "Maya · AI coach"}</strong>
                <time>{mmss(l.at_ms)}</time>
              </div>
              <p className="turn-body" lang="de">
                {en?.size
                  ? l.text.split(/([\p{L}']+)/u).map((part, j) =>
                      en.has(part.toLowerCase()) ? (
                        <mark key={j} title="English" style={{ background: "#ffedb9", borderRadius: 3, padding: "0 2px" }}>
                          {part}
                        </mark>
                      ) : (
                        part
                      ),
                    )
                  : l.text}
              </p>
              {fix ? (
                <div className="correction">
                  Try: <span lang="de">„{fix.better}“</span>
                </div>
              ) : null}
            </article>
          );
        })}
      </Main>
      <Footer>
        <Link className="secondary" to={back}>
          Back to feedback
        </Link>
      </Footer>
    </>
  );
}

/** Before a focused follow-up: the one pattern to practise, then the call. */
export function Focus({ sessionId, index, correction, interview }) {
  return (
    <>
      <Header title="Your next small step" back={`/b2/maya?session=${sessionId}`} tag="2–3 min" />
      <Main>
        <Title text={<>One sentence.<br />A little more natural.</>} desc={interview ? "Practise the pattern from your interview with Maya, in everyday questions." : "Practise it with Maya in a few short questions."} />
        <div className="focus-task">
          <small>Your pattern</small>
          <p lang="de">„{correction.better}“</p>
          <strong>{correction.why}</strong>
        </div>
        <div className="focus-example">
          <strong>Instead of</strong>
          <p lang="de">
            „<s style={{ color: "var(--red)" }}>{correction.you_said}</s>“
          </p>
        </div>
        <div className="coach-note">
          <MayaMark />
          <p>
            <strong>This time, Maya will coach you.</strong>Try it, get a tip, then say it again.
          </p>
        </div>
      </Main>
      <Footer note="A short practice, focused on your feedback.">
        <Link className="primary gold" to={`/b2/maya?focus=${sessionId}&i=${index}&start=1`}>
          Practise with Maya
          <Icon name="arrow" />
        </Link>
      </Footer>
    </>
  );
}

/** My progress: completed practice, attempts that didn't count, and what the learner is working on. */
export function ProgressPage({ level, rows, filter, progress }) {
  // The footer button scrolls to the session list; once the list is on screen it starts a call.
  const sessionsRef = useRef(null);
  const [atSessions, setAtSessions] = useState(false);
  useEffect(() => {
    const el = sessionsRef.current;
    if (!el) return;
    // On screen or scrolled past — the section's top edge has passed the scroller's bottom edge.
    const obs = new IntersectionObserver(([e]) => setAtSessions(e.boundingClientRect.top <= (e.rootBounds?.bottom ?? window.innerHeight)), { root: el.closest(".content") });
    obs.observe(el);
    return () => obs.disconnect();
  }, [rows.length]);
  const completed = rows.filter((r) => r.kind === "completed");
  if (!rows.length)
    return (
      <>
        <Brand level={level} />
        <Main>
          <Title eyebrow="My progress" text={<>Your speaking<br />progress</>} desc="Your first conversation is a good place to start." />
          <div className="empty-practice-art">
            <img src={images.b2Speaking} alt="A learner practising spoken German on a phone" width={1672} height={941} decoding="async" />
          </div>
          <div className="center">
            <h2>Let’s start with hello.</h2>
            <p>Your practice and feedback will appear here after your first conversation.</p>
          </div>
          <div className="info-note">You don’t need to feel ready. Maya will help you find your first words.</div>
        </Main>
        <Footer>
          <Link className="primary gold" to="/b2/maya">
            Start my first conversation
            <Icon name="arrow" />
          </Link>
        </Footer>
        <BottomNav current="progress" />
      </>
    );

  // Practice minutes per day this week (Monday to Sunday, India time).
  const ist = (d) => new Date(d.getTime() + 330 * 60_000);
  const now = ist(new Date());
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7)));
  const perDay = [0, 0, 0, 0, 0, 0, 0];
  for (const r of completed) {
    const t = ist(new Date(r.practice.started_at));
    const i = Math.floor((Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - monday.getTime()) / 86_400_000);
    if (i >= 0 && i < 7) perDay[i] += (r.practice.seconds ?? 0) / 60;
  }
  const max = Math.max(10, ...perDay);
  const today = (now.getUTCDay() + 6) % 7;
  const totalMin = Math.round(completed.reduce((s, r) => s + (r.practice.seconds ?? 0), 0) / 60);
  const shown = rows.filter((r) => (filter === "Completed" ? r.kind === "completed" : filter === "Attempts" ? r.kind === "attempt" : true));
  const { week, words } = progress;
  return (
    <>
      <Brand level={level} />
      <Main>
        <Title eyebrow="My progress" text={<>Your speaking<br />progress</>} desc="Small conversations add up. Keep making room for yours." />
        <div className="stats">
          <div>
            <strong>{completed.length}</strong>
            <span>Completed sessions</span>
          </div>
          <div>
            <strong>{totalMin} min</strong>
            <span>Speaking practice</span>
          </div>
        </div>
        <div className="chart" role="img" aria-label={`Practice minutes this week: ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => `${d} ${Math.round(perDay[i])}`).join(", ")}`}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div className={`chart-col ${i === today ? "current" : ""}`} key={i}>
              <i style={{ "--bar": `${Math.max(3, Math.round((perDay[i] / max) * 60))}px` }} />
              <small>{d}</small>
            </div>
          ))}
        </div>
        <p className="chart-caption">Practice minutes · This week</p>

        <h2>This week</h2>
        <div className="goal-meter" aria-hidden="true">
          <i style={{ width: `${Math.min(100, Math.round((week.done / week.goal) * 100))}%` }} />
        </div>
        <p style={{ fontSize: 13 }}>
          <strong style={{ color: "var(--navy)" }}>
            {week.done} of {week.goal} practices.
          </strong>{" "}
          {week.done >= week.goal ? `Goal reached${week.streak > 1 ? `: ${week.streak} weeks in a row` : ""}.` : week.streak ? `${week.streak} week${week.streak === 1 ? "" : "s"} in a row so far.` : "Short practices often work best."}
        </p>

        {words.learned + words.practising + words.new ? (
          <>
            <h2 style={{ marginTop: 26 }}>Your words</h2>
            <p style={{ fontSize: 13, margin: 0 }}>
              <strong style={{ color: "var(--navy)" }}>{words.learned}</strong> learned · <strong style={{ color: "var(--navy)" }}>{words.practising}</strong> practising · <strong style={{ color: "var(--navy)" }}>{words.new}</strong>{" "}
              new
            </p>
            {words.next.length ? (
              <>
                <div className="chips" lang="de">
                  {words.next.map((w) => (
                    <span className={`chip ${w.status}`} key={w.german} title={w.english}>
                      {w.german}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 11 }}>Maya brings these back until you’ve used each one in 2 practices.</p>
              </>
            ) : null}
          </>
        ) : null}

        <h2 style={{ marginTop: 26 }} ref={sessionsRef}>
          Your sessions
        </h2>
        <div className="tabs" role="group" aria-label="Session status">
          {["All", "Completed", "Attempts"].map((t) => (
            <Link key={t} to={`/b2/maya?view=progress${t === "All" ? "" : `&filter=${t}`}`} aria-current={filter === t ? "page" : undefined} className="tab-link" data-on={filter === t}>
              {t}
            </Link>
          ))}
        </div>
        {shown.map(({ practice: p, kind }) => (
          <Link className="history-row" key={p.id} to={`/b2/maya?session=${p.id}`}>
            <span className="history-symbol">{kind === "pending" ? <span className="spinner" /> : <Icon name={kind === "attempt" ? "mic" : p.mode === "talk" ? "chat" : "bag"} />}</span>
            <span className="history-copy">
              <strong>{kind === "pending" ? "Feedback is being prepared" : modeName(p.mode)}</strong>
              <small>
                {when(p.started_at)}
                {kind === "attempt" ? " · Not enough speech" : p.seconds ? ` · ${Math.max(1, Math.round(p.seconds / 60))} min` : ""}
                {kind === "completed" && p.feedback?.ok ? ` · ${p.feedback.level}` : ""}
              </small>
            </span>
            <Icon name="chevron" />
          </Link>
        ))}
        {filter === "Attempts" ? <p className="attempt-note">Attempts don’t count as completed sessions and don’t affect your progress.</p> : null}
      </Main>
      <Footer>
        {atSessions ? (
          <Link className="primary gold" to="/b2/maya">
            Start another conversation
            <Icon name="arrow" />
          </Link>
        ) : (
          <button type="button" className="primary gold" onClick={() => sessionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            See your sessions
            <Icon name="down" />
          </button>
        )}
      </Footer>
      <BottomNav current="progress" />
    </>
  );
}
