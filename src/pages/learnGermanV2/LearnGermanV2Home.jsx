import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Check, Lock, MapPin } from "lucide-react";
import {
  getLg2Art,
  getLg2Curriculum,
  getLg2State,
  trackLg2Visit,
} from "../../api/learnGermanV2Api";
import { loadArtManifest, moduleScene, settingName } from "./lib/vocabArt";
import {
  nextSub,
  subKey,
  topicFullyDone,
  totalTaughtWords,
} from "./lib/curriculum";
import Maya from "./components/Maya";
import {
  useUsageLimitGate,
  useUsageLimitModule,
} from "../../hooks/useUsageLimits";
import { setClarityTag, trackClarityEvent } from "../../observability/clarity";

import bg1 from "../../assets/2.webp";
import bg2 from "../../assets/1.webp";
import bg3 from "../../assets/3.webp";

const LG2_FALLBACK_IMAGE =
  "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1778253329/99ee50b94881e4e072cc6de5dde475531353120d_f100ew.webp";

const CityBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <img
      src={bg1}
      alt=""
      className="absolute top-[15%] right-[0%] w-[35%] max-w-[250px] object-contain"
    />
    <img
      src={bg2}
      alt=""
      className="absolute top-[50%] left-[-6%] w-[55%] max-w-[300px] object-contain"
    />
    <img
      src={bg3}
      alt=""
      className="absolute bottom-[2%] right-[-8%] w-[55%] max-w-[350px] object-contain"
    />
  </div>
);

// Same dashed ribbon the v1 journey draws between medallions.
const RoadSegment = ({ direction }) => {
  const isLeftToRight = direction === "left-to-right";
  const pathD = isLeftToRight
    ? "M 160,80 C 330,20 280,200 260,280 L 260,400"
    : "M 190,80 C 20,20 70,200 90,280 L 90,400";

  return (
    <div className="absolute top-[30px] left-0 w-full h-[400px] pointer-events-none -z-10">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 352 400"
        fill="none"
        className="overflow-visible"
      >
        <path
          d={pathD}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="44"
          strokeLinecap="round"
        />
        <path
          d={pathD}
          stroke="#e2e8f0"
          strokeWidth="42"
          strokeLinecap="round"
        />
        <path
          d={pathD}
          stroke="#ffffff"
          strokeWidth="38"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// Signpost naming where the next run of topics happens — the reference home
// groups consecutive same-setting topics into one leg of the journey.
const SettingSignpost = ({ setting }) => (
  <div className="w-full flex justify-center py-1 relative z-10">
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-white/60">
      <MapPin className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-[11px] font-semibold text-slate-600">
        {settingName(setting)}
      </span>
    </div>
  </div>
);

const SubDots = ({ topic, done }) => (
  <div className="flex items-center gap-1">
    {topic.subs.map((s) => {
      const finished = done.includes(subKey(topic, s));
      return (
        <span
          key={s.key}
          className={`h-1.5 rounded-full transition-colors ${
            finished ? "w-4 bg-[#00c853]" : "w-1.5 bg-black/20"
          }`}
        />
      );
    })}
  </div>
);

function CompletedCard({ topic, displayId, done, onRestart, onRecap }) {
  return (
    <div className="w-[200px] h-full px-2.5 pt-2.5 pb-3 bg-gradient-to-br from-blue-50 to-blue-200 rounded-[20px] shadow-[2px_2px_4px_0px_rgba(0,0,0,0.25)] outline-[5px] outline-offset-[-5px] outline-white flex flex-col items-center gap-2.5 relative overflow-visible">
      <div className="absolute -right-2 -top-2 size-8 bg-[#00c853] rounded-full border-2 border-white flex items-center justify-center shadow-md z-20">
        <Check className="w-5 h-5 text-white" strokeWidth={3} />
      </div>
      <div className="w-full h-28 overflow-hidden rounded-[10px]">
        <img
          className="w-full h-full object-cover"
          src={moduleScene(topic) || LG2_FALLBACK_IMAGE}
          alt={topic.title}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="px-2 py-0.5 bg-black/10 rounded-[10px]">
          <span className="text-black/40 text-[10px] font-medium">
            Level {displayId} completed
          </span>
        </div>
        <div className="text-center text-black text-sm font-semibold opacity-50 px-2 leading-tight">
          {topic.title}
        </div>
        <SubDots topic={topic} done={done} />
      </div>
      <div className="w-full flex gap-1 mt-auto z-20 h-9 relative items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRestart?.();
          }}
          className="w-11 h-9 bg-white rounded-[10px] shadow-md/30 flex items-center justify-center text-[#414651] hover:bg-gray-50 active:scale-95 transition-all cursor-pointer border border-[#e5e7eb]/40 shrink-0"
          title="Restart lesson"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-[#414651]"
          >
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <polygon
              points="10.5 9.5 15.5 12 10.5 14.5"
              fill="currentColor"
            />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRecap?.();
          }}
          className="flex-1 h-9 bg-white rounded-[10px] shadow-md/30 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all cursor-pointer border border-[#e5e7eb]/40"
        >
          <span className="text-[#09090b] text-sm font-semibold">Recap</span>
        </button>
      </div>
    </div>
  );
}

