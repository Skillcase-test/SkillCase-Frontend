import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, m } from "framer-motion";
import { Check, X } from "lucide-react";
import api from "../../api/axios";
import { setUser } from "../../redux/auth/authSlice";
import mayaSad from "../../assets/onboarding/mayaSad.webp";
import { PREMIUM_PREVIEW_EVENT, PREMIUM_TIER_NAMES, planFeatures, premiumTransition } from "../../utils/premium";
import { isShellRoute } from "../../utils/shellRoutes";
import { isLiteMode } from "../../utils/liteMode";
import { hapticMedium } from "../../utils/haptics";
import { trackFeatureEvent } from "../../telemetry/events";
import { PLAN_TROPHY } from "./PlanCards";
import { setExitCardOpen, setLookPreview } from "./usePremiumLook";

const BUSY_SELECTOR = "[data-premium-celebration], [aria-modal='true'], .driver-active";
const EASE_OUT = [0.22, 1, 0.36, 1];
// crack → fall → drain → card. A Pro → Plus downgrade skips the drain: the header stays premium.
const FALL_AT = 550;
const DRAIN_AT = 1150;
const CARD_AT = 2300;
const DOWNGRADE_CARD_AT = 1600;
// Jagged split through the pill; the crack line follows the same points
const LEFT_HALF = "polygon(0 0, 50% 0, 44% 35%, 56% 58%, 47% 100%, 0 100%)";
const RIGHT_HALF = "polygon(50% 0, 100% 0, 100% 100%, 47% 100%, 56% 58%, 44% 35%)";
const MAYA_MINUTES = { plus: 10, pro: 30 };

function setExitStep(step) {
  const root = document.documentElement;
  if (step) root.dataset.premiumExit = step;
  else delete root.dataset.premiumExit;
}

/** What the card says for each way of losing access */
function copyFor({ from, to }, user) {
  const name = from === "trial" ? "free trial" : PREMIUM_TIER_NAMES[from];
  if (from === "pro" && to === "plus")
    return {
      title: "Career Pro has ended",
      sub: "You're on Career Plus now.",
      perksTitle: "Upgrade again to get",
      // Pro's only extra over Plus is Maya time
      perks: planFeatures(user, MAYA_MINUTES.pro).slice(0, 1),
      cta: "Get Career Pro back",
      stay: "OK",
    };
  return {
    title: `Your ${name} has ended`,
    sub: to === "trial" ? "You're on your free trial for now." : "You're back on the Free plan.",
    perksTitle: from === "trial" ? "Upgrade to get" : "Upgrade again to get",
    // Same list as the upgrade page; the trial was Career Plus
    perks: planFeatures(user, MAYA_MINUTES[from === "trial" ? "plus" : from]),
    cta: from === "trial" ? "Get Career Plus" : "Get it back",
    stay: "Continue with free",
  };
}

/** The crack across the real pill, then two halves of it (cloned where it sits) that drop away */
function PillShards({ rect, source, falling }) {
  const left = useRef(null);
  const right = useRef(null);
  useLayoutEffect(() => {
    if (!falling || !source) return;
    for (const holder of [left.current, right.current]) {
      if (!holder) continue;
      const clone = source.cloneNode(true);
      clone.removeAttribute("data-premium-pill");
      clone.removeAttribute("href");
      holder.replaceChildren(clone);
    }
  }, [source, falling]);
  const half = (ref, clip, dir) => (
    <m.div
      ref={ref}
      className="absolute inset-0"
      style={{ clipPath: clip }}
      initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
      animate={{ x: dir * 14, y: 140, rotate: dir * 24, opacity: 0 }}
      transition={{ duration: 0.85, ease: [0.55, 0, 1, 0.45] }}
    />
  );
  return (
    <div className="fixed z-9999 pointer-events-none" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
      {falling ? (
        <>
          {half(left, LEFT_HALF, -1)}
          {half(right, RIGHT_HALF, 1)}
        </>
      ) : (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <m.path
            d="M50 0 L44 35 L56 58 L47 100"
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeWidth="1.5"
            className="stroke-white"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.25, duration: 0.2, ease: "easeIn" }}
          />
        </svg>
      )}
    </div>
  );
}

