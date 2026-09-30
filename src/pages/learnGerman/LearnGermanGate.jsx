import { lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";
import {
  LG_VARIANT_V2,
  resolveLearnGermanVariant,
} from "../../utils/learnGermanVariant";

const LearnGermanHome = lazy(() => import("./LearnGermanHome"));
const LearnGermanV2Home = lazy(
  () => import("../learnGermanV2/LearnGermanV2Home"),
);

function GateSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-sky-100 relative pb-32 overflow-x-hidden">
      <div className="w-full max-w-[400px] mx-auto flex flex-col items-center px-6 pt-4 gap-12">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className={`w-full flex ${idx % 2 === 0 ? "justify-start pl-2" : "justify-end pr-2"}`}
          >
            <div className="w-[200px] h-[210px] px-2.5 pt-2.5 pb-3 bg-white/70 backdrop-blur-sm rounded-[20px] shadow-sm border border-white/60 flex flex-col items-center gap-2.5 animate-pulse">
              <div className="w-full h-28 bg-slate-200/80 rounded-[10px]" />
              <div className="h-3 w-16 bg-slate-200/80 rounded-full" />
              <div className="h-4 w-28 bg-slate-200/80 rounded-md" />
              <div className="h-8 w-full bg-slate-200/80 rounded-full mt-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// One URL, two experiences. The flag is the effective switch (kill-switch +
// QA override); the stored learn_german_variant column is what the flag was
// set from. While flags are still resolving we hold a skeleton so a v2 user
// doesn't flash the v1 journey first.
export default function LearnGermanGate() {
  const { user } = useSelector((state) => state.auth);
  const { flags, loading } = useFeatureFlags();
  const variant = resolveLearnGermanVariant(user, flags);

  if (loading) return <GateSkeleton />;

  return (
    <Suspense fallback={<GateSkeleton />}>
      {variant === LG_VARIANT_V2 ? <LearnGermanV2Home /> : <LearnGermanHome />}
    </Suspense>
  );
}