function ActiveCard({ topic, displayId, done, inProgress, onStart }) {
  const upcoming = nextSub(topic, done);
  const resumeKey = subKey(topic, upcoming);
  const resumeAt = inProgress?.[resumeKey];
  const btnText =
    typeof resumeAt === "number" && resumeAt > 0
      ? `Continue · ${upcoming.label}`
      : `Start · ${upcoming.label}`;

  return (
    <div className="w-[200px] h-full px-2.5 pt-2.5 pb-3 bg-gradient-to-br from-yellow-100 to-orange-300 rounded-[20px] shadow-[2px_2px_4px_0px_rgba(0,0,0,0.25)] outline-[5px] outline-offset-[-5px] outline-white flex flex-col items-center gap-2.5 relative overflow-visible">
      <div className="w-full h-28 overflow-hidden rounded-[10px]">
        <img
          className="w-full h-full object-cover"
          src={moduleScene(topic) || LG2_FALLBACK_IMAGE}
          alt={topic.title}
          loading="eager"
          decoding="async"
        />
      </div>
      <div className="flex flex-col items-center gap-3 w-full">
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="px-2 py-0.5 bg-black/10 rounded-[10px]">
            <span className="text-black/60 text-[10px] font-medium">
              Level {displayId}
            </span>
          </div>
          <div className="text-center text-black text-[15px] font-bold leading-tight px-1">
            {topic.title}
          </div>
          <SubDots topic={topic} done={done} />
        </div>
        <button
          onClick={onStart}
          className="w-full h-9 bg-white rounded-[10px] shadow-[0px_3px_8px_0px_rgba(0,0,0,0.25)] flex justify-center items-center active:scale-95 transition-colors whitespace-nowrap"
        >
          <span className="text-black text-sm font-semibold">{btnText}</span>
        </button>
      </div>
    </div>
  );
}

function LockedCard({ topic, displayId }) {
  return (
    <div className="w-[200px] h-full px-2.5 pt-2.5 pb-3 bg-gradient-to-br from-neutral-200 to-zinc-400 rounded-[20px] shadow-[2px_2px_4px_0px_rgba(0,0,0,0.25)] outline-[5px] outline-offset-[-5px] outline-white flex flex-col items-center gap-2.5">
      <div className="absolute right-0 -top-3 size-8 bg-white rounded-full flex items-center justify-center shadow-md z-20 outline-[3px] outline-white/50">
        <Lock className="w-4 h-4 text-zinc-500" />
      </div>
      <div className="w-full h-28 overflow-hidden rounded-[10px]">
        <img
          className="w-full h-full object-cover opacity-60 grayscale"
          src={moduleScene(topic) || LG2_FALLBACK_IMAGE}
          alt={topic.title}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="px-2 py-0.5 bg-black/10 rounded-[10px]">
          <span className="text-black/40 text-[10px] font-medium">
            Level {displayId}
          </span>
        </div>
        <div className="text-center text-black text-sm font-semibold opacity-50 px-2 leading-tight">
          {topic.title}
        </div>
      </div>
    </div>
  );
}

