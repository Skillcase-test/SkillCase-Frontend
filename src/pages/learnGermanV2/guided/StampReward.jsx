/* The end of a module: the stamp is pressed into the passport page.
   "Continue learning" opens the next module straight away rather than going
   back to the journey. */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, RefreshCw, Stamp, X } from "lucide-react";
import { challengeFromTopic, readPassportDates } from "./journeyModel";
import { PassportStamp, SkillcaseLogo } from "./PassportUI";
import { STAMP_PRESS_DURATION, STAMP_PRESS_DELAY } from "./StampPress";

export default function StampReward({ topic, done, userId, status, isNew, words = 0, onRetry, onClose, onPassport, onContinue }) {
  const dialog = useRef(null);
  const [replay, setReplay] = useState(0);
  const c = challengeFromTopic(topic, done);
  const earnedDate = readPassportDates(userId)[c.id];
  const saved = status === "saved";

  useEffect(() => {
    dialog.current?.showModal?.();
    dialog.current?.querySelector("h1")?.focus({ preventScroll: true });
  }, []);

  return (
    <dialog ref={dialog} className="gp-ui gp-reward-dialog" aria-labelledby="passport-reward-title"
      onCancel={(e) => { e.preventDefault(); if (saved) onClose(); }}>
      <div className="gp-reward-inner">
        <header>
          <SkillcaseLogo width={132}/>
          {saved && <button className="gp-close" aria-label="Back to your journey" onClick={onClose}><X size={21}/></button>}
        </header>
        <div className="gp-reward-heading">
          <span className="gp-eyebrow">{saved ? (isNew ? "A NEW STAMP. A NEW POSSIBILITY." : "A LITTLE PRACTICE GOES A LONG WAY.") : "CHALLENGE COMPLETE"}</span>
          <h1 id="passport-reward-title" tabIndex={-1}>
            {saved ? (isNew ? "Look what you can do." : "Confidence, refreshed.") : status === "failed" ? "Let’s save your achievement." : "Saving your little win…"}
          </h1>
          <p>{saved ? c.outcome : "Your challenge is finished. We’re saving your progress."}</p>
        </div>
        <div className="gp-stamping-paper" style={{ "--press-duration": `${STAMP_PRESS_DURATION}ms`, "--press-delay": `${STAMP_PRESS_DELAY}ms` }}>
          <div className="gp-paper-top">
            <span>YOUR LEARNING PASSPORT</span>
            {saved && isNew && (
              <button className="gp-replay-stamp" aria-label="Replay stamp animation" onClick={() => setReplay((v) => v + 1)}>
                <RefreshCw size={13}/><span>Replay</span>
              </button>
            )}
          </div>
          <div className="gp-stamp-stage">
            {saved
              ? <PassportStamp key={replay} challenge={c} animate={isNew} date={earnedDate}/>
              : <Stamp size={70} strokeWidth={1} className="gp-pending-stamp"/>}
          </div>
          <span className="gp-stamping-caption">
            {saved
              ? <><Check size={15}/>{isNew ? "Added to your passport" : "Your stamp is already collected"}</>
              : <><Loader2 size={16}/>{status === "failed" ? "Not saved yet" : "Saving progress"}</>}
          </span>
        </div>
        <div className="gp-reward-bottom" aria-live="polite">
          {saved ? (
            <>
              {words > 0 && <p>{words} useful {words === 1 ? "word" : "words"} practised. One step closer to feeling at home.</p>}
              <button type="button" className="gp-button" onClick={onContinue}>Continue learning<ArrowRight size={18}/></button>
              <button type="button" className="gp-text-link" onClick={onPassport}>See it in my passport</button>
            </>
          ) : status === "failed" ? (
            <>
              <p>We couldn’t save this time. Try again to collect your stamp.</p>
              <button type="button" className="gp-button" onClick={onRetry}><RefreshCw size={17}/>Retry saving</button>
              <button type="button" className="gp-text-link" onClick={onClose}>Back to learning</button>
            </>
          ) : (
            <span className="gp-save-status"><Loader2 size={18}/>Saving your progress</span>
          )}
        </div>
      </div>
    </dialog>
  );
}
