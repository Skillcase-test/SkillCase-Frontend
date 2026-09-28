import { useEffect, useMemo, useState } from "react";
import PassportPage from "./PassportPage";
import { PER_PAGE } from "./passportUtils";
import "./passport.css";

// Kept in step with the leaf animation in passport.css: the JS waits for the
// leaf to land before it swaps the page underneath.
const TURN_MS = 860;

// The passport is the reward, so it behaves like a book: it opens, holds six
// stamps to a page, and turns a real leaf on the spine when the page fills.
// `ceremony` is the entrance — the book arrives shut, opens, leafs to the
// page your newest stamp lives on, and presses it in front of you.
export default function PassportBook({
  topics = [], done = [], stats = {}, isDone,
  ceremony = false, landingId = null, onLanded, userName,
}) {
  const earned = useMemo(
    () => topics.filter((t) => isDone(t, done)),
    [topics, done, isDone],
  );

  const pages = useMemo(() => {
    const stampPages = [];
    const total = Math.max(Math.ceil(topics.length / PER_PAGE), 1);
    for (let i = 0; i < total; i++) {
      stampPages.push({
        kind: "stamps",
        no: i + 1,
        slots: Array.from({ length: PER_PAGE }, (_, j) => earned[i * PER_PAGE + j] || null),
      });
    }
    return [{ kind: "data" }, ...stampPages];
  }, [topics.length, earned]);

  const total = pages.length;
  const landed = earned.length ? Math.floor((earned.length - 1) / PER_PAGE) + 1 : 0;
  const target = Math.min(landed, total - 1);
  const landsOn = landingId || (earned.length ? earned[earned.length - 1].id : null);
  const [page_, setPage] = useState(() => (ceremony ? Math.max(target - 1, 0) : target));
  const [stamped, setStamped] = useState(false);
  const [turning, setTurning] = useState(null); // "next" | "prev"
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setOpen(true), 260);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!ceremony || !landsOn) return undefined;
    const timers = [];
    const land = () => {
      setStamped(true);
      timers.push(setTimeout(() => onLanded?.(), 180));
    };
    timers.push(setTimeout(() => {
      if (page_ === target) { land(); return; }
      setTurning("next");
      timers.push(setTimeout(() => {
        setPage(target);
        setTurning(null);
        timers.push(setTimeout(land, 120));
      }, TURN_MS));
    }, 1360));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line
  }, [ceremony]);

  const go = (dir) => {
    if (turning || !open) return;
    if (dir === "next" && page_ >= total - 1) return;
    if (dir === "prev" && page_ <= 0) return;
    setTurning(dir);
    setTimeout(() => {
      setPage((p) => p + (dir === "next" ? 1 : -1));
      setTurning(null);
    }, TURN_MS);
  };

  const at = (i) => pages[i] || { kind: "blank" };
  const next = page_ + (turning === "prev" ? -1 : 1);
  const pageProps = { stats, userName };

  return (
    <div className="lg2-pb">
      <div className={`lg2-pb-book ${open ? "open" : ""}`}>
        <div className="lg2-pb-under">
          <PassportPage page={at(next)} {...pageProps} />
          {turning && <i className={`lg2-pb-undershade ${turning}`} aria-hidden="true" />}
        </div>

        <div className="lg2-pb-live">
          <PassportPage page={at(page_)} {...pageProps} landing={stamped ? landsOn : null} />
        </div>

        {turning && (
          <div className={`lg2-pb-leaf ${turning}`}>
            <div className="lg2-pb-leaf-face front">
              <PassportPage page={at(page_)} {...pageProps} />
              <i className="lg2-pb-shade" aria-hidden="true" />
            </div>
            <div className="lg2-pb-leaf-face back">
              <PassportPage page={at(next)} {...pageProps} />
              <i className="lg2-pb-shade" aria-hidden="true" />
            </div>
          </div>
        )}

        <div className="lg2-pb-cover" aria-hidden="true">
          <div className="lg2-pb-cover-inner">
            <div className="lg2-pb-crest">
              <svg viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="27" />
                <path d="M32 13c6 6 9 12 9 19s-3 13-9 19c-6-6-9-12-9-19s3-13 9-19z" />
                <path d="M5.5 32h53M32 5.5v53" />
              </svg>
            </div>
            <div className="lg2-pb-cover-brand">Skillcase</div>
            <div className="lg2-pb-cover-title">Sprachpass</div>
            <div className="lg2-pb-cover-sub">Language passport · A1</div>
          </div>
          <div className="lg2-pb-cover-spine" />
        </div>
      </div>

      {ceremony && !stamped ? null : (
        <div className="lg2-pb-nav">
          <button className="lg2-pb-arrow" onClick={() => go("prev")} disabled={page_ === 0 || !!turning}
            aria-label="Previous page">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div className="lg2-pb-dots">
            {Array.from({ length: total }).map((_, i) => (
              <i key={i} className={i === page_ ? "on" : ""} />
            ))}
          </div>
          <button className="lg2-pb-arrow" onClick={() => go("next")} disabled={page_ >= total - 1 || !!turning}
            aria-label="Next page">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