function JourneySkeleton() {
  return (
    <>
      {[0, 1, 2].map((idx) => {
        const isLeft = idx % 2 === 0;
        return (
          <div
            key={idx}
            className={`w-full flex ${
              isLeft ? "justify-start pl-2" : "justify-end pr-2"
            } relative`}
          >
            {idx < 2 && (
              <RoadSegment
                direction={isLeft ? "left-to-right" : "right-to-left"}
              />
            )}
            <div className="w-[200px] h-[230px] px-2.5 pt-2.5 pb-3 bg-white/70 backdrop-blur-sm rounded-[20px] shadow-sm border border-white/60 flex flex-col items-center gap-2.5 animate-pulse">
              <div className="w-full h-28 bg-slate-200/80 rounded-[10px]" />
              <div className="h-3 w-16 bg-slate-200/80 rounded-full" />
              <div className="h-4 w-28 bg-slate-200/80 rounded-md" />
              <div className="h-8 w-full bg-slate-200/80 rounded-full mt-auto" />
            </div>
          </div>
        );
      })}
    </>
  );
}

const EMPTY = [];
const EMPTY_OBJ = {};

const StatChip = ({ icon, value, label }) => (
  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-white/60">
    <span className="text-sm leading-none" aria-hidden="true">
      {icon}
    </span>
    <span className="text-xs font-bold text-slate-700">{value}</span>
    <span className="text-[10px] font-medium text-slate-500">{label}</span>
  </div>
);

