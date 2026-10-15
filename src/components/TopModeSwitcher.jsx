import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getLGMode, setLGMode } from "../api/learnGermanApi";
import { trackJourneyEvent } from "../observability/journeyEvents";
import { hapticLight } from "../utils/haptics";
import { isPracticeSuiteLevel } from "../utils/b1Progress";
import { isPremiumUser } from "../utils/premium";
import { syncModeIntoRedux } from "../utils/lgMode";
import {
  isScholarshipRoute,
  getSwitcherBlendColor,
} from "../utils/shellRoutes";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { canAnimateRoutes, runHubSwitch, setNavMotion } from "../router/navigation";
import bookImg from "../assets/book.webp";
import { getMayaImage } from "../utils/mayaAvatars";
import classImg from "../assets/class.webp";
import bagImg from "../assets/bag.webp";

const isLearnPath = (pathname = "") => pathname.startsWith("/learn-german");
const isCoursesPath = (pathname = "") => pathname === "/video-courses";
const RECENT_MODE_SWITCH_MS = 10_000;

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
 * Top mode switcher — the redesigned replacement for BottomModeSwitcher.
 * Renders inside the navy navbar header on the three primary shell screens:
 * "/" (Exam & Practice), "/learn-german" (Guided Learning) and
 * "/video-courses" (German Classes). The active tab is derived from the
 * current route; Learn/Practice still persist the legacy lg_preferred_mode
 * so LandingPage redirects + navbar behavior stay consistent.
 */
