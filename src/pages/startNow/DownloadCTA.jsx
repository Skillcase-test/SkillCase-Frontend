import React from "react";

const PLAY_STORE_URL = "market://details?id=com.skillcase.app";
const PLAY_STORE_WEB_URL =
  "https://play.google.com/store/apps/details?id=com.skillcase.app";

export default function DownloadCTA() {
  const handleDownload = () => {
    // Attempt to redirect to the Play Store app, fallback to web browser URL on failure
    window.location.href = PLAY_STORE_URL;

    setTimeout(() => {
      window.open(PLAY_STORE_WEB_URL, "_blank", "noreferrer");
    }, 1200);
  };

  return (
    <section className="px-4 mb-2 text-center max-w-xl mx-auto w-full">
      <div className="flex flex-col gap-6 p-8 md:p-10 rounded-[2.5rem] bg-[#001836] text-white border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Subtle background gradient shapes */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F9C53D] opacity-10 rounded-full blur-[40px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 opacity-15 rounded-full blur-[40px] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">
            Take your first step.
            <br />
            Land in Germany.
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Join 1,000+ aspirational nurses today on our mobile learning
            platforms.
          </p>

          <div className="flex flex-col gap-3 max-w-xs mx-auto w-full mt-4">
            <button
              onClick={handleDownload}
              className="bg-[#F9C53D] hover:bg-[#e0b02f] text-[#002856] font-extrabold py-4 px-6 rounded-2xl shadow-lg active:scale-95 transition-all duration-150 text-sm"
            >
              Get Started - Download the App
            </button>
            <p className="text-[10px] text-slate-500">
              Compatible with all major Android devices.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
