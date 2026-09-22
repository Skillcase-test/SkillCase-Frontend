import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { BsNewspaper } from "react-icons/bs";
import {
  getB2Exams,
  getB2ExamPapers,
  startB2ExamSubmission,
} from "../../../api/b2Api";
import toast, { Toaster } from "react-hot-toast";
import { useUsageLimitModule } from "../../../hooks/useUsageLimits";

const EXAM_FILTERS = [
  { key: "telc", label: "TELC" },
  { key: "goethe", label: "Goethe" },
];

export default function PaperSelect() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [papers, setPapers] = useState([]);
  const [activeFilter, setActiveFilter] = useState("telc");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [startingPaperId, setStartingPaperId] = useState(null);
  const { locked: usageLocked } = useUsageLimitModule("B2", "exams");

  const fetchPapersList = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      // Pull every exam type's papers up front so the pills filter
      // client-side without a refetch.
      const examsRes = await getB2Exams();
      const examTypes = (Array.isArray(examsRes.data) ? examsRes.data : [])
        .map((exam) => exam.exam_type)
        .filter(Boolean);

      const paperLists = await Promise.all(
        examTypes.map((type) => getB2ExamPapers(type)),
      );
      const merged = examTypes.flatMap((type, idx) =>
        (Array.isArray(paperLists[idx]?.data) ? paperLists[idx].data : []).map(
          (paper) => ({ ...paper, exam_type: type }),
        ),
      );
      setPapers(merged);
    } catch (err) {
      console.error("Error fetching B2 exam papers:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id) return;
    fetchPapersList();
  }, [user?.user_id]);

  const examCounts = {
    telc: papers.filter(
      (p) => String(p.exam_type || "").toLowerCase() === "telc",
    ).length,
    goethe: papers.filter(
      (p) => String(p.exam_type || "").toLowerCase() === "goethe",
    ).length,
  };
  const visiblePapers = papers.filter(
    (paper) => String(paper.exam_type || "").toLowerCase() === activeFilter,
  );

  const handlePaperClick = async (paperId) => {
    if (usageLocked) return;
    setStartingPaperId(paperId);
    try {
      await startB2ExamSubmission(paperId);
      // Navigate to the dashboard (Block Selector)
      navigate(`/b2/exams/papers/${paperId}/dashboard`);
    } catch (err) {
      console.error("Error starting B2 exam submission:", err);
      const resData = err.response?.data || {};
      if (err.response?.status === 403 && resData.alreadyCompleted) {
        // If already completed, go directly to congratulations screen
        navigate(`/b2/exams/papers/${paperId}/congratulations`);
      } else {
        toast.error("Failed to initialize exam paper session. Please try again.");
      }
    } finally {
      setStartingPaperId(null);
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

  if (loading) {
    return (
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col p-4">
        <div className="h-6 w-32 bg-slate-200 rounded mb-6 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50 animate-pulse flex items-center justify-between"
            >
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-40 bg-slate-100 rounded" />
              </div>
              <div className="h-8 w-20 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden relative">
      {/* Navigation bar */}
      <div
        className="self-stretch px-4 pb-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
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
            Exam Papers
          </span>
        </div>
      </div>

      {/* Title Header */}
      <div className="self-stretch px-5 pt-4 flex flex-col justify-start items-start gap-4 shrink-0">
        <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
          <h1 className="justify-start text-sky-950 text-base font-semibold leading-5">
            Choose a past test paper to start your exam
          </h1>
          <p className="self-stretch opacity-70 justify-start text-black text-xs font-normal leading-4">
            Best suited for B2 German students
          </p>
        </div>
      </div>

      {/* Exam type pills */}
      <div className="self-stretch px-4 pt-3 pb-1 flex items-center gap-2 shrink-0">
        {EXAM_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-4 py-1.5 rounded-full border text-xs font-semibold leading-5 transition-colors cursor-pointer ${
                isActive
                  ? "bg-sky-950 border-sky-950 text-white"
                  : "bg-white border-zinc-200 text-slate-600 hover:border-slate-400"
              }`}
            >
              {filter.label} ({examCounts[filter.key]})
            </button>
          );
        })}
      </div>

      {/* Papers Deck */}
      <div className="flex-1 w-full pb-8 pt-4 bg-white flex flex-col justify-start items-center gap-3 overflow-y-auto px-4">
        {fetchError ? (
          <div className="w-full text-center py-12 flex flex-col items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <p className="text-slate-500 text-xs font-semibold">
              Failed to load papers.
            </p>
            <button
              onClick={fetchPapersList}
              className="text-[#002856] text-xs font-semibold underline underline-offset-2 bg-transparent border-0 cursor-pointer"
            >
              Tap to retry
            </button>
          </div>
        ) : visiblePapers.length === 0 ? (
          <div className="w-full text-center py-12 text-slate-400 text-xs font-semibold">
            No papers uploaded for {activeFilter.toUpperCase()} yet.
          </div>
        ) : (
          visiblePapers.map((paper) => {
            const isStarting = startingPaperId === paper.id;
            const status = paper.submission_status; // 'in_progress' or 'completed' or null

            return (
              <div
                key={paper.id}
                onClick={() => !isStarting && handlePaperClick(paper.id)}
                className={`w-full p-3 bg-white rounded-xl border border-zinc-200 flex justify-start items-start gap-3 transition-all shrink-0 ${
                  usageLocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                }`}
              >
                {/* Icon Wrapper */}
                <div
                  className="w-14 h-14 bg-blue-100 rounded-md flex items-center justify-center shrink-0 border border-indigo-100/30"
                  style={{ minWidth: "56px", minHeight: "56px" }}
                >
                  <BsNewspaper className="w-6 h-6 text-sky-950" />
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-14">
                  <div className="flex justify-between items-center w-full h-full">
                    <div className="flex flex-col items-start min-w-0 pr-1 gap-1">
                      <span className="text-slate-900 text-sm font-semibold leading-snug text-left truncate w-full">
                        {paper.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-center text-neutral-500 text-[8px] font-medium leading-[8px] px-1.5 py-0.5 bg-black/5 rounded-[40px] border border-black/5 uppercase">
                          {paper.exam_type}
                        </span>
                        <span className="text-center text-neutral-500 text-[8px] font-medium leading-[8px] px-1.5 py-0.5 bg-black/5 rounded-[40px] border border-black/5">
                          {paper.proficiency_level || "B2"}
                        </span>
                        <span
                          className={`text-center text-[8px] font-medium leading-[8px] px-1.5 py-0.5 rounded-[40px] border ${getDifficultyBadgeStyle(
                            paper.difficulty_tag,
                          )}`}
                        >
                          {paper.difficulty_tag || "Easy"}
                        </span>
                        <span className="text-center text-slate-400 text-[8px] font-medium leading-[8px] py-0.5 rounded-[40px]">
                          {paper.duration_minutes || 120} mins
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Arrow */}
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isStarting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : (
                        <>
                          {status && (
                            <div
                              className={`px-2 py-0.5 rounded-[40px] border flex justify-center items-center shrink-0 ${
                                status === "completed"
                                  ? "bg-green-700/10 border-green-700/20 text-green-700"
                                  : "bg-amber-100/60 border-orange-400/20 text-orange-500"
                              }`}
                            >
                              <span className="text-center text-[10px] font-medium leading-5">
                                {status === "completed" ? "done" : "continue"}
                              </span>
                            </div>
                          )}
                          <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180 shrink-0" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