export default function TopModeSwitcher({ isTourActive = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled } = useFeatureFlags();
  const showGermanClasses = isFeatureEnabled("german_classes");
  // B1/B2 users get a two-tab switcher: Exam & Practice + Jobs. The Jobs tab
  // is the gateway into the job-screening pipeline (and back via practice).
  const isB1 = isPracticeSuiteLevel(user?.user_prof_level);
  const isPremium = isPremiumUser(user);
  const [localTourActive, setLocalTourActive] = useState(false);

  useEffect(() => {
    const handleTourStart = () => setLocalTourActive(true);
    const handleTourEnd = () => setLocalTourActive(false);

    window.addEventListener("lgTourStart", handleTourStart);
    window.addEventListener("lgTourEnd", handleTourEnd);

    return () => {
      window.removeEventListener("lgTourStart", handleTourStart);
      window.removeEventListener("lgTourEnd", handleTourEnd);
    };
  }, []);

  const [isJobWelcome, setIsJobWelcome] = useState(false);

  useEffect(() => {
    const handleJobWelcome = (e) => {
      setIsJobWelcome(Boolean(e?.detail?.isWelcome));
    };
    window.addEventListener("jobScreeningWelcome", handleJobWelcome);
    return () => {
      window.removeEventListener("jobScreeningWelcome", handleJobWelcome);
    };
  }, []);

  const tourActive = isTourActive || localTourActive;

  // Exact page-top color of the current shell page. The active tab + its
  // concave notch are filled with this color so the tab melts into the page
  // below (white on white pages, sky-blue on learn-german / job-screening,
  // dark navy on the job-screening welcome screen).
  const baseBlendColor = getSwitcherBlendColor(location.pathname);
  const blendColor =
    location.pathname === "/job-screening" && isJobWelcome
      ? "#002856"
      : baseBlendColor;

  // Scholarship hub: static single-tab switcher stating the context. The
  // exam chrome is route-scoped so the switcher renders regardless of the
  // user's saved mode (they may have switched to practice meanwhile).
  const isScholarship = isScholarshipRoute(location.pathname);

  const routeTab = isB1
    ? location.pathname.startsWith("/job-screening")
      ? "jobs"
      : isCoursesPath(location.pathname)
        ? "courses"
        : "practice"
    : isLearnPath(location.pathname)
      ? "learn"
      : isCoursesPath(location.pathname)
        ? "courses"
        : "practice";

  // The tapped tab lights up immediately (the notch glides there) instead of
  // waiting for the destination screen's chunk; the route takes over once it lands.
  const [pendingTab, setPendingTab] = useState(null);
  useEffect(() => setPendingTab(null), [location.key]);
  const activeTab = pendingTab ?? routeTab;

  const switchTo = (path, tab) => {
    setNavMotion("forward", "tab");
    setPendingTab(tab);
    runHubSwitch(
      navigate(path, {
        replace: true,
        ...(canAnimateRoutes && { viewTransition: true }),
      }),
    );
  };

  // Mirror the mode onto the redux user too: destination screens gate on it and
  // would bounce us back if they read the pre-switch value.
  const syncMode = (mode) => {
    localStorage.setItem("lg_preferred_mode", mode);
    syncModeIntoRedux(mode);
  };

  // Keep localStorage in sync with the route. The active tab itself is always
  // derived from the route, so this only ever *writes* "learn" (mirroring the
  // old switcher). We never auto-persist "practice" here — LandingPage's
  // prefersLearnMode redirect relies on a stored "learn" preference surviving.
  useEffect(() => {
    if (isLearnPath(location.pathname)) {
      syncMode("learn");
    }
  }, [location.pathname]);

  // Mirror external mode changes (e.g. navbar/other flows) into localStorage.
  useEffect(() => {
    const handleModeChange = (event) => {
      const mode = event?.detail?.mode;
      if (mode === "learn" || mode === "practice") {
        syncMode(mode);
      }
    };
    window.addEventListener("lgModeChange", handleModeChange);
    return () => window.removeEventListener("lgModeChange", handleModeChange);
  }, []);

  // Seed localStorage from the DB on mount (never overrides current route).
  useEffect(() => {
    let cancelled = false;
    getLGMode()
      .then((res) => {
        if (cancelled) return;
        const recentMode = localStorage.getItem("lg_preferred_mode");
        const recentSwitchAt = Number(
          localStorage.getItem("lg_mode_switched_at") || 0,
        );
        if (
          (recentMode === "learn" || recentMode === "practice") &&
          Date.now() - recentSwitchAt < RECENT_MODE_SWITCH_MS
        ) {
          return;
        }
        // The DB can't represent "courses" (server whitelist has no such
        // value), so a stored courses selection must survive this seed.
        if (recentMode === "courses") return;
        if (isLearnPath(window.location.pathname)) {
          syncMode("learn");
          return;
        }
        if (isCoursesPath(window.location.pathname)) return;
        const mode = res.data?.mode || "practice";
        syncMode(mode);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSwitch = (tab) => {
    if (tab === activeTab) return;

    hapticLight();

    if (isB1 && tab === "jobs") {
      // Enter the job-screening pipeline. Persisting the mode server-side is
      // what makes them eligible; the permanent user_job_screening record (and
      // hence admin visibility) follows from entering the pipeline at all.
      syncMode("job_screening");
      localStorage.setItem("lg_mode_switched_at", String(Date.now()));
      window.dispatchEvent(
        new CustomEvent("lgModeChange", {
          detail: { mode: "job_screening" },
        }),
      );
      trackJourneyEvent("lg_mode_switched", {
        lg_mode: "job_screening",
        lg_mode_source: activeTab,
        lg_switcher_route: location.pathname,
      });
      setLGMode("job_screening").catch((err) => {
        console.error("Failed to set mode:", err);
      });
      switchTo("/job-screening", "jobs");
      return;
    }

    if (tab === "courses") {
      trackJourneyEvent("lg_mode_switched", {
        lg_mode: "courses",
        lg_mode_source: activeTab,
        lg_switcher_route: location.pathname,
      });
      // Persist locally (localStorage + redux) so the Home tap — "/" then
      // LandingPage's redirect — returns to German Classes. Kept client-side
      // only: /user/lg-mode whitelists learn/practice/job_screening/
      // scholarship and would silently store "learn".
      syncMode("courses");
      localStorage.setItem("lg_mode_switched_at", String(Date.now()));
      switchTo("/video-courses", "courses");
      return;
    }

    const mode = tab === "learn" ? "learn" : "practice";

    // Write to localStorage FIRST — destination page reads this before any DB call returns
    syncMode(mode);
    localStorage.setItem("lg_mode_switched_at", String(Date.now()));

    // Notify Navbar and any other listeners immediately
    window.dispatchEvent(new CustomEvent("lgModeChange", { detail: { mode } }));
    trackJourneyEvent("lg_mode_switched", {
      lg_mode: mode,
      lg_mode_source: activeTab,
      lg_switcher_route: location.pathname,
    });

    // Persist to backend (async, non-blocking)
    setLGMode(mode).catch((err) => {
      console.error("Failed to set mode:", err);
    });

    // Navigate
    if (mode === "learn") {
      sessionStorage.setItem("lg_animate_switcher", "true");
      switchTo("/learn-german", "learn");
    } else {
      switchTo("/", "practice");
    }
  };

  const handlePreload = (mode) => {
    if (mode === "learn") {
      import("../pages/learnGerman/LearnGermanHome");
    } else if (mode === "jobs") {
      import("../pages/jobScreening/JobScreening");
    } else if (mode === "courses") {
      import("../pages/videoCourses/CourseSelectPage");
    }
  };

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
  const visualActive = isScholarship ? "scholarship" : activeTab;

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
  }, [isB1, isScholarship, showGermanClasses]);

  useLayoutEffect(draw, [geo, draw]);

  useLayoutEffect(() => {
    const from = liftsRef.current;
    if (!Object.keys(from).length || prefersReducedMotion()) {
      liftsRef.current = { [visualActive]: 1 };
      draw();
      return undefined;
    }

    const keys = new Set([...Object.keys(from), visualActive]);
    // Re-tapped mid-wave: a tab that's already partly up rises straight away
    const riseDelay = (from[visualActive] ?? 0) > 0.05 ? 0 : WAVE_RISE_DELAY_MS;
    const start = performance.now();
    const step = (now) => {
      const t = now - start;
      let running = false;
      const next = {};
      keys.forEach((key) => {
        const k0 = from[key] ?? 0;
        if (key === visualActive) {
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
  }, [visualActive, draw]);

  return (
    <div
      id="bottom-mode-switcher"
      ref={shellRef}
      className={`relative w-full pt-1 pb-0 vt-app-switcher ${
        isPremium ? "bg-premium-band bg-premium-band-below" : "bg-[#002856]"
      } ${tourActive ? "pointer-events-none" : ""}`}
    >
      {isPremium && <span aria-hidden="true" className="premium-veil premium-veil-late" />}
      {geo && (
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
          viewBox={`0 0 ${geo.width} ${geo.height}`}
          preserveAspectRatio="none"
        >
          {/* d is written per frame by draw() */}
          <path
            ref={fillRef}
            fill={blendColor}
            style={{ transition: "fill 240ms ease-out" }}
            shapeRendering="geometricPrecision"
          />
          <path
            ref={strokeRef}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
            shapeRendering="geometricPrecision"
          />
        </svg>
      )}

      <div className="relative w-full max-w-7xl mx-auto px-2 sm:px-2">
        <div
          role="tablist"
          aria-label="Learning mode"
          className="flex items-end gap-2"
        >
          {isScholarship ? (
            <SwitcherTab
              active={true}
              registerTab={registerTab}
              onClick={() => {}}
              image={bookImg}
              line1="Exam"
              blendColor={blendColor}
              tourTabKey="scholarship"
            />
          ) : isB1 ? (
            <>
              <SwitcherTab
                active={activeTab === "practice"}
                registerTab={registerTab}
                onClick={() => handleSwitch("practice")}
                image={bookImg}
                line1="Job Preparation"
                line2=""
                blendColor={blendColor}
                tourTabKey="practice"
              />
              <SwitcherTab
                active={activeTab === "jobs"}
                registerTab={registerTab}
                onClick={() => handleSwitch("jobs")}
                onPreload={() => handlePreload("jobs")}
                image={bagImg}
                line1="German Jobs"
                line2=""
                blendColor={blendColor}
                tourTabKey="jobs"
              />
              {showGermanClasses && (
                <SwitcherTab
                  active={activeTab === "courses"}
                  registerTab={registerTab}
                  onClick={() => handleSwitch("courses")}
                  onPreload={() => handlePreload("courses")}
                  image={classImg}
                  line1="German"
                  line2="Classes"
                  blendColor={blendColor}
                  tourTabKey="courses"
                />
              )}
            </>
          ) : (
            <>
              <SwitcherTab
                active={activeTab === "learn"}
                registerTab={registerTab}
                onClick={() => handleSwitch("learn")}
                onPreload={() => handlePreload("learn")}
                image={getMayaImage("smiling", user?.occupation)}
                line1="Guided"
                line2="German"
                blendColor={blendColor}
                tourTabKey="learn"
              />
              <SwitcherTab
                active={activeTab === "practice"}
                registerTab={registerTab}
                onClick={() => handleSwitch("practice")}
                image={bookImg}
                line1="German"
                line2="Practice"
                blendColor={blendColor}
                tourTabKey="practice"
              />
              {showGermanClasses && (
                <SwitcherTab
                  active={activeTab === "courses"}
                  registerTab={registerTab}
                  onClick={() => handleSwitch("courses")}
                  onPreload={() => handlePreload("courses")}
                  image={classImg}
                  line1="German"
                  line2="Classes"
                  blendColor={blendColor}
                  tourTabKey="courses"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SwitcherTab({
  active,
  registerTab,
  onClick,
  onPreload,
  image,
  line1,
  line2,
  blendColor = "#ffffff",
  tourTabKey,
}) {
  // Every tab keeps the full raised size so nothing reflows mid-switch; the
  // inactive look is just the pill behind it, and the raised shape is drawn
  // by the switcher's SVG.
  return (
    <button
      type="button"
      role="tab"
      ref={(el) => registerTab(tourTabKey, el)}
      id={tourTabKey ? `top-switcher-tab-${tourTabKey}` : undefined}
      data-tour-tab={tourTabKey}
      onClick={onClick}
      onPointerEnter={onPreload}
      onTouchStart={onPreload}
      aria-selected={active}
      className={`group relative flex-1 h-[53px] -mb-[1px] px-1.5 sm:px-2.5 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
        active ? "z-10" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-[9px] h-11 rounded-lg bg-white/10 group-hover:bg-white/15 transition-opacity duration-200 ${
          active ? "opacity-0" : "opacity-100"
        }`}
      />
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className={`relative z-10 w-7 h-7 sm:w-9 sm:h-6 object-contain shrink-0 transition-[opacity,transform] duration-300 ease-out ${
          active ? "" : "opacity-80 -translate-y-1"
        }`}
      />
      <div
        className={`relative z-10 flex flex-col ${
          line2 ? "text-left" : "text-center"
        } text-[10px] sm:text-xs leading-[11px] transition-[color,transform] duration-300 ease-out ${
          active
            ? blendColor === "#002856"
              ? "text-white font-bold delay-100"
              : "text-[#002856] font-bold delay-100"
            : "text-white/90 font-medium -translate-y-1"
        }`}
      >
        <span>{line1}</span>
        {line2 ? <span>{line2}</span> : null}
      </div>
    </button>
  );
}