function ExitCard({ copy, onCta, onStay }) {
  return (
    <m.div
      key="premium-exit-card"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-radial from-slate-900/70 to-slate-950/95 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <m.div
        className="relative w-full max-w-sm rounded-3xl bg-white px-6 pt-8 pb-6 flex flex-col items-center gap-5 text-center"
        initial={isLiteMode ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onStay}
          className="absolute top-2.5 right-2.5 size-7 rounded-full bg-black/25 text-white flex items-center justify-center"
        >
          <X className="size-3.5" />
        </button>
        <div className="relative">
          <div className="size-24 rounded-full bg-blue-100 overflow-hidden">
            <img src={mayaSad} alt="" className="size-full object-cover" />
          </div>
          {/* The trophy they had, gone grey */}
          <img
            src={PLAN_TROPHY}
            alt=""
            className="absolute -right-3 -bottom-1 w-9 aspect-5/6 object-contain grayscale opacity-70 -rotate-12"
          />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-blue-950 text-xl font-bold">{copy.title}</h2>
          <p className="text-slate-500 text-sm">{copy.sub}</p>
        </div>
        {/* What upgrading brings back, framed as a reason to come back rather than a loss */}
        <div className="w-full flex flex-col gap-2.5 rounded-2xl bg-gold-300/15 border border-gold-300/40 p-3 text-left">
          <p className="text-blue-950 text-xs font-semibold">{copy.perksTitle}</p>
          <ul className="flex flex-col gap-2">
            {copy.perks.map((line) => (
              <li key={line} className="flex items-center gap-2.5 text-sm text-slate-700">
                <span className="size-5 rounded-full bg-gold-400 grid place-items-center shrink-0">
                  <Check className="size-3 text-blue-950" strokeWidth={3} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full flex flex-col gap-2">
          <button
            type="button"
            onClick={onCta}
            className="w-full rounded-full bg-gold-400 py-3 text-blue-950 text-sm font-bold active:scale-95 transition-transform"
          >
            {copy.cta}
          </button>
          <button type="button" onClick={onStay} className="w-full py-2 text-slate-500 text-sm font-medium">
            {copy.stay}
          </button>
        </div>
      </m.div>
    </m.div>
  );
}

/**
 * The opposite of the premium welcome, played once when a trial or plan ends (or Pro drops
 * to Plus): the pill cracks and falls, the premium colours drain out of the header and the old
 * navy sweeps back in, then Maya says what's gone with a way to get it back.
 */
export default function PremiumExit({ paused = false }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(null); // { from, to, preview }
  const [step, setStep] = useState(null); // crack | fall | drain | card
  const [shards, setShards] = useState(null); // { rect, source }
  const timers = useRef([]);
  const userRef = useRef(user);
  userRef.current = user;

  const transition = premiumTransition(user);
  const due = transition?.kind === "exit" ? transition : null;
  const onShell = isShellRoute(location.pathname);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // The header shows the real (lower) look from here on
  const commit = useCallback(
    (current) => {
      if (current.preview) setLookPreview(current.to);
      else dispatch(setUser({ ...userRef.current, premium_intro_tier: current.to }));
    },
    [dispatch],
  );

  const start = useCallback(
    (from, to, preview) => {
      const current = { from, to, preview };
      const downgrade = to === "plus";
      if (preview) setLookPreview(from);
      setRun(current);
      setExitCardOpen(true);
      trackFeatureEvent("payments", "premium_exit_presented", { entityId: from, attributes: { to, preview } });
      // Stored now so a crash mid-animation doesn't replay it; the local copy waits for the end
      if (!preview) api.post("/user/premium-intro-seen", { tier: to }).catch(() => {});

      if (isLiteMode) {
        later(() => {
          commit(current);
          setStep("card");
        }, 300);
        return;
      }
      setStep("crack");
      setExitStep("crack");
      hapticMedium();
      // Let the preview's header render before the pill is measured
      requestAnimationFrame(() => {
        const pill = document.querySelector("[data-premium-pill]");
        if (pill) setShards({ rect: pill.getBoundingClientRect(), source: pill });
      });
      later(() => {
        setStep("fall");
        setExitStep("fall");
        hapticMedium();
      }, FALL_AT);
      if (downgrade) {
        later(() => {
          setExitStep(null);
          setShards(null);
          commit(current);
          document.documentElement.dataset.premiumReveal = "pill";
        }, DOWNGRADE_CARD_AT - 400);
        later(() => {
          delete document.documentElement.dataset.premiumReveal;
          setStep("card");
        }, DOWNGRADE_CARD_AT);
        return;
      }
      later(() => {
        setStep("drain");
        setExitStep("drain");
      }, DRAIN_AT);
      later(() => {
        setShards(null);
        commit(current);
        setExitStep(null);
        setStep("card");
      }, CARD_AT);
    },
    [commit],
  );

  // Same patience as the welcome: home screen, nothing else open, app idle
  useEffect(() => {
    if (!due || !onShell || paused || run) return undefined;
    let cancelled = false;
    const ready = () => document.visibilityState === "visible" && !document.querySelector(BUSY_SELECTOR);
    const whenIdle = (fn) =>
      window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 300);
    const tryStart = () => {
      if (cancelled) return;
      if (!ready()) return void timers.current.push(setTimeout(tryStart, 1000));
      whenIdle(() => {
        if (cancelled) return;
        if (ready()) start(due.from, due.to, false);
        else timers.current.push(setTimeout(tryStart, 1000));
      });
    };
    timers.current.push(setTimeout(tryStart, 1200));
    return () => {
      cancelled = true;
    };
  }, [due, onShell, paused, run, start]);

  useEffect(() => {
    const onPreview = (e) => {
      const kind = e?.detail?.kind;
      if (kind === "trial-exit") start("trial", "", true);
      else if (kind === "plan-exit") start("plus", "", true);
    };
    window.addEventListener(PREMIUM_PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(PREMIUM_PREVIEW_EVENT, onPreview);
  }, [start]);

  const close = (goUpgrade) => {
    const current = run;
    trackFeatureEvent("payments", goUpgrade ? "premium_exit_upgrade_clicked" : "premium_exit_dismissed", {
      entityId: current?.from,
    });
    // The card stands in for the trial-ended modal, so it shouldn't come back after
    if (current?.from === "trial" && !current.preview)
      api
        .post("/user/dismiss-trial-ended")
        .then(({ data }) => data?.user && dispatch(setUser(data.user)))
        .catch(() => {});
    setRun(null);
    setStep(null);
    setExitCardOpen(false);
    if (current?.preview) setLookPreview(null);
    if (goUpgrade) navigate("/profile/upgrade");
  };

  return (
    <>
      {shards && step !== "card" && <PillShards rect={shards.rect} source={shards.source} falling={step !== "crack"} />}
      <AnimatePresence>
        {run && step === "card" && <ExitCard copy={copyFor(run, user)} onCta={() => close(true)} onStay={() => close(false)} />}
      </AnimatePresence>
    </>
  );
}
