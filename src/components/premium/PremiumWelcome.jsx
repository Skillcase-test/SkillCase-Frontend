import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { AnimatePresence, animate, m, useMotionValue, useTransform } from "framer-motion";
import api from "../../api/axios";
import { setUser } from "../../redux/auth/authSlice";
import { PREMIUM_PREVIEW_EVENT, PREMIUM_TIER_NAMES, premiumIntroDue, premiumTier } from "../../utils/premium";
import { isShellRoute } from "../../utils/shellRoutes";
import { isLiteMode } from "../../utils/liteMode";
import { hapticMedium } from "../../utils/haptics";
import { trackFeatureEvent } from "../../telemetry/events";
import { PLAN_TROPHY } from "./PlanCards";

// Anything that should finish before the welcome takes the screen
const BUSY_SELECTOR = "[data-premium-celebration], [aria-modal='true'], .driver-active";
const SPARKS = 10;
const EASE_OUT = [0.22, 1, 0.36, 1];
// Plus → Pro: the ring charges, bursts at LEVEL_UP_AT, then the Maya minutes count up
const LEVEL_UP_AT = 1250;
const MAYA_MINUTES = { plus: 10, pro: 30 };

/** Hides the premium header colours under the old navy until the trophy lands, then sweeps them in. */
function setReveal(state) {
  const root = document.documentElement;
  if (state) root.dataset.premiumReveal = state;
  else delete root.dataset.premiumReveal;
}

