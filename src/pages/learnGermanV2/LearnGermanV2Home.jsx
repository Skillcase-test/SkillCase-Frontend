import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getLg2Art,
  getLg2Curriculum,
  getLg2State,
  trackLg2Visit,
} from "../../api/learnGermanV2Api";
import { loadArtManifest } from "./lib/vocabArt";
import { nextSub } from "./lib/curriculum";
import GuidedJourney from "./guided/GuidedJourney";
import {
  challengeFromTopic,
  nextJourneyChallenge,
} from "./guided/journeyModel";
import { JourneyState } from "./guided/PassportUI";
import {
  useUsageLimitGate,
  useUsageLimitModule,
} from "../../hooks/useUsageLimits";
import { setClarityTag, trackClarityEvent } from "../../observability/clarity";

const EMPTY = [];

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

  const [topics, setTopics] = useState(EMPTY);
  const [learner, setLearner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const mountedRef = useRef(true);

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
    mountedRef.current = true;
    trackLg2Visit().catch(() => {});
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Art loads through the module-level manifest so every screen that
      // renders after this one resolves names synchronously.
      const [curRes, stateRes] = await Promise.all([
        getLg2Curriculum(),
        getLg2State(),
        loadArtManifest(getLg2Art),
      ]);
      if (!mountedRef.current) return;
      setTopics(curRes?.data?.topics || EMPTY);
      setLearner(stateRes?.data || null);
    } catch (err) {
      if (mountedRef.current) setLoadError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const done = learner?.done || EMPTY;

  // A stop opens its module: a finished one to practise again, the current
  // one to start. Practise stays open when capped (resaves are syncOnly
  // server-side); new progress while capped is a dead click — the lock
  // label already says why.
  const openChallenge = (id) => {
    const all = topics.map((t) => challengeFromTopic(t, done));
    const c = all.find((x) => x.id === id);
    const isNext = nextJourneyChallenge(all)?.id === id;
    if (!c || !(c.complete || (isNext && !usageLocked))) return;
    const topic = topics.find((t) => t.id === id);
    const sub = nextSub(topic, done) || topic?.subs?.[0];
    if (sub) navigate(`/learn-german/v2/lesson/${topic.id}/${sub.key}`);
  };

  return (
    <div className="gp-ui min-h-screen bg-[#dbeafe]">
      <JourneyState loading={loading} error={loadError} retry={load}>
        <GuidedJourney
          topics={topics}
          done={done}
          entitlement={{ capped: usageLocked }}
          onOpenChallenge={openChallenge}
          onPassport={() => navigate("/learn-german/v2/passport")}
        />
      </JourneyState>
    </div>
  );
}
