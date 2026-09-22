import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, Loader2 } from "lucide-react";
import { getB2Exercises } from "../../../api/b2Api";
import { useUsageLimitModule } from "../../../hooks/useUsageLimits";

const MODULE_META = {
  reading: {
    title: "Reading",
    subtitle:
      "Practice B2-level reading comprehension from TELC & Goethe style exercises.",
    banner:
      "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090498/read_listen_pwnige.webp",
  },
  listening: {
    title: "Listening",
    subtitle:
      "Train your ear with B2-level audio exercises in TELC & Goethe formats.",
    banner:
      "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090498/read_listen_pwnige.webp",
  },
  writing: {
    title: "Writing",
    subtitle:
      "Write essays and letters like the real B2 exam, with AI feedback.",
    banner:
      "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090503/describe_speak_dtdpvf.webp",
  },
  speaking: {
    title: "Speaking",
    subtitle:
      "Speak on B2 prompts and get pronunciation + content feedback.",
    banner:
      "https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090503/describe_speak_dtdpvf.webp",
  },
};

const TAG_FILTERS = [
  { key: "all", label: "All" },
  { key: "telc", label: "TELC" },
  { key: "goethe", label: "Goethe" },
];

export default function ExerciseSelect() {
  const navigate = useNavigate();
  const { module } = useParams();
  const { user } = useSelector((state) => state.auth);

  const meta = MODULE_META[module] || MODULE_META.reading;
  const { locked: usageLocked } = useUsageLimitModule("B2", module);

  const [activeTag, setActiveTag] = useState("all");
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Single fetch — "all" is the aggregate view; tag pills filter client-side
  // and each pill shows its exercise count.
  const fetchExercises = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await getB2Exercises(module, "all");
      setExercises(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching B2 exercises:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !MODULE_META[module]) return;
    fetchExercises();
  }, [user?.user_id, module]);

  const tagCounts = {
    all: exercises.length,
    telc: exercises.filter((e) => e.tag === "telc").length,
    goethe: exercises.filter((e) => e.tag === "goethe").length,
  };
  const visibleExercises =
    activeTag === "all"
      ? exercises
      : exercises.filter((e) => e.tag === activeTag);

  if (!MODULE_META[module]) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-4 shadow-sm">
        <p className="text-slate-500 text-xs font-semibold">
          Unknown practice module.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-3 text-[#002856] text-xs font-semibold underline underline-offset-2 bg-transparent border-0 cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const handleCardClick = (exercise) => {
    if (usageLocked) return;
    if (exercise.status === "completed") {
      navigate(`/b2/${module}/${exercise.id}/results`);
    } else {
      navigate(`/b2/${module}/${exercise.id}`);
    }
  };

  const getDifficultyBadgeStyle = (difficulty) => {
    const diff = String(difficulty || "Easy").toLowerCase();
    if (diff === "easy") {
      return "bg-green-700/10 border-green-700/20 text-green-700";
    }
    if (diff === "medium" || diff === "intermediate") {
      return "bg-amber-100/60 border-orange-400/20 text-orange-500";
    }
    return "bg-red-100 border-red-500/20 text-red-500";
  };

  const getTagBadgeStyle = (tag) => {
    const t = String(tag || "").toLowerCase();
    if (t === "telc") {
      return "bg-sky-950/10 border-sky-950/20 text-sky-950";
    }
    if (t === "goethe") {
      return "bg-purple-700/10 border-purple-700/20 text-purple-700";
    }
    return "bg-black/5 border-black/5 text-neutral-500";
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm relative">
      {/* Back & Module Title navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate("/")}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            {meta.title}
          </span>
        </div>
      </div>

      {/* Collage Banner Area */}
      <div className="self-stretch h-42 relative shrink-0">
        <img
          src={meta.banner}
          alt={`${meta.title} Banner`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 -bottom-1 bg-gradient-to-b from-white/0 to-white"></div>
      </div>

      {/* Title & Info */}
      <div className="self-stretch px-5 pt-4 flex flex-col justify-start items-start gap-4 shrink-0">
        <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
          <div className="inline-flex justify-center items-center gap-4">
            <h1 className="justify-start text-sky-950 text-base font-semibold leading-5">
              {meta.title}
            </h1>
          </div>
          <p className="self-stretch opacity-70 justify-start text-black text-xs font-normal leading-4">
            {meta.subtitle}
          </p>
        </div>

        {/* Tag pills — All aggregates every exercise; each shows its count */}
        <div
          id={`b2-${module}-tag-pills`}
          className="self-stretch flex justify-start items-center gap-2"
        >
          {TAG_FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveTag(filter.key)}
              className={`px-4 py-1.5 rounded-[40px] border text-xs font-semibold cursor-pointer transition-all ${
                activeTag === filter.key
                  ? "bg-sky-950 border-sky-950 text-white"
                  : "bg-white border-zinc-200 text-slate-700 hover:border-sky-950/40"
              }`}
            >
              {filter.label} ({tagCounts[filter.key]})
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list deck */}
      <div
        id={`b2-${module}-exercise-list`}
        className="flex-1 w-full pb-8 pt-4 bg-white flex flex-col justify-start items-center gap-3 overflow-y-auto px-4"
      >
        {loading ? (
          <div className="w-full space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50 animate-pulse flex items-center justify-between"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="w-full text-center py-12 flex flex-col items-center gap-3">
            <p className="text-slate-500 text-xs font-semibold">
              Failed to load exercises. Please check your connection.
            </p>
            <button
              onClick={() => fetchExercises()}
              className="text-[#002856] text-xs font-semibold underline underline-offset-2 bg-transparent border-0 cursor-pointer"
            >
              Tap to retry
            </button>
          </div>
        ) : visibleExercises.length === 0 ? (
          <div className="w-full text-center py-12 text-slate-400 text-xs font-semibold">
            No exercises in this category yet. Check back soon.
          </div>
        ) : (
          visibleExercises.map((exercise, index) => {
            const isDone = exercise.status === "completed";
            const hasStarted = exercise.status === "in_progress";

            return (
              <div
                key={exercise.id}
                id={index === 0 ? `b2-${module}-first-exercise` : undefined}
                onClick={() => handleCardClick(exercise)}
                className={`w-full p-3 bg-white rounded-xl border border-zinc-200 flex justify-start items-start gap-3 transition-all shrink-0 ${
                  usageLocked
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                }`}
              >
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="flex justify-between items-center w-full">
                    <div className="flex flex-col items-start min-w-0 pr-1 gap-1">
                      <span className="text-slate-900 text-sm font-semibold leading-snug text-left truncate w-full">
                        {exercise.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <span
                          className={`text-center text-[8px] font-medium leading-[8px] px-1.5 py-0.5 rounded-[40px] border ${getTagBadgeStyle(
                            exercise.tag,
                          )}`}
                        >
                          {String(exercise.tag || "all").toUpperCase()}
                        </span>
                        <span
                          className={`text-center text-[8px] font-medium leading-[8px] px-1.5 py-0.5 rounded-[40px] border ${getDifficultyBadgeStyle(
                            exercise.difficulty_tag,
                          )}`}
                        >
                          {exercise.difficulty_tag || "Easy"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isDone && (
                        <div className="px-2 py-0.5 rounded-[40px] border flex justify-center items-center shrink-0 bg-green-700/10 border-green-700/20 text-green-700">
                          <span className="text-center text-[10px] font-medium leading-5">
                            {Math.round(parseFloat(exercise.score || 0))}%
                          </span>
                        </div>
                      )}
                      {hasStarted && !isDone && (
                        <div className="px-2 py-0.5 rounded-[40px] border flex justify-center items-center shrink-0 bg-amber-100/60 border-orange-400/20 text-orange-500">
                          <span className="text-center text-[10px] font-medium leading-5">
                            continue
                          </span>
                        </div>
                      )}
                      <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
