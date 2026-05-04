export default function MaintenanceModal({ open, onRetry }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-[360px] rounded-[2rem] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#92400E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-black text-slate-800">Maintenance Mode</h2>
        <p className="mb-6 text-sm text-slate-500">
          We are temporarily unavailable. Please try again in a moment.
        </p>
        <button
          onClick={onRetry}
          className="w-full rounded-full bg-[#002856] py-3.5 text-base font-bold text-white transition-all duration-200 active:scale-95"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
