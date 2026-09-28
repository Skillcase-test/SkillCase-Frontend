import { useRef, useEffect } from "react";
import { ArrowLeft, Clock3, Check } from "lucide-react";
import { B2Button } from "./B2UI";
import { B2_SKILLS } from "./b2Skills";
export default function B2WorkspaceHeader({
  skill,
  assessment = false,
  index = 0,
  total = 1,
  timeLeft,
  draftStatus,
  onLeave,
  recording = false,
  compact = false,
}) {
  const dialog = useRef(null),
    trigger = useRef(null),
    heading = useRef(null),
    previousIndex = useRef(index),
    sectionIndex = B2_SKILLS.findIndex((s) => s.key === skill);
  useEffect(() => {
    if (previousIndex.current === index) return;
    previousIndex.current = index;
    window.scrollTo({ top: 0, behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, [index]);
  useEffect(() => {
    if (!recording) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [recording]);
  const leave = () => {
    if (assessment || recording || draftStatus === "unavailable")
      dialog.current?.showModal();
    else onLeave();
  };
  const remaining = Number.isFinite(timeLeft)
    ? `${Math.floor(Math.max(0, timeLeft) / 60)
        .toString()
        .padStart(2, "0")}:${Math.floor(Math.max(0, timeLeft) % 60)
        .toString()
        .padStart(2, "0")}`
    : null;
  return (
    <header className={`b2-workspace-header ${compact ? "b2-workspace-header--compact" : ""}`}>
      <div className="b2-row b2-between">
        <button ref={trigger} className="b2-back" onClick={leave}>
          <ArrowLeft size={18} /> {assessment ? "Leave test" : "Back"}
        </button>
        <span className="b2-chip">
          {assessment ? "Assessment" : "Practice"}
        </span>
      </div>
      {assessment && (
        <div className="b2-section-steps" aria-label="Assessment sections">
          {B2_SKILLS.map((s, i) => (
            <span
              key={s.key}
              data-current={i === sectionIndex}
              data-complete={i < sectionIndex}
            >
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div className="b2-row b2-between">
        <h1 ref={heading} tabIndex={-1}>
          {B2_SKILLS[sectionIndex]?.label}{" "}
          <span style={{ fontWeight: 400 }}>
            · Task {index + 1} of {total}
          </span>
        </h1>
        {remaining && (
          <span
            className={`b2-chip ${timeLeft < 60 ? "b2-note--warning" : ""}`}
            aria-label={`${remaining} remaining`}
          >
            <Clock3 size={15} />
            {remaining}
          </span>
        )}
      </div>
      {!compact && <div
        className="b2-workspace-progress"
        aria-label={`Task ${index + 1} of ${total}`}
      >
        <span style={{ width: `${(index / Math.max(1, total)) * 100}%` }} />
      </div>}
      {!compact && <div className="b2-row b2-between" style={{ marginTop: 10 }}>
        <span className="b2-small b2-muted">
          {assessment ? "Timer keeps running." : "Untimed practice"}
        </span>
        {draftStatus === "saved" && (
          <span className="b2-small b2-row" style={{ gap: 4 }}>
            <Check size={14} />
            <span title="Saved in this browser only">Saved here</span>
          </span>
        )}
      </div>}
      {draftStatus === "unavailable" && (
        <p className="b2-note b2-note--warning" role="status">
          Draft couldn’t save. Keep this screen open until you submit.
        </p>
      )}
      <dialog
        ref={dialog}
        className="b2-ui b2-dialog"
        aria-labelledby="b2-leave-title"
        onClose={() => trigger.current?.focus()}
      >
        <h2 id="b2-leave-title">
          Leave this {assessment ? "section" : "exercise"}?
        </h2>
        <p>
          {recording
            ? "Your unsubmitted recording will be lost. "
            : draftStatus === "saved"
              ? "Text answers are saved in this browser. "
              : "Unsubmitted answers may be lost. "}
          {assessment ? "The timer keeps running." : ""}
        </p>
        <B2Button onClick={() => dialog.current.close()}>Stay here</B2Button>
        <B2Button
          variant="secondary"
          onClick={() => {
            dialog.current.close();
            onLeave();
          }}
        >
          Leave {assessment ? "test" : "exercise"}
        </B2Button>
      </dialog>
    </header>
  );
}
