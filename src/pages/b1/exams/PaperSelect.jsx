import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { BsNewspaper } from "react-icons/bs";
import { getB1ExamPapers, startB1ExamSubmission } from "../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";

export default function PaperSelect() {
  const navigate = useNavigate();
  const { examType } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [startingPaperId, setStartingPaperId] = useState(null);

  const fetchPapersList = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await getB1ExamPapers(examType);
      setPapers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching exam papers:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id || !examType) return;
    fetchPapersList();
  }, [user?.user_id, examType]);

  const handlePaperClick = async (paperId) => {
    setStartingPaperId(paperId);
    try {
      const res = await startB1ExamSubmission(paperId);
      // Navigate to the dashboard (Block Selector)
      navigate(`/b1/exams/papers/${paperId}/dashboard`);
    } catch (err) {
      console.error("Error starting exam submission:", err);
      const resData = err.response?.data || {};
      if (err.response?.status === 403 && resData.alreadyCompleted) {
        // If already completed, go directly to congratulations screen
        navigate(`/b1/exams/papers/${paperId}/congratulations`);
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
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  const capitalizedExam = String(examType).toUpperCase();

  return (
    <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden relative">
      {/* Navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate("/b1/exams")}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
            {capitalizedExam}
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
            Best suited for B1 & B2 German students
          </p>
        </div>
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
        ) : papers.length === 0 ? (
          <div className="w-full text-center py-12 text-slate-400 text-xs font-semibold">
            No papers uploaded for {capitalizedExam} yet.
          </div>
        ) : (
          papers.map((paper) => {
            const isStarting = startingPaperId === paper.id;
            const status = paper.submission_status; // 'in_progress' or 'completed' or null

            return (
              <div
                key={paper.id}
                onClick={() => !isStarting && handlePaperClick(paper.id)}
                className="w-full p-3 bg-white rounded-xl border border-zinc-200 flex justify-start items-start gap-3 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
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
                        <span className="text-center text-neutral-500 text-[8px] font-medium leading-[8px] px-1.5 py-0.5 bg-black/5 rounded-[40px] border border-black/5">
                          {paper.proficiency_level || "B1"}
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
