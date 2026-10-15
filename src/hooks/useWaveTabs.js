import { useCallback, useLayoutEffect, useRef, useState } from "react";

// Seamless outline geometry. The shoulder is the concave fillet where the
// horizontal rail turns up into the active tab. The tablist gap must stay
// >= SHOULDER_W or the shoulder paints over the neighbouring tab.
const SHOULDER_W = 16;
const SHOULDER_H = 21;
const CORNER = 12;

// Tab-switch wave: the old tab sinks while the new one rises a beat later
// and settles with a slight overshoot.
const WAVE_SINK_MS = 220;
const WAVE_RISE_DELAY_MS = 70;
const WAVE_RISE_MS = 260;
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const easeOutSettle = (p) => 1 + 2.1 * (p - 1) ** 3 + 1.1 * (p - 1) ** 2; // ~3px overshoot
const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * One continuous open path along the rail that bulges up around every tab
 * with lift k > 0 (k = 1 is a fully raised tab, 0 is flat). Closing it (Z)
 * fills the bumps with the page colour so the active tab melts into the screen
 * below; the open form is what gets stroked. Two bumps share the gap between
 * them mid-wave instead of overlapping.
 */
function wavePath({ width, top, base, bumps }) {
  const height = base - top;
  const lifted = bumps.filter((b) => b.k > 0.001);
  const cmds = [`M 0,${base}`];
  lifted.forEach((b, i) => {
    const prev = lifted[i - 1];
    const next = lifted[i + 1];
    const k = b.k;
    const grow = Math.min(k, 1);
    const swL = Math.min(SHOULDER_W * grow, prev ? (b.left - prev.right) / 2 : SHOULDER_W);
    const swR = Math.min(SHOULDER_W * grow, next ? (next.left - b.right) / 2 : SHOULDER_W);
    const tabTop = base - height * k;
    const shoulderTop = base - SHOULDER_H * k;
    const c = CORNER * k;
    const bend = 7 * k;
    cmds.push(
      `H ${b.left - swL}`,
      `C ${b.left - Math.min(6 * grow, swL)},${base} ${b.left},${base - bend} ${b.left},${shoulderTop}`,
      `V ${tabTop + c}`,
      `Q ${b.left},${tabTop} ${b.left + c},${tabTop}`,
      `H ${b.right - c}`,
      `Q ${b.right},${tabTop} ${b.right},${tabTop + c}`,
      `V ${shoulderTop}`,
      `C ${b.right},${base - bend} ${b.right + Math.min(6 * grow, swR)},${base} ${b.right + swR},${base}`,
    );
  });
  cmds.push(`H ${width}`);
  return cmds.join(" ");
}

/**
 * The raised-tab outline shared by the home switcher and the support tabs.
 * Put shellRef on the tab row, registerTab on each tab, and render
 * <WaveOutline wave={...} /> inside the row. layoutKey re-measures when the
 * set of tabs changes.
 */
export function useWaveTabs(activeKey, layoutKey = "") {
  // Tabs never change size (only the drawn outline moves), so geometry is
  // measured per layout, not per frame — re-measuring a growing tab every
  // frame is what made the old notch jitter and detach from the page.
  const shellRef = useRef(null);
  const tabEls = useRef({});
  const geoRef = useRef(null);
  const [geo, setGeo] = useState(null);
  const fillRef = useRef(null);
  const strokeRef = useRef(null);
  const liftsRef = useRef({});
  const frameRef = useRef(0);

  const registerTab = useCallback((key, el) => {
    if (el) tabEls.current[key] = el;
    else delete tabEls.current[key];
  }, []);

  const draw = useCallback(() => {
    const g = geoRef.current;
    if (!g || !fillRef.current || !strokeRef.current) return;
    const bumps = g.tabs.map((t) => ({ ...t, k: liftsRef.current[t.key] ?? 0 }));
    const d = wavePath({ width: g.width, top: g.top, base: g.base, bumps });
    fillRef.current.setAttribute("d", `${d} Z`);
    strokeRef.current.setAttribute("d", d);
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const shell = shellRef.current;
      if (!shell) return;
      const s = shell.getBoundingClientRect();
      if (!s.width) return;
      const tabs = Object.entries(tabEls.current)
        .filter(([, el]) => el?.isConnected)
        .map(([key, el]) => {
          const r = el.getBoundingClientRect();
          return {
            key,
            left: r.left - s.left,
            right: r.right - s.left,
            top: r.top - s.top,
            base: r.bottom - s.top,
          };
        })
        .sort((a, b) => a.left - b.left);
      if (!tabs.length) return;
      geoRef.current = {
        width: s.width,
        height: s.height,
        top: tabs[0].top,
        base: tabs[0].base,
        tabs,
      };
      setGeo(geoRef.current);
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (shellRef.current) observer.observe(shellRef.current);
    return () => observer.disconnect();
  }, [layoutKey]);

  useLayoutEffect(draw, [geo, draw]);

  useLayoutEffect(() => {
    const from = liftsRef.current;
    if (!Object.keys(from).length || prefersReducedMotion()) {
      liftsRef.current = { [activeKey]: 1 };
      draw();
      return undefined;
    }

    const keys = new Set([...Object.keys(from), activeKey]);
    // Re-tapped mid-wave: a tab that's already partly up rises straight away
    const riseDelay = (from[activeKey] ?? 0) > 0.05 ? 0 : WAVE_RISE_DELAY_MS;
    const start = performance.now();
    const step = (now) => {
      const t = now - start;
      let running = false;
      const next = {};
      keys.forEach((key) => {
        const k0 = from[key] ?? 0;
        if (key === activeKey) {
          const p = clamp01((t - riseDelay) / WAVE_RISE_MS);
          next[key] = k0 + (1 - k0) * easeOutSettle(p);
          running ||= p < 1;
        } else {
          const p = clamp01(t / WAVE_SINK_MS);
          next[key] = k0 * (1 - easeInOut(p));
          running ||= p < 1;
        }
      });
      liftsRef.current = next;
      draw();
      if (running) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [activeKey, draw]);

  return { shellRef, registerTab, geo, fillRef, strokeRef };
}
