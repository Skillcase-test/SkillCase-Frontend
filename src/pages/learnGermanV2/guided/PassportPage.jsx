/* The passport: a cover that opens onto the stamp collection, four to a
   page. Opens straight onto the stamp just earned when there is one. */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Globe2, LockKeyhole, Stamp, X } from "lucide-react";
import { GuidedHeader, FocusTitle, PassportStamp, SkillcaseLogo } from "./PassportUI";
import { challengeFromTopic, readPassportDates, formatStampDate, nextJourneyChallenge } from "./journeyModel";

const PER_PAGE = 4;

function StampDetails({ challenge, date, next, onClose, onOpenChallenge }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.showModal?.(); }, []);
  return (
    <dialog ref={ref} className="gp-ui gp-stamp-dialog" aria-labelledby="stamp-title" onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
      <button className="gp-close" aria-label="Close stamp details" onClick={() => ref.current.close()}><X size={20}/></button>
      <PassportStamp challenge={challenge} earned={challenge.complete} date={date}/>
      <p className="gp-eyebrow">{challenge.complete ? "A REAL-LIFE ACHIEVEMENT" : "A LITTLE SOMETHING TO LOOK FORWARD TO"}</p>
      <h2 id="stamp-title">{challenge.stamp}</h2>
      <p>{challenge.complete ? challenge.outcome : `Complete “${challenge.title}” to collect this stamp.`}</p>
      {challenge.complete && <small>{formatStampDate(date)}</small>}
      {challenge.complete
        ? <button className="gp-button gp-button-secondary" onClick={() => onOpenChallenge(challenge.id)}>Practise again<ArrowRight size={17}/></button>
        : next?.id === challenge.id
          ? <button className="gp-button" onClick={() => onOpenChallenge(challenge.id)}>Start this challenge<ArrowRight size={18}/></button>
          : <p className="gp-note"><LockKeyhole size={16}/>Follow your journey to unlock this challenge.</p>}
    </dialog>
  );
}