export default function LearnGermanV2Home() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Same gate as v1 — the variant switch does not change the monetization
  // model, and the completion endpoint enforces the same module server-side.
  useUsageLimitGate(user?.user_prof_level, "learn_german");
  const { locked: usageLocked } = useUsageLimitModule(
    user?.user_prof_level,
    "learn_german",
  );

  const [topics, setTopics] = useState([]);
  const [learner, setLearner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const activeCardRef = useRef(null);

  useEffect(() => {
    setClarityTag("lg_funnel", "learn_home");
    setClarityTag("lg_mode", "learn");
    setClarityTag("lg_variant", "v2");
    trackClarityEvent("lg_home_viewed", {
      lg_funnel: "learn_home",
      lg_mode: "learn",
      lg_variant: "v2",
      lg_prof_level: user?.user_prof_level || "unknown",
    });
  }, [user?.user_prof_level]);

  useEffect(() => {
    trackLg2Visit().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // Art loads through the module-level manifest so every screen that
        // renders after this one resolves names synchronously.
        const [curRes, stateRes] = await Promise.all([
          getLg2Curriculum(),
          getLg2State(),
          loadArtManifest(getLg2Art),
        ]);
        if (cancelled) return;
        setTopics(curRes?.data?.topics || []);
        setLearner(stateRes?.data || null);
      } catch (err) {
        if (!cancelled) setLoadError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Module-level empties keep these references stable between renders so
  // useMemo/topicFullyDone don't recompute against a fresh [] each time.
  const done = learner?.done || EMPTY;
  const inProgress = learner?.inProgress || EMPTY_OBJ;
  const reviewCount = learner?.review?.length || 0;
  const wordsLearned = learner?.stats?.words?.length || 0;
  const totalWords = useMemo(() => totalTaughtWords(topics), [topics]);

  // First not-fully-done topic is the live one; everything after it locks.
  const activeIndex = useMemo(
    () => topics.findIndex((t) => !topicFullyDone(t, done)),
    [topics, done],
  );

  // Land on the live medallion, not the top of a 69-topic journey.
  useEffect(() => {
    if (loading || activeIndex < 0 || !activeCardRef.current) return;
    activeCardRef.current.scrollIntoView({ block: "center", behavior: "auto" });
  }, [loading, activeIndex]);

  const openSub = (topic, sub) =>
    navigate(`/learn-german/v2/lesson/${topic.id}/${sub.key}`);

  const restartTopic = (topic) => {
    const first = topic.subs[0];
    if (first) openSub(topic, first);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-sky-100 relative pb-32 overflow-x-hidden">
      <CityBackground />

      <div className="w-full max-w-[400px] mx-auto relative z-10 flex flex-col items-center px-6">
        {/* Header — greeting + progress stats, Skillcase shell provides the
            top bar and mode switcher around this page. */}
        <div className="w-full flex items-end gap-3 pt-4">
          <Maya mood="wave" className="h-[72px] w-[72px]" />
          <div className="flex-1 min-w-0 pb-1">
            <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Learn German
            </div>
            <div className="text-lg font-bold text-slate-800 leading-tight">
              Deine Reise
            </div>
            <div className="text-xs text-slate-500 leading-snug">
              {wordsLearned > 0
                ? "Pick up where you left off — every topic ends with real German."
                : "Follow the path. Every stop teaches you something to say."}
            </div>
          </div>
        </div>

        <div className="w-full flex flex-wrap items-center gap-1.5 mt-3">
          <StatChip
            icon="🔥"
            value={learner?.streak || 0}
            label="day streak"
          />
          <StatChip icon="🪙" value={learner?.coins || 0} label="coins" />
          <StatChip
            icon="📖"
            value={`${wordsLearned}/${totalWords || "—"}`}
            label="words"
          />
          {reviewCount > 0 && (
            <StatChip icon="🔁" value={reviewCount} label="to review" />
          )}
          <button
            onClick={() => navigate("/learn-german/v2/passport")}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-white/60 active:scale-95 transition-transform"
          >
            <span className="text-sm leading-none" aria-hidden="true">
              🛂
            </span>
            <span className="text-xs font-bold text-slate-700">Passport</span>
          </button>
        </div>

        {/* Zigzag journey */}
        <div className="w-full flex flex-col gap-12 relative z-10 pt-6">
          {loading ? (
            <JourneySkeleton />
          ) : loadError ? (
            <div className="text-center text-slate-500 font-medium py-8">
              Could not load your journey. Pull to refresh.
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center text-slate-500 font-medium py-8">
              No modules available.
            </div>
          ) : (
            topics.map((topic, index) => {
              const displayId = index + 1;
              const isCompleted = topicFullyDone(topic, done);
              // usageLocked reuses the v1 gate: when today's cap is spent the
              // live card renders locked instead of offering a start.
              const isActive = index === activeIndex && !usageLocked;
              const isLeft = index % 2 === 0;
              const prevTopic = topics[index - 1];
              const startsNewLeg =
                topic.setting && topic.setting !== prevTopic?.setting;

              return (
                <React.Fragment key={topic.id}>
                  {startsNewLeg && (
                    <SettingSignpost setting={topic.setting} />
                  )}
                  <div
                    className={`relative flex w-full ${
                      isLeft ? "justify-start" : "justify-end"
                    }`}
                  >
                    {index < topics.length - 1 && (
                      <RoadSegment
                        direction={isLeft ? "left-to-right" : "right-to-left"}
                      />
                    )}
                    <motion.div
                      data-topic-id={topic.id}
                      ref={index === activeIndex ? activeCardRef : null}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.4) }}
                    >
                      {isCompleted ? (
                        <CompletedCard
                          topic={topic}
                          displayId={displayId}
                          done={done}
                          onRestart={() => restartTopic(topic)}
                          onRecap={() =>
                            navigate(`/learn-german/v2/recap/${topic.id}`)
                          }
                        />
                      ) : isActive ? (
                        <ActiveCard
                          topic={topic}
                          displayId={displayId}
                          done={done}
                          inProgress={inProgress}
                          onStart={() => openSub(topic, nextSub(topic, done))}
                        />
                      ) : (
                        <LockedCard topic={topic} displayId={displayId} />
                      )}
                    </motion.div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
