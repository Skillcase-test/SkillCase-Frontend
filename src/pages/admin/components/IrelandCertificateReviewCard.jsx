import { ExternalLink } from "lucide-react";

// Choose-your-path certificate (IELTS / NMBI) with Approve/Reject.
// `file`: { filename, downloadUrl, status, rejectionReason }.
const IrelandCertificateReviewCard = ({
  label,
  file = {},
  canReview = false,
  saving = false,
  onApprove,
  onReject,
}) => {
  const isUploaded = Boolean(file.downloadUrl || file.filename);
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-800 text-[11px] truncate max-w-[200px] sm:max-w-xs block text-left">
          {label}
          <span className="ml-1.5 text-[8px] font-bold text-slate-400 uppercase">
            required
          </span>
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border tracking-wider shrink-0 ${
            isUploaded
              ? file.status === "approved"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                : file.status === "rejected"
                  ? "bg-rose-50 text-rose-700 border-rose-100"
                  : "bg-amber-50 text-amber-700 border-amber-100"
              : "bg-slate-100 text-slate-400 border-slate-200"
          }`}
        >
          {isUploaded
            ? file.status === "approved"
              ? "Approved"
              : file.status === "rejected"
                ? "Rejected"
                : "Pending Review"
            : "Awaiting Upload"}
        </span>
      </div>

      {isUploaded ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100/80 text-[10px] text-slate-500">
            <span className="truncate max-w-[150px] font-bold text-slate-700">
              {file.filename || "document"}
            </span>
            {file.downloadUrl && (
              <a
                href={file.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
              >
                View file <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          {file.status === "rejected" && file.rejectionReason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-800 text-left flex items-start justify-between gap-2">
              <span className="leading-relaxed">{file.rejectionReason}</span>
            </div>
          )}

          {canReview && file.status !== "approved" && (
            <div className="flex gap-2 justify-start">
              <button
                type="button"
                disabled={saving}
                onClick={onApprove}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40"
              >
                Approve
              </button>
              {file.status !== "rejected" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={onReject}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40"
                >
                  Reject
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-zinc-400 font-semibold italic">
          Awaiting candidate upload.
        </p>
      )}
    </div>
  );
};

export default IrelandCertificateReviewCard;
