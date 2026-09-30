/* The stamp-tool press animation. A visual celebration only: completion and
   stamp ownership are saved by the server. */
import { useEffect, useState } from 'react';

export const STAMP_TOOL_URL = '/lg2/passport-stamp-tool.webp';
export const STAMP_PRESS_DURATION = 1800;
export const STAMP_PRESS_DELAY = 180;

export default function StampPress({ children, delay = STAMP_PRESS_DELAY, inkColor }) {
  const [phase, setPhase] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'done' : 'preparing');

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) return;
    let live = true;
    let settled = false;
    let finishTimer;
    const finish = () => { settled = true; if (live) setPhase('done'); };
    const preferenceChanged = () => { if (motion.matches) finish(); };
    const image = new Image();
    // A delayed or missing asset must never leave an earned stamp hidden.
    const loadTimer = window.setTimeout(finish, 1800);
    image.onload = () => {
      window.clearTimeout(loadTimer);
      if (!live || settled || motion.matches) return;
      setPhase('playing');
      finishTimer = window.setTimeout(finish, delay + STAMP_PRESS_DURATION + 150);
    };
    image.onerror = finish;
    image.src = STAMP_TOOL_URL;
    motion.addEventListener('change', preferenceChanged);
    return () => {
      live = false;
      image.onload = null;
      image.onerror = null;
      window.clearTimeout(loadTimer);
      window.clearTimeout(finishTimer);
      motion.removeEventListener('change', preferenceChanged);
    };
  }, [delay]);

  return <div className="gp-stamp-composition" data-phase={phase} aria-hidden="true" style={{ '--press-delay': `${delay}ms`, '--press-duration': `${STAMP_PRESS_DURATION}ms`, '--stamp-ink': inkColor }}>
    <div className="gp-ink-impression">{children}</div>
    {phase !== 'done' && <>
      <span className="gp-tool-shadow"/>
      <span className="gp-ink-impact"/>
      <svg className="gp-stamp-tool" viewBox="410 20 455 675" focusable="false" onAnimationEnd={event => { if (event.animationName === 'gp-tool-press') setPhase('done'); }}>
        <image href={STAMP_TOOL_URL} width="1280" height="720"/>
      </svg>
    </>}
  </div>;
}
