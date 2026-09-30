import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getLg2Art, getLg2Curriculum } from "../../api/learnGermanV2Api";
import { loadArtManifest, moduleScene } from "./lib/vocabArt";
import { speak } from "./lib/audio";
import Img from "./components/Img";

/* What a finished topic gives you back: every word it taught, in the order it
 * taught them, each one speakable on tap, and a way back in. Not a score
 * screen — accuracy and combo belong to the moment you finish; weeks later
 * the only thing worth showing is what you know. */
export default function Lg2Recap() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [cur] = await Promise.all([
          getLg2Curriculum(),
          loadArtManifest(getLg2Art),
        ]);
        if (!live) return;
        setTopic(
          (cur.data?.topics || []).find((t) => t.id === topicId) || null,
        );
      } catch {
        if (live) setTopic(null);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [topicId]);

  // The topic's words, in teaching order, de-duplicated: a word taught in
  // learn1 and used again in apply is one word she owns, not two.
  const words = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const sub of topic?.subs || []) {
      for (const w of sub.teaches || []) {
        if (!w || !w[0] || seen.has(w[0])) continue;
        seen.add(w[0]);
        list.push({ de: w[0], en: w[1] });
      }
    }
    return list;
  }, [topic]);

  const scene = topic ? moduleScene(topic) : null;
  const firstSub = topic?.subs?.[0];

  if (loading) {
    return (
      <section
        className="flex min-h-[100dvh] flex-col bg-[#f4f6fb]"
        aria-label="Loading recap"
        role="status"
      >
        <div className="flex items-center gap-3 px-4 pt-3">
          <div className="h-9 w-9 shrink-0 rounded-full bg-white ring-1 ring-slate-200 animate-pulse" />
          <div className="h-4 flex-1 mx-4 bg-slate-200 rounded animate-pulse" />
          <span className="w-9" />
        </div>
        <div className="flex-1 px-4 pb-4 pt-3">
          <div className="mb-4 h-36 rounded-2xl bg-slate-200 ring-1 ring-slate-200 animate-pulse" />
          <div className="h-6 w-1/2 bg-slate-200 rounded animate-pulse" />
          <div className="mt-2 mb-4 h-3 w-40 bg-emerald-100 rounded animate-pulse" />
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 w-full rounded-2xl bg-white ring-1 ring-slate-200 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!topic) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#f4f6fb] px-6 text-center">
        <div>
          <p className="text-slate-600">That topic isn&apos;t available.</p>
          <button
            className="mt-4 rounded-2xl bg-[#17336d] px-6 py-3 text-sm font-bold text-white"
            onClick={() => navigate("/learn-german")}
          >
            Back to Learn German
          </button>
        </div>
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
        <h1 className="flex-1 truncate text-center text-sm font-bold text-slate-700">
          {topic.title}
        </h1>
        <span className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {scene && (
          <div className="mb-4 h-36 overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <Img src={scene} alt="" aria-hidden="true" className="h-full w-full" />
          </div>
        )}
        <h2 className="text-lg font-extrabold text-slate-800">{topic.title}</h2>
        <div className="mb-3 text-xs font-semibold text-emerald-700">
          +{words.length} German word{words.length === 1 ? "" : "s"} learnt
        </div>

        <ul className="space-y-2">
          {words.map((w) => (
            <li key={w.de}>
              {/* The row is the button: the whole card plays the word, rather
                  than a 24px speaker being the only target. */}
              <button
                className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-slate-200 transition active:scale-[0.99]"
                onClick={() => speak(w.de)}
                aria-label={`Play ${w.de}, ${w.en}`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[15px] font-bold text-slate-800">{w.de}</b>
                  <i className="block truncate text-xs not-italic text-slate-500">{w.en}</i>
                </span>
                <span className="shrink-0 text-slate-400" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5 6 9H2v6h4l5 4V5z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                  </svg>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {firstSub && (
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#17336d] ring-1 ring-slate-200 transition active:scale-[0.99]"
            onClick={() => navigate(`/learn-german/v2/lesson/${topic.id}/${firstSub.key}`)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            Do this topic again
          </button>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-4">
        <button
          className="w-full rounded-2xl bg-[#17336d] py-3.5 text-sm font-bold text-white transition active:scale-[0.99]"
          onClick={() => navigate("/learn-german")}
        >
          Okay
        </button>
      </div>
    </section>
  );
}
