export default function AppErrorFallback({ staleChunk, resetError }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold">
          {staleChunk ? "A new version is available" : "This page could not be loaded"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {staleChunk
            ? "Reload the application to continue with the latest version."
            : "Try loading this page again. If the problem continues, reload the application."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!staleChunk && typeof resetError === "function" ? (
            <button
              type="button"
              onClick={resetError}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Try again
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Reload application
          </button>
        </div>
      </div>
    </main>
  );
}
