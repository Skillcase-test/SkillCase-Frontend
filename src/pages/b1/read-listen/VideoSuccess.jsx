import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useSelector } from "react-redux";
import { getB1Videos } from "../../../api/b1Api";
import toast, { Toaster } from "react-hot-toast";
import { hapticHeavy } from "../../../utils/haptics";

export default function VideoSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  React.useEffect(() => {
    hapticHeavy();
  }, []);

  const {
    contentId,
    score = 0,
    correctCount = 0,
    incorrectCount = 0,
    skippedCount = 0,
    answers = {},
    results = [],
    totalQuestions = 0,
  } = location.state || {};

  const roundedScore = Math.round(score);

  const getGreeting = () => {
    if (roundedScore >= 70) return "Good job";
    if (roundedScore >= 50) return "Well done!";
    return "Keep practicing!";
  };

  const handleReview = () => {
    navigate(`/b1/read-listen/video/${contentId}`, {
      state: {
        reviewMode: true,
        answers,
        results,
      },
    });
  };

  const handleTryNext = async () => {
    try {
      const res = await getB1Videos("B1");
      const list = Array.isArray(res.data) ? res.data : [];
      const nextVideo = list.find(
        (v) => !v.completed && v.video_id !== contentId,
      );

      if (nextVideo) {
        navigate(`/b1/read-listen/video/${nextVideo.video_id}`);
      } else {
        const currentIdx = list.findIndex((v) => v.video_id === contentId);
        if (currentIdx !== -1 && currentIdx < list.length - 1) {
          navigate(`/b1/read-listen/video/${list[currentIdx + 1].video_id}`);
        } else {
          toast.success(
            "Congratulations! You have finished all videos in this section.",
            { duration: 4000 },
          );
          navigate("/b1/read-listen/list/video");
        }
      }
    } catch (err) {
      console.error("Error finding next video:", err);
      navigate("/b1/read-listen/list/video");
    }
  };

  const handleReattempt = () => {
    navigate(`/b1/read-listen/video/${contentId}`, {
      state: { reattemptMode: true },
    });
  };

  const padZero = (num) => {
    return String(num).padStart(2, "0");
  };

  // SVG parameters for circular progress ring
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col justify-start items-center overflow-hidden shadow-sm">
      <Toaster position="top-center" />
      {/* Back & Module Title navigation bar */}
      <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={() => navigate("/b1/read-listen/list/video")}
            className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
            <span className="text-center text-slate-900 text-sm font-semibold leading-6">
              Back
            </span>
          </button>
          <span className="text-center text-neutral-500 text-sm font-semibold leading-6 capitalize">
            Video &amp; Audio
          </span>
        </div>
      </div>

      {/* Main Success stats block */}
      <div className="self-stretch px-4 pt-4 flex flex-col justify-center items-center">
        <div className="w-full max-w-[360px] px-5 pt-8 pb-6 bg-black/5 rounded-xl flex flex-col justify-start items-center gap-6 border border-zinc-200/50">
          <h2 className="text-center text-sky-950 text-2xl font-semibold leading-9">
            {getGreeting()}
          </h2>

          {/* SVG Progress Ring */}
          <div className="relative flex items-center justify-center w-32 h-32">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background Circle */}
              <circle
                stroke="#e2e8f0"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={radius}
                cx={size / 2}
                cy={size / 2}
              />
              {/* Progress Circle */}
              <circle
                stroke="#0BAA45"
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={radius}
                cx={size / 2}
                cy={size / 2}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-sky-950 leading-none">
                {roundedScore}%
              </span>
              <span className="text-sky-950 text-[8px] font-semibold mt-1 text-center whitespace-nowrap">
                {correctCount} of {totalQuestions} correct
              </span>
            </div>
          </div>

          {/* Stat Breakdown cards */}
          <div className="self-stretch inline-flex justify-start items-center gap-2">
            {/* Correct stats */}
            <div className="flex-1 p-2 bg-green-700/10 rounded-md border border-green-700/20 flex justify-center items-center">
              <div className="w-11 inline-flex flex-col justify-center items-center">
                <span className="w-16 text-center text-green-700 text-[10px] font-medium leading-5">
                  Correct
                </span>
                <span className="text-center text-green-700 text-xl font-semibold mt-0.5">
                  {padZero(correctCount)}
                </span>
              </div>
            </div>

            {/* Incorrect stats */}
            <div className="flex-1 p-2 bg-red-100 rounded-md border border-red-200/30 flex justify-center items-center">
              <div className="w-11 inline-flex flex-col justify-center items-center">
                <span className="w-16 text-center text-red-500 text-[10px] font-medium leading-5">
                  Incorrect
                </span>
                <span className="text-center text-red-500 text-xl font-semibold mt-0.5">
                  {padZero(incorrectCount)}
                </span>
              </div>
            </div>

            {/* Skipped stats */}
            <div className="flex-1 p-2 bg-neutral-400/20 rounded-md border border-neutral-300/30 flex justify-center items-center">
              <div className="w-11 inline-flex flex-col justify-center items-center">
                <span className="w-16 text-center text-neutral-500 text-[10px] font-medium leading-5">
                  Skipped
                </span>
                <span className="text-center text-neutral-500 text-xl font-semibold mt-0.5">
                  {padZero(skippedCount)}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons stack */}
          <div className="self-stretch flex flex-col justify-start items-start gap-2">
            {/* Review Answers */}
            <button
              onClick={handleReview}
              className="self-stretch px-4 py-3 bg-[#002856] hover:bg-blue-900 active:scale-95 text-white text-xs font-semibold leading-5 rounded-lg cursor-pointer border-0 outline-none transition-all flex justify-center items-center"
            >
              Review Answers
            </button>

            {/* Try Next Video */}
            <button
              onClick={handleTryNext}
              className="self-stretch px-4 py-3 border border-zinc-400 text-blue-950 hover:bg-slate-50 active:scale-95 text-xs font-semibold leading-5 rounded-lg cursor-pointer outline-none transition-all flex justify-center items-center"
            >
              Try next video
            </button>

            {/* Reattempt */}
            <button
              onClick={handleReattempt}
              className="self-stretch px-4 py-3 hover:bg-slate-50 active:scale-95 text-blue-950 text-xs font-semibold leading-5 rounded-lg cursor-pointer outline-none transition-all flex justify-center items-center"
            >
              Reattempt questions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
