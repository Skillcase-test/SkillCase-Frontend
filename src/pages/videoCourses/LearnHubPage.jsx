import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, PlayCircle, FileText, ChevronRight } from "lucide-react";
import { trackFeatureEvent } from "../../telemetry/events";

export default function LearnHubPage() {
  const navigate = useNavigate();

  useEffect(() => {
    trackFeatureEvent("video_courses", "hub_viewed", { entityType: "hub" });
  }, []);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white flex flex-col shadow-sm">
      <div className="self-stretch px-4 py-2.5 flex justify-between items-center bg-white border-b border-zinc-100">
        <button
          onClick={() => navigate("/")}
          className="px-0.5 flex items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
        >
          <ChevronLeft className="w-4 h-4 text-slate-900" />
          <span className="text-slate-900 text-sm font-semibold leading-6">Back</span>
        </button>
        <span className="text-neutral-500 text-sm font-semibold leading-6">
          Learning Library
        </span>
      </div>

      <div className="px-4 py-6 flex flex-col gap-4">
        <button
          onClick={() => navigate("/video-courses/videos")}
          className="w-full p-4 bg-white rounded-xl border border-zinc-200 flex items-center justify-between text-left cursor-pointer hover:border-[#002856] transition-all shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#002856]">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sky-950 text-base font-semibold">Video Courses</span>
              <span className="text-slate-500 text-xs">Watch structured video lessons</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>

        <button
          onClick={() => navigate("/video-courses/notes")}
          className="w-full p-4 bg-white rounded-xl border border-zinc-200 flex items-center justify-between text-left cursor-pointer hover:border-[#002856] transition-all shadow-xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sky-950 text-base font-semibold">Study Notes</span>
              <span className="text-slate-500 text-xs">Read PDF study notes and materials</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
