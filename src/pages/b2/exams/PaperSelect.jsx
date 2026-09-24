import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { BsNewspaper } from "react-icons/bs";

// Placeholder for the full timed-exam-paper feature (telc/Goethe papers).
// The learner-facing test flow lives in the placement-chapter sequence
// driven by the test hub and exam gate — this page only exists so the
// "Timed Exam Paper" card has somewhere to land until that feature is
// designed.
export default function PaperSelect() {
  const navigate = useNavigate();

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
            Full timed exam papers
          </h1>
          <p className="self-stretch opacity-70 justify-start text-black text-xs font-normal leading-4">
            Best suited for B2 German students
          </p>
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-center gap-3 px-8 pb-16 text-center">
        <div className="w-14 h-14 bg-blue-100 rounded-md flex items-center justify-center border border-indigo-100/30">
          <BsNewspaper className="w-6 h-6 text-sky-950" />
        </div>
        <p className="text-slate-900 text-sm font-semibold leading-snug">
          Coming soon
        </p>
        <p className="text-neutral-500 text-xs font-normal leading-5">
          Full-length timed exam papers will be available here soon.
        </p>
      </div>
    </div>
  );
}
