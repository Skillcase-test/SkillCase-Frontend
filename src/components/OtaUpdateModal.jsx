const OtaUpdateModal = ({ otaState, onSkip, onRestart, onOpenPlayStore }) => {
  if (!otaState) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-[340px] bg-white rounded-[2rem] p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-[#002856] rounded-full flex items-center justify-center mb-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>

        {otaState === "play_store" && (
          <>
            <h2 className="text-xl font-black text-slate-800 mb-2">
              New Version Available
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              A new version of SkillCase is available on the Play Store with
              improvements and new features.
            </p>
            <button
              onClick={onOpenPlayStore}
              className="w-full py-3.5 rounded-full font-bold text-white text-base bg-[#002856] active:scale-95 transition-all duration-200 mb-3"
            >
              Update Now
            </button>
            <button
              onClick={onSkip}
              className="w-full py-2.5 rounded-full font-medium text-slate-500 text-sm border border-slate-200 active:scale-95 transition-all duration-200"
            >
              Skip for Later
            </button>
          </>
        )}

        {otaState === "ota_downloading" && (
          <>
            <h2 className="text-xl font-black text-slate-800 mb-2">
              Updating App
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Downloading the latest update in the background. This will only
              take a moment.
            </p>
            {/* Spinner */}
            <div className="w-10 h-10 border-4 border-[#002856]/20 border-t-[#002856] rounded-full animate-spin mb-4" />
            <p className="text-xs text-slate-400">Please wait...</p>
          </>
        )}

        {otaState === "ota_ready" && (
          <>
            <h2 className="text-xl font-black text-slate-800 mb-2">
              Update Ready
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              The update has been downloaded. Restart the app to apply it now.
            </p>
            <button
              onClick={onRestart}
              className="w-full py-3.5 rounded-full font-bold text-white text-base bg-[#002856] active:scale-95 transition-all duration-200 mb-3"
            >
              Restart Now
            </button>
            <button
              onClick={onSkip}
              className="w-full py-2.5 rounded-full font-medium text-slate-500 text-sm border border-slate-200 active:scale-95 transition-all duration-200"
            >
              Restart Later
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OtaUpdateModal;