/** "Plus" rolls up and out while "Pro" rolls in, both in one grid cell so the line doesn't jump */
function TierWord({ pro }) {
  const word = (show, children, gold) => (
    <m.span
      className={`col-start-1 row-start-1 ${gold ? "text-gold-300" : ""}`}
      initial={false}
      animate={{ y: show ? "0%" : pro ? "-100%" : "100%", opacity: show ? 1 : 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
    >
      {children}
    </m.span>
  );
  return (
    <span className="inline-grid justify-items-start overflow-hidden align-bottom">
      {word(!pro, "Plus")}
      {word(pro, "Pro", true)}
    </span>
  );
}

/**
 * The one-time "you're premium now" moment: the trophy rises, the plan name appears, then the
 * trophy flies into the header pill while the header turns to the premium colours. Plays once per
 * tier per account (after paying, or on the first open of this version for existing subscribers).
 * A Plus → Pro upgrade gets its own take: the ring charges, bursts, and Plus turns into Pro.
 */
export default function PremiumWelcome({ paused = false }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const location = useLocation();
  const [run, setRun] = useState(null); // { tier, preview, upgrade }
  const [phase, setPhase] = useState("rise"); // rise → fly → done
  const [levelled, setLevelled] = useState(false);
  const minutes = useMotionValue(MAYA_MINUTES.plus);
  const minutesText = useTransform(minutes, (v) => Math.round(v));
  const [flyTo, setFlyTo] = useState(null);
  const trophyRef = useRef(null);
  const timers = useRef([]);

  const due = premiumIntroDue(user);
  const onShell = isShellRoute(location.pathname);

  const userRef = useRef(user);
  userRef.current = user;
  const runRef = useRef(null);
  runRef.current = run;
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const start = useCallback(
    (tier, preview, upgrade = false) => {
      setPhase("rise");
      setFlyTo(null);
      setLevelled(false);
      minutes.set(MAYA_MINUTES.plus);
      setRun({ tier, preview, upgrade });
      // A Plus header is already premium, so there's nothing to hide on an upgrade
      setReveal(upgrade ? null : "pending");
      hapticMedium();
      trackFeatureEvent("payments", "premium_welcome_presented", { entityId: tier, attributes: { preview, upgrade } });
      // The local copy updates once it's over: re-rendering the app mid-animation stutters it
      if (!preview) api.post("/user/premium-intro-seen", { tier }).catch(() => {});
    },
    [minutes],
  );

  // Wait for the home screen and for other modals/tours to close first, then for the
  // app to go idle, so its startup work can't stutter the animation
  useEffect(() => {
    if (!due || !onShell || paused || run) return undefined;
    let cancelled = false;
    const whenIdle = (fn) =>
      window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 300);
    const ready = () => document.visibilityState === "visible" && !document.querySelector(BUSY_SELECTOR);
    const tryStart = () => {
      if (cancelled) return;
      if (!ready()) return void timers.current.push(setTimeout(tryStart, 1000));
      whenIdle(() => {
        if (cancelled) return;
        if (ready()) start(due, false, due === "pro" && userRef.current?.premium_intro_tier === "plus");
        else timers.current.push(setTimeout(tryStart, 1000));
      });
    };
    timers.current.push(setTimeout(tryStart, 1200));
    return () => {
      cancelled = true;
    };
  }, [due, onShell, paused, run, start]);

  useEffect(() => {
    const onPreview = (e) =>
      e?.detail?.upgrade ? start("pro", true, true) : start(premiumTier(user) || "pro", true);
    window.addEventListener(PREMIUM_PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(PREMIUM_PREVIEW_EVENT, onPreview);
  }, [start, user]);

  const finish = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("done");
    setReveal(runRef.current?.upgrade ? "pill" : "sweep");
    later(() => {
      setReveal(null);
      const current = runRef.current;
      setRun(null);
      if (current && !current.preview) dispatch(setUser({ ...userRef.current, premium_intro_tier: current.tier }));
    }, 900);
  }, [dispatch]);

  const fly = useCallback(() => {
    const pill = document.querySelector("[data-premium-pill] svg");
    const trophy = trophyRef.current;
    if (!pill || !trophy || isLiteMode) return finish();
    const a = trophy.getBoundingClientRect();
    const b = pill.getBoundingClientRect();
    setFlyTo({
      x: b.left + b.width / 2 - (a.left + a.width / 2),
      y: b.top + b.height / 2 - (a.top + a.height / 2),
      scale: Math.max(0.12, b.width / a.width),
    });
    setPhase("fly");
    later(finish, 650);
  }, [finish]);

  useEffect(() => {
    if (!run || phase !== "rise") return;
    if (!run.upgrade) return void later(fly, isLiteMode ? 1600 : 2000);
    const levelUpAt = isLiteMode ? 700 : LEVEL_UP_AT;
    later(() => {
      setLevelled(true);
      if (!isLiteMode) hapticMedium();
    }, levelUpAt);
    later(() => animate(minutes, MAYA_MINUTES.pro, { duration: 0.7, ease: "easeOut" }), levelUpAt + 150);
    later(fly, levelUpAt + (isLiteMode ? 1100 : 1400));
  }, [run, phase, fly, minutes]);

  const skip = () => {
    if (phase === "rise") fly();
  };

  const name = run ? PREMIUM_TIER_NAMES[run.tier] : "";
  const flying = phase === "fly";
  const upgrade = Boolean(run?.upgrade);
  // Upgrade glow: dim while the ring charges, full at the burst
  const glowScale = flying ? 0.4 : upgrade && !levelled ? 0.7 : 1;

  return (
    <AnimatePresence>
      {run && phase !== "done" && (
        <m.div
          key="premium-welcome"
          role="dialog"
          aria-label={`Welcome to ${name}`}
          onClick={skip}
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center gap-8 px-6 select-none"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* The backdrop fades on its own so the trophy stays visible on its way to the header */}
          <m.div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-b from-black to-premium-navy"
            initial={{ opacity: 0 }}
            animate={{ opacity: flying ? 0 : 1 }}
            transition={{ duration: flying ? 0.5 : 0.3, ease: "easeOut" }}
          />
          {upgrade && (
            <m.div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-155 from-black from-25% via-premium-navy via-70% to-premium-gold"
              initial={{ opacity: 0 }}
              animate={{ opacity: levelled && !flying ? 1 : 0 }}
              transition={{ duration: flying ? 0.5 : 0.6, ease: "easeOut" }}
            />
          )}
          <div className="relative grid place-items-center">
            {!isLiteMode && (
              <m.div
                aria-hidden="true"
                className="absolute size-72 rounded-full bg-radial from-gold-300/45 via-gold-400/10 to-transparent"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: glowScale, opacity: flying ? 0 : 1 }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
              />
            )}
            {upgrade && !isLiteMode && (
              <>
                {/* Charging ring that fills, then blows outwards at the level-up */}
                <m.svg
                  aria-hidden="true"
                  viewBox="0 0 100 100"
                  className="absolute size-56 -rotate-90 overflow-visible"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={levelled ? { opacity: 0, scale: 1.35 } : { opacity: 1, scale: 1 }}
                  transition={{ duration: levelled ? 0.5 : 0.4, ease: EASE_OUT }}
                >
                  <circle cx="50" cy="50" r="47" fill="none" strokeWidth="1.5" className="stroke-white/10" />
                  <m.circle
                    cx="50"
                    cy="50"
                    r="47"
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="stroke-gold-300"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.4, duration: (LEVEL_UP_AT - 450) / 1000, ease: "easeIn" }}
                  />
                </m.svg>
                <m.div
                  aria-hidden="true"
                  className="absolute size-72 rounded-full bg-radial from-white/80 via-gold-300/40 to-transparent"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={levelled ? { opacity: [0, 1, 0], scale: [0.4, 1.4, 1.8] } : { opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </>
            )}
            {!isLiteMode &&
              (!upgrade || levelled) &&
              Array.from({ length: SPARKS }, (_, i) => {
                const angle = (i / SPARKS) * Math.PI * 2;
                const dist = 110 + (i % 3) * 18;
                return (
                  <m.span
                    key={i}
                    aria-hidden="true"
                    className="absolute size-1.5 rounded-full bg-gold-300"
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                    animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
                    transition={{ delay: (upgrade ? 0 : 0.45) + (i % 4) * 0.04, duration: 1.1, ease: "easeOut" }}
                  />
                );
              })}
            <m.div
              ref={trophyRef}
              className="relative w-36 aspect-5/6"
              initial={isLiteMode ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.6 }}
              animate={
                flying && flyTo
                  ? { opacity: 0.9, x: flyTo.x, y: flyTo.y, scale: flyTo.scale }
                  : { opacity: 1, x: 0, y: 0, scale: 1 }
              }
              transition={
                flying
                  ? { duration: 0.6, ease: [0.65, 0, 0.35, 1] }
                  : { type: "spring", stiffness: 140, damping: 14, mass: 0.9 }
              }
            >
              <img src={PLAN_TROPHY} alt="" className="size-full object-contain drop-shadow-xl" />
              {!isLiteMode && (
                // A band of light across the trophy, clipped to its shape
                <div
                  aria-hidden="true"
                  className="absolute inset-0 overflow-hidden mask-contain mask-center mask-no-repeat"
                  style={{ maskImage: `url(${PLAN_TROPHY})`, WebkitMaskImage: `url(${PLAN_TROPHY})` }}
                >
                  <m.div
                    className="absolute inset-y-0 -left-full w-full -skew-x-12 bg-linear-to-r from-transparent via-white/70 to-transparent"
                    initial={{ x: "0%" }}
                    animate={{ x: "300%" }}
                    transition={{ delay: upgrade ? LEVEL_UP_AT / 1000 : 0.7, duration: 0.9, ease: "easeInOut" }}
                  />
                </div>
              )}
            </m.div>
          </div>

          <m.div
            className="relative flex flex-col items-center gap-2 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: flying ? 0 : 1, y: flying ? -8 : 0 }}
            transition={{ delay: flying ? 0 : 0.5, duration: 0.45, ease: EASE_OUT }}
          >
            {upgrade ? (
              <>
                <p className="text-gold-300 text-sm font-medium">{levelled ? "You're now on" : "Levelling up"}</p>
                <h2 className="text-white text-3xl font-bold">
                  Career <TierWord pro={levelled} />
                </h2>
                <p className="text-white/70 text-sm">
                  Talk to Maya ·{" "}
                  <m.span className="inline-block min-w-[2ch] text-white font-semibold tabular-nums">{minutesText}</m.span> min a day
                </p>
              </>
            ) : (
              <>
                <p className="text-gold-300 text-sm font-medium">Welcome to</p>
                <h2 className="text-white text-3xl font-bold">{name}</h2>
                <p className="text-white/70 text-sm">Unlimited access to every feature is now yours</p>
              </>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