export default function PassportPage({ topics, done, userName, userId, earnedId = null, initiallyOpen = false, onBack, onOpenChallenge }) {
  const list = useMemo(() => topics.map((t) => challengeFromTopic(t, done)), [topics, done]);
  const [open, setOpen] = useState(initiallyOpen || !!earnedId);
  const [selectedStamp, setSelectedStamp] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const complete = list.filter((c) => c.complete);
  const totalEarned = complete.length;
  const dates = readPassportDates(userId);
  const next = nextJourneyChallenge(list);
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  // Open on the new stamp's page; otherwise the page the learner reached,
  // not page one of sixty-nine modules.
  const anchorId = earnedId || next?.id || list[list.length - 1]?.id;
  const anchorPage = Math.max(0, Math.floor(list.findIndex((c) => c.id === anchorId) / PER_PAGE));
  const pageIndex = Math.min(selectedPage ?? anchorPage, pages - 1);
  const setPageIndex = (p) => setSelectedPage(typeof p === "function" ? p(pageIndex) : p);
  const visibleStamps = list.slice(pageIndex * PER_PAGE, pageIndex * PER_PAGE + PER_PAGE);
  const collectionTitle = useRef(null);
  const coverRef = useRef(null);
  const name = (userName || "").split(" ")[0] || "Your";
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const openBook = () => { setOpen(true); window.setTimeout(() => collectionTitle.current?.focus({ preventScroll: true }), reduced ? 0 : 650); };
  const closeBook = () => { setOpen(false); window.setTimeout(() => coverRef.current?.focus({ preventScroll: true }), 0); };

  return (
    <main className="gp-ui gp-page gp-passport-page" id="gp-passport">
      <GuidedHeader title="My passport" onBack={onBack} action={<span className="gp-level"><Stamp size={14}/>{totalEarned}</span>}/>
      <section className="gp-passport-intro">
        <div className="gp-eyebrow">LITTLE WINS. BIG POSSIBILITIES.</div>
        <FocusTitle>{name === "Your" ? "Your German story" : `${name}’s German story`}</FocusTitle>
        <p>Every stamp is something you can do.</p>
      </section>
      <div className={`gp-book ${open ? "gp-book-open" : ""}`}>
        <div className="gp-book-paper" inert={!open ? true : undefined} aria-hidden={!open}>
          <div className="gp-paper-top"><span>SKILLCASE · LEARNING PASSPORT</span><button aria-label="Close passport cover" onClick={closeBook}><X size={16}/></button></div>
          <div className="gp-paper-heading">
            <div><span className="gp-eyebrow">YOUR COLLECTION</span><h2 ref={collectionTitle} tabIndex={-1}>Everyday adventures</h2></div>
            <span className="gp-page-count">{totalEarned}<small> / {list.length}</small></span>
          </div>
          <div key={pageIndex} className="gp-stamp-grid gp-page-turn">
            {visibleStamps.map((c) => (
              <button key={c.id} className="gp-stamp-slot" aria-label={`${c.stamp}: ${c.complete ? "collected" : "not collected"}. ${c.title}`} onClick={() => setSelectedStamp(c)}>
                <PassportStamp challenge={c} earned={c.complete} date={dates[c.id]} animate={open && c.complete && c.id === earnedId} animationDelay={620}/>
                <span>{c.title}</span>{!c.complete && <small>Yet to discover</small>}
              </button>
            ))}
          </div>
          <div className="gp-paper-footer"><span>ONE CHALLENGE. ONE STAMP.</span><span>DE / PAGE / {String(pageIndex + 1).padStart(2, "0")}</span></div>
        </div>
        <button ref={coverRef} className="gp-book-cover" onClick={openBook} aria-label={`Open passport, ${totalEarned} stamps collected`} disabled={open} aria-hidden={open} tabIndex={open ? -1 : 0}>
          <SkillcaseLogo onDark width={146}/>
          <span className="gp-cover-kicker">YOUR WORLD, IN GERMAN</span>
          <Globe2 strokeWidth={0.85} className="gp-cover-globe"/>
          <strong>LEARNING<br/>PASSPORT</strong>
          <span className="gp-cover-levels">REAL-LIFE GERMAN</span>
          <span className="gp-cover-name">{name === "Your" ? "Your personal collection" : `Belongs to ${name}`}</span>
          <span className="gp-cover-open">Open passport<ArrowRight size={17}/></span>
        </button>
      </div>
      {open ? (
        <nav className="gp-book-navigation" aria-label="Passport collection">
          <button disabled={pageIndex === 0} aria-label="Previous passport page" onClick={() => setPageIndex((i) => i - 1)}><ChevronLeft size={20}/></button>
          <span aria-live="polite">Page {pageIndex + 1} of {pages}</span>
          <button disabled={pageIndex >= pages - 1} aria-label="Next passport page" onClick={() => setPageIndex((i) => i + 1)}><ChevronRight size={20}/></button>
        </nav>
      ) : (
        <p className="gp-cover-caption"><Stamp size={16}/>{totalEarned ? `${totalEarned} stamps collected. So much more to discover.` : "Your first page is ready for a little adventure."}</p>
      )}
      <div className="gp-passport-next">
        <button type="button" className="gp-button" onClick={() => (next ? onOpenChallenge(next.id) : onBack())}>
          {next ? "Find your next stamp" : "Back to your journey"}<ArrowRight size={18}/>
        </button>
        <span>Collected stamps stay yours, even after a break.</span>
      </div>
      {selectedStamp && (
        <StampDetails challenge={selectedStamp} date={dates[selectedStamp.id]} next={next}
          onClose={() => setSelectedStamp(null)} onOpenChallenge={(id) => { setSelectedStamp(null); onOpenChallenge(id); }}/>
      )}
    </main>
  );
}
