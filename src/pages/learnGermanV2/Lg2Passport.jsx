import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getLg2Curriculum, getLg2State } from "../../api/learnGermanV2Api";
import { topicFullyDone } from "./lib/curriculum";
import PassportBook from "./components/PassportBook";

// The passport, opened from the home header — the same book the reward
// ceremony stamps into, now readable cover to cover.
export default function Lg2Passport() {
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth?.user);
  const userName = user?.name || user?.username || "";
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
          stats: { words: st.data?.stats?.words || [], streak: st.data?.streak || 0 },
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

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f4f6fb]">
        <div className="text-sm font-semibold text-slate-400">Opening your passport…</div>
      </div>
    );
  }

  return (
    <section className="flex min-h-[100dvh] flex-col bg-[#f4f6fb]">
      <div className="flex items-center gap-3 px-4 pt-3">
        <button
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200"
          aria-label="Back"
          onClick={() => navigate("/learn-german")}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-sm font-bold text-slate-700">
          Your Sprachpass
        </h1>
        <span className="w-9" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-8 pt-2">
        {data ? (
          <PassportBook
            topics={data.topics}
            done={data.done}
            stats={data.stats}
            isDone={(t, done) => topicFullyDone(t, done)}
            userName={userName}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Couldn&apos;t load your passport right now.
          </p>
        )}
      </div>
    </section>
  );
}
