import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getLg2Curriculum, getLg2State } from "../../api/learnGermanV2Api";
import { nextSub } from "./lib/curriculum";
import PassportPage from "./guided/PassportPage";
import { challengeFromTopic, nextJourneyChallenge } from "./guided/journeyModel";

// The passport — opened from the journey dock, or onto a stamp the reward
// screen just earned (route state `earned`).
export default function Lg2Passport() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((s) => s.auth?.user);
  const userName = user?.name || user?.username || "";
  const earnedId = location.state?.earned || null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [cur, st] = await Promise.all([getLg2Curriculum(), getLg2State()]);
        if (!live) return;
        setData({
          topics: cur.data?.topics || [],
          done: st.data?.done || [],
        });
      } catch {
        if (live) setData(null);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Same gate as the journey: complete modules practise again, only the
  // next challenge starts new progress.
  const openChallenge = (id) => {
    const topic = data?.topics.find((t) => t.id === id);
    if (!topic) return;
    const all = data.topics.map((t) => challengeFromTopic(t, data.done));
    const c = all.find((x) => x.id === id);
    if (!c?.complete && nextJourneyChallenge(all)?.id !== id) return;
    const sub = nextSub(topic, data.done) || topic.subs?.[0];
    if (sub) navigate(`/learn-german/v2/lesson/${topic.id}/${sub.key}`);
  };

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f4f6fb]">
        <div className="text-sm font-semibold text-slate-400">Opening your passport…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f4f6fb]">
        <p className="text-sm text-slate-500">
          Couldn&apos;t load your passport right now.
        </p>
      </div>
    );
  }

  return (
    <PassportPage
      topics={data.topics}
      done={data.done}
      userName={userName}
      userId={user?.user_id}
      earnedId={earnedId}
      initiallyOpen={!!earnedId}
      onBack={() => navigate("/learn-german")}
      onOpenChallenge={openChallenge}
    />
  );
}
