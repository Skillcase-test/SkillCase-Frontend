import React from "react";
import { ChevronLeft } from "lucide-react";

export default function WorkspaceHeader({ onBack }) {
  return (
    <div className="self-stretch px-4 py-2.5 flex flex-col justify-start items-start gap-2.5 shrink-0 bg-white">
      <div className="self-stretch inline-flex justify-between items-center">
        <button
          onClick={onBack}
          className="px-0.5 flex justify-center items-center gap-2 cursor-pointer bg-transparent border-0 outline-none"
        >
          <ChevronLeft className="w-4 h-4 text-slate-900" />
          <span className="text-center text-slate-900 text-sm font-semibold leading-6">
            Back
          </span>
        </button>
        <span className="text-center text-neutral-500 text-sm font-semibold leading-6">
          Describe &amp; Speak
        </span>
      </div>
    </div>
  );
}
