import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
} from "lucide-react";
import { getB2Exercises } from "../../../api/b2Api";
import useB2Access from "../../../hooks/useB2Access";
import { B2Page, B2State } from "../../../components/b2/B2UI";
import { images } from "../../../assets/images";
import { getB2ScoreBand, normalizeB2Score } from "../../../utils/b2Scores";
const meta = {
  reading: {
    title: "Reading",
    sub: "Texts, emails & key details.",
    image: images.b2Reading,
  },
  listening: {
    title: "Listening",
    sub: "Conversations & key details.",
    image: images.b2Listening,
  },
  speaking: {
    title: "Speaking",
    sub: "Speak in German. Get feedback.",
    image: images.b2Speaking,
  },
  writing: {
    title: "Writing",
    sub: "Write in German. Get feedback.",
    image: images.b2Writing,
  },
};
export default function ExerciseSelect() {
  const { module } = useParams(),
    navigate = useNavigate(),
    open = useB2Access();
  const [tag, setTag] = useState("all"),
    [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const info = meta[module];
  useEffect(() => {
    let active = true;
    setTag("all");
    setLoading(true);
    setError(false);
    if (info)
      getB2Exercises(module, "all")
        .then((r) => {
          if (active) setItems(Array.isArray(r.data) ? r.data : []);
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [module, info, retry]);
  if (!info)
    return (
      <B2Page title="Practice">
        <B2State
          title="This skill isn’t available"
          description="Go home to choose Reading, Listening, Speaking or Writing."
          onRetry={() => navigate("/")}
        />
      </B2Page>
    );
  const visible = items.filter(
      (e) => tag === "all" || String(e.tag).toLowerCase() === tag,
    ),
    next = visible.find((e) => e.status === "in_progress") ||
      visible.find((e) => e.status !== "completed"),
    completed = visible.filter((e) => e.status === "completed").length;
  // Keep the current task easy to return to, without repeating it in a hero card.
  const ordered = next ? [next, ...visible.filter((e) => e.id !== next.id)] : visible;
  const go = (e) => {
    if (e.status === "completed") navigate(`/b2/${module}/${e.id}/results`);
    else open(module, `/b2/${module}/${e.id}`);
  };
  return (
    <B2Page title={`${info.title} practice`} className="b2-exercise-page">
      <div className="b2-content">
        <div className="b2-library-intro">
          <div>
            <h1>{info.title}</h1>
            <p>{info.sub}</p>
          </div>
          <div className="b2-library-art" aria-hidden="true">
            <img src={info.image} alt="" />
          </div>
        </div>
        <div
          className="b2-filter"
          id={`b2-${module}-tag-pills`}
          role="group"
          aria-label="Exercise format"
        >
          {[
            ["all", "All"],
            ["telc", "telc"],
            ["goethe", "Goethe"],
          ].map(([key, label]) => {
            const count = key === "all" ? items.length : items.filter((e) => String(e.tag).toLowerCase() === key).length;
            return (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-describedby={!loading && !error ? `b2-${module}-${key}-count` : undefined}
              aria-pressed={tag === key}
              aria-controls={`b2-${module}-exercise-list`}
              onClick={() => setTag(key)}
            >
              <span className="b2-filter-pill">
                {label}
                {!loading && !error && <span className="b2-filter-count" id={`b2-${module}-${key}-count`}>
                  {count}
                  <span className="sr-only"> {count === 1 ? "exercise" : "exercises"}</span>
                </span>}
              </span>
            </button>
            );
          })}
        </div>
        {loading ? (
          <B2State loading />
        ) : error ? (
          <B2State onRetry={() => setRetry((n) => n + 1)} />
        ) : (
          <>
            <div className="b2-library-progress" role="status" aria-live="polite">
              <h2>Exercises</h2>
              <span className="b2-small b2-muted">
                {completed} of {visible.length} completed
              </span>
            </div>
            {visible.length ? (
              <ul className="b2-exercise-list" id={`b2-${module}-exercise-list`}>
                {ordered.map((e, i) => {
                  const isNext = e.id === next?.id;
                  const isDone = e.status === "completed";
                  const isStarted = e.status === "in_progress";
                  const score = normalizeB2Score(e.score);
                  const band = getB2ScoreBand(score);
                  const format = String(e.tag || "").toLowerCase();
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        id={i === 0 ? `b2-${module}-first-exercise` : undefined}
                        className="b2-exercise-link"
                        data-next={isNext}
                        onClick={() => go(e)}
                      >
                        <strong>{e.title}</strong>
                        <span className="b2-exercise-meta">
                          <span className="b2-exercise-tag b2-exercise-format">
                            {format === "goethe" ? "Goethe" : format === "telc" ? "telc" : "B2"}
                          </span>
                          {e.difficulty_tag && <span className="b2-exercise-tag">{e.difficulty_tag}</span>}
                          {e.duration_minutes > 0 && <span className="b2-exercise-duration">
                            <Clock3 size={13} aria-hidden="true" /> {e.duration_minutes} min
                          </span>}
                        </span>
                        <span className="b2-exercise-footer">
                          <span className="b2-exercise-status">
                            {isDone ? <><Check size={14} aria-hidden="true" /> Completed
                              {score !== null && <span className="b2-exercise-score" style={{ color: band.color, background: band.background }}>
                                {score}%
                              </span>}
                            </> : isStarted ? "In progress" : isNext ? "Up next" : "Not started"}
                          </span>
                          <span className={`b2-exercise-action${isNext ? " b2-exercise-action--next" : ""}`}>
                            {isDone ? "Review" : isStarted ? "Resume" : "Start"}
                            {isDone ? <ChevronRight size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="b2-note" id={`b2-${module}-exercise-list`}>
                {items.length ? "No exercises in this format yet. Try another filter." : "New exercises are on their way. Check back soon."}
              </div>
            )}
          </>
        )}
      </div>
    </B2Page>
  );
}
