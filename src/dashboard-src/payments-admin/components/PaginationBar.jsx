/** @param {{currentPage:number,totalPages:number,setCurrentPage:Function}} props */
export function PaginationBar({ currentPage, totalPages, setCurrentPage }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-700 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
