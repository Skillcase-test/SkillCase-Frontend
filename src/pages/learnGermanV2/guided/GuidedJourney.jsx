/* The journey: every module in order, on one road. */
import { useLayoutEffect, useMemo, useRef } from "react";
import { ArrowRight, Check, LockKeyhole, RotateCcw, Stamp } from "lucide-react";
import { challengeFromTopic, nextJourneyChallenge } from "./journeyModel";
import { PassportIcon, ScenarioArt } from "./PassportUI";
import "./journey-path.css";

const positions = [32, 68];
const stopHeight = 210;

function JourneyRoute({ challenges, next }) {
  return (
    <svg className="gp-route-line" viewBox={`0 0 360 ${challenges.length * stopHeight}`} preserveAspectRatio="none" aria-hidden="true">
      {challenges.slice(0, -1).map((c, index) => {
        const x = positions[index % 2] * 3.6, y = index * stopHeight + 85;
        const endX = positions[(index + 1) % 2] * 3.6, endY = y + stopHeight;
        const d = `M ${x} ${y} C ${x} ${y + 150}, ${endX} ${endY - 150}, ${endX} ${endY}`;
        const reached = c.complete && (challenges[index + 1].complete || challenges[index + 1].id === next?.id);
        return <g key={c.id}><path d={d} className="gp-route-edge"/><path d={d} className="gp-route-road"/><path d={d} className={`gp-route-dashes ${reached ? "gp-route-reached" : ""}`}/></g>;
      })}
    </svg>
  );
}

export default function GuidedJourney({ topics, done, entitlement, onOpenChallenge, onPassport }) {
  const currentStopRef = useRef(null);
  const positionedRef = useRef(false);
  const challenges = useMemo(() => topics.map((t) => challengeFromTopic(t, done)), [topics, done]);
  const numbered = challenges.map((c, index) => ({ ...c, step: index + 1 }));
  const next = nextJourneyChallenge(numbered);
  const usageLocked = !!entitlement?.capped;
  const earned = numbered.filter((c) => c.complete).length;
  const allComplete = challenges.length > 0 && earned === challenges.length;
  const currentIndex = numbered.findIndex((c) => c.id === next?.id);

  // Arriving places the current stop in view; finished stops stay a scroll
  // away. --guided-tabs-height is the shell navbar (h-16) the sticky dock
  // sits under.
  useLayoutEffect(() => {
    if (!challenges.length || positionedRef.current) return;
    positionedRef.current = true;
    if (currentIndex <= 0 || !currentStopRef.current?.scrollIntoView) return;
    try { currentStopRef.current.scrollIntoView({ block: "center", behavior: "auto" }); } catch { /* not scrollable here */ }
  }, [challenges.length, currentIndex]);

  return (
    <main className="gp-ui gp-journey gp-adventure" id="gp-journey" style={{ "--gp-journey-sky": "#dbeafe", "--guided-tabs-height": "64px" }}>
      <section className="gp-adventure-intro">
        <div className="gp-adventure-heading"><h1>Your German adventure</h1></div>
      </section>
      <div className="gp-passport-dock">
        <button type="button" className="gp-adventure-passport" onClick={onPassport}
          aria-label={`My passport, ${earned} of ${challenges.length} stamps collected`}>
          <PassportIcon/>
          <span>
            <strong>My passport <b>{earned}<span> / {challenges.length} stamps</span></b></strong>
            <span className="gp-adventure-meter" role="progressbar" aria-label="Passport stamps collected"
              aria-valuenow={earned} aria-valuemin={0} aria-valuemax={challenges.length || 1}>
              <span style={{ width: `${challenges.length ? (earned / challenges.length) * 100 : 0}%` }}/>
            </span>
          </span>
          <ArrowRight size={17}/>
        </button>
      </div>

      {challenges.length === 0 ? (
        <div className="gp-empty"><Stamp/><h2>New adventures are on their way</h2><p>Your challenges will appear here when they’re ready.</p></div>
      ) : (
        <section className="gp-world" aria-label="Your step-by-step learning path">
          <div className="gp-world-heading"><span/>{allComplete ? "EVERY STAMP IS YOURS" : next?.started ? "PICK UP WHERE YOU LEFT OFF" : next ? "YOUR NEXT CHALLENGE" : "MORE ADVENTURES AHEAD"}<span/></div>
          <div className="gp-map" style={{ "--stop-height": `${stopHeight}px` }}>
            <JourneyRoute challenges={numbered} next={next}/>
            <ol className="gp-map-stops">
              {numbered.map((c, index) => {
                const current = c.id === next?.id;
                const locked = !c.complete && (!current || usageLocked || !c.available);
                const state = c.complete ? "complete" : current && !locked ? "current" : "locked";
                const label = `Step ${c.step}: ${c.title}. ${c.complete ? "Stamp collected. Practise again" : !c.available ? "Coming soon" : current ? usageLocked ? "Daily limit reached" : c.started ? "Continue challenge" : "Start challenge" : "Locked"}`;
                return (
                  <li ref={current ? currentStopRef : null} id={`journey-${c.id}`} key={c.id} value={c.step} className="gp-map-stop" data-state={state}
                    style={{ "--stop-x": `${positions[index % 2]}%`, "--scene-ink": c.color }}>
                    <button type="button" className="gp-island-link" aria-current={current ? "step" : undefined} aria-label={label}
                      onClick={() => onOpenChallenge(c.id)}>
                      {current && <span className="gp-you-are-here">{usageLocked ? "COME BACK TOMORROW" : c.started ? "CONTINUE HERE" : "YOU ARE HERE"}</span>}
                      <span className="gp-island">
                        <span className="gp-island-base"/>
                        <ScenarioArt challenge={c}/>
                        <span className="gp-island-status">{c.complete ? <Check size={16} strokeWidth={3}/> : locked ? <LockKeyhole size={13}/> : c.step}</span>
                      </span>
                      <span className="gp-stop-label">
                        <span className="gp-step-number">STEP {String(c.step).padStart(2, "0")}</span>
                        <strong>{c.title}</strong>
                        <span className="gp-stop-action">
                          {c.complete ? <><RotateCcw size={12}/>Practise again</>
                            : locked ? <><LockKeyhole size={11}/>{!c.available ? "Coming soon" : usageLocked && current ? "Daily limit reached" : "Locked"}</>
                            : <>{c.started ? "Continue" : "Let’s go"}<ArrowRight size={15}/></>}
                        </span>
                      </span>
                    </button>
                    <span className="gp-map-sprig" aria-hidden="true"><i/><i/><i/></span>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="gp-path-finish">
            <PassportIcon/>
            <h2>{allComplete ? "Look how far you’ve come." : "A passport full of possibilities."}</h2>
            <p>{allComplete ? "Every stamp is yours. Revisit any stop to practise." : "One challenge. One new thing you can do."}</p>
            <button type="button" onClick={onPassport}>{allComplete ? "Celebrate your collection" : "Take a peek at your passport"}<ArrowRight size={15}/></button>
          </div>
        </section>
      )}
    </main>
  );
}
