import { useEffect } from "react";

// Maya's "cheat codes" — dropped in right after she's already used the
// pattern successfully, never before. The unlocking is carried by the mark
// and the motion, not by more words.
export default function Hack({ step, ctx }) {
  useEffect(() => { ctx.setMainBtn({ label: "Got it", disabled: false }); }, [step]); // eslint-disable-line

  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-[#1d4287] to-[#10254f] p-6 text-center shadow-xl">
        <svg className="mx-auto h-10 w-10 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2.5" />
          <path d="M8 11V7.5a4 4 0 0 1 7.5-1.9" />
        </svg>
        <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">Hack unlocked</div>
        <div className="mt-1.5 text-xl font-extrabold text-white">{step.title}</div>
        <div className="mt-2 text-[15px] leading-relaxed text-white/80">{step.body}</div>
      </div>
    </div>
  );
}
