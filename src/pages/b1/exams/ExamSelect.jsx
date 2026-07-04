import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { getB1Exams } from "../../../api/b1Api";

export default function ExamSelect() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchExamsList = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await getB1Exams();
      setExams(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching exams:", err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.user_id) return;
    fetchExamsList();
  }, [user?.user_id]);

  const handleExamClick = (examType) => {
    navigate(`/b1/exams/${examType}/papers`);
  };

  if (loading) {
    return (
      <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#002856]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md lg:max-w-none mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden relative">
      {/* Back Navigation Bar */}
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
            B1 Exam Papers
          </span>
        </div>
      </div>

      {/* Banner Area */}
      <div className="self-stretch h-42 relative shrink-0">
        <img
          src="https://res.cloudinary.com/dzwdjjg5d/image/upload/v1781090498/read_listen_pwnige.webp"
          alt="B1 Exam Papers Banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 -bottom-1 bg-gradient-to-b from-white/0 to-white"></div>
      </div>

      {/* Description */}
      <div className="self-stretch px-5 pt-2 flex flex-col justify-start items-start gap-4 shrink-0">
        <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
          <h1 className="justify-start text-sky-950 text-base font-semibold leading-5">
            B1 Exam Preparation
          </h1>
          <p className="self-stretch opacity-70 justify-start text-black text-xs font-normal leading-4">
            Select an exam type below to practice.
          </p>
        </div>
      </div>

      {/* Cards List Container */}
      <div className="flex-1 w-full pb-8 pt-4 bg-white flex flex-col justify-start items-center gap-4 overflow-y-auto px-4">
        {fetchError ? (
          <div className="w-full text-center py-12 flex flex-col items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <p className="text-slate-500 text-xs font-semibold">
              Failed to load exams. Please try again.
            </p>
            <button
              onClick={fetchExamsList}
              className="text-[#002856] text-xs font-semibold underline underline-offset-2 bg-transparent border-0 cursor-pointer"
            >
              Tap to retry
            </button>
          </div>
        ) : exams.length === 0 ? (
          <div className="w-full text-center py-12 text-slate-400 text-xs font-semibold">
            No exams configured yet. Check back soon.
          </div>
        ) : (
          exams.map((exam) => {
            const completed = parseInt(exam.completed_papers || 0, 10);
            const total = parseInt(exam.total_papers || 0, 10);
            const hasStarted = total > 0;

            return (
              <div
                key={exam.id}
                onClick={() => handleExamClick(exam.exam_type)}
                className="w-full p-2 bg-white rounded-xl border border-zinc-200 flex justify-start items-center gap-4 cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
              >
                {/* Logo Wrapper */}
                <div className="w-16 h-16 bg-zinc-50 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-zinc-100">
                  <img
                    src={
                      exam.logo_url ||
                      (exam.exam_type === "goethe"
                        ? "/geothe.webp"
                        : "/telc.webp")
                    }
                    alt={exam.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                  <span className="text-slate-900 text-sm font-semibold leading-snug text-left truncate w-full">
                    {exam.title}
                  </span>
                  <span className="text-slate-500 text-[10px] text-left line-clamp-1">
                    {exam.description || `Official B1 practice materials.`}
                  </span>
                </div>

                {/* Progress Badge and Arrow */}
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  {hasStarted && (
                    <div
                      className={`px-2.5 py-0.5 rounded-[40px] text-xs font-semibold leading-5 ${
                        completed === total && total > 0
                          ? "bg-green-700/10 text-green-700"
                          : "bg-black/5 text-slate-600"
                      }`}
                    >
                      {completed}/{total}
                    </div>
                  )}
                  <ChevronLeft className="w-4 h-4 text-slate-400 rotate-180 shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
