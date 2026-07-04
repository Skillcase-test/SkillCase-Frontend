import React, { useState } from "react";
import { Download, RotateCcw, FileText, FileSpreadsheet, Clock, User, AlertCircle, RefreshCw, X } from "lucide-react";
import { ActionChip, ControlButton } from "../components/controls";
import { PaginationBar } from "../components/PaginationBar";
import { formatIstDateTime } from "../utils/formatters";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";

export function ImportHistoryTab({
  rows,
  pagination,
  setCurrentPage,
  adminRole,
  paymentActions,
  loadTabData,
}) {
  const [downloadingId, setDownloadingId] = useState(null);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState("");

  const canRollback = adminRole === "super_admin" || (paymentActions && paymentActions.includes("manage"));

  const handleDownload = async (importId, defaultFilename) => {
    setDownloadingId(importId);
    try {
      const res = await paymentsAdminApi.downloadImportFile(importId);
      const { filename, file_content } = res.data;
      if (!file_content) {
        alert("No file content stored for this import.");
        return;
      }
      const byteCharacters = atob(file_content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/octet-stream" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || defaultFilename || "import_file.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download file:", err);
      alert("Failed to download original import file.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    setRollingBack(true);
    setRollbackError("");
    try {
      await paymentsAdminApi.rollbackImport(rollbackTarget.import_id);
      setRollbackTarget(null);
      loadTabData();
    } catch (err) {
      console.error("Rollback failed:", err);
      setRollbackError(err?.response?.data?.msg || err.message || "Failed to trigger rollback.");
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Header Card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock className="text-indigo-600 h-4 w-4" />
          Import History Log
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          View history of Candidate and Payment spreadsheet uploads. Download the original uploaded CSV spreadsheets or perform a secure rollback if data was imported incorrectly.
        </p>
      </div>

      {/* Main Table Card */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        <table className="min-w-full text-sm text-left">
          <thead>
            <tr className="border-b bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Import Type</th>
              <th className="px-4 py-3">Filename</th>
              <th className="px-4 py-3 text-center">Row Count</th>
              <th className="px-4 py-3">Imported By</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows && rows.length > 0 ? (
              rows.map((r, i) => (
                <tr key={r.import_id} className={`hover:bg-slate-50/20 text-slate-700 transition ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {formatIstDateTime(r.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {r.import_type === "candidates" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        Candidates
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Payments
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 break-all max-w-xs">
                    <div className="flex items-center gap-1.5">
                      {r.filename?.toLowerCase().endsWith(".csv") ? (
                        <FileText size={14} className="text-slate-400 shrink-0" />
                      ) : (
                        <FileSpreadsheet size={14} className="text-slate-400 shrink-0" />
                      )}
                      <span>{r.filename || "import_file.csv"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-600">
                    {r.row_count}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-xs">
                      <User size={12} className="text-slate-400 shrink-0" />
                      <span>{r.created_by || "system"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "completed" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Completed
                      </span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                          Rolled Back
                        </span>
                        {r.rolled_back_at && (
                          <span className="text-[10px] text-slate-400 leading-normal">
                            by {r.rolled_back_by || "unknown"} at {formatIstDateTime(r.rolled_back_at)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownload(r.import_id, r.filename)}
                        disabled={downloadingId === r.import_id}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50 text-xs font-bold transition hover:underline"
                        title="Download uploaded spreadsheet file"
                      >
                        {downloadingId === r.import_id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                        Download
                      </button>

                      {r.status === "completed" && (
                        <button
                          onClick={() => {
                            setRollbackTarget(r);
                            setRollbackError("");
                          }}
                          disabled={!canRollback}
                          className={`inline-flex items-center gap-1 text-xs font-bold transition hover:underline ${
                            canRollback 
                              ? "text-rose-600 hover:text-rose-800" 
                              : "text-slate-300 cursor-not-allowed"
                          }`}
                          title={canRollback ? "Rollback all records from this import" : "Requires super_admin or manage permissions"}
                        >
                          <RotateCcw size={13} />
                          Rollback
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                  No import history logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.total_pages > 1 && (
        <PaginationBar
          currentPage={pagination.page}
          totalPages={pagination.total_pages}
          setCurrentPage={setCurrentPage}
        />
      )}

      {/* Confirmation Rollback Modal */}
      {rollbackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl animate-fade p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <h4 className="text-base font-bold">Confirm Rollback</h4>
              </div>
              <button 
                onClick={() => {
                  if (!rollingBack) setRollbackTarget(null);
                }}
                disabled={rollingBack}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to roll back the following import:
              </p>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-700 space-y-1.5">
                <div>
                  <span className="font-semibold text-slate-500">File:</span> {rollbackTarget.filename || "import_file.csv"}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Type:</span> {rollbackTarget.import_type === "candidates" ? "Candidates Import" : "Payments Import"}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Row Count:</span> {rollbackTarget.row_count}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Imported At:</span> {formatIstDateTime(rollbackTarget.created_at)}
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-150 rounded-lg p-3 flex gap-2">
                <AlertCircle className="text-rose-600 h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-[11px] text-rose-700 leading-normal">
                  <p className="font-bold">Important Consequences:</p>
                  {rollbackTarget.import_type === "candidates" ? (
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li>Candidates registered in this import will be permanently deleted.</li>
                      <li>Candidate profiles that were updated by this import will be reverted back to their exact pre-import fields.</li>
                    </ul>
                  ) : (
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li>All transaction records inserted by this import will be permanently deleted.</li>
                      <li>Candidate balances and ledger month snapshots will be automatically recalculated.</li>
                    </ul>
                  )}
                </div>
              </div>

              {/* Error messages if rollback is blocked */}
              {rollbackError && (
                <div className="bg-rose-100 text-rose-800 border border-rose-200 rounded-lg p-3 text-xs leading-normal">
                  <p className="font-bold">Rollback Blocked:</p>
                  <p className="mt-1 font-medium">{rollbackError}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <ControlButton
                variant="secondary"
                onClick={() => setRollbackTarget(null)}
                disabled={rollingBack}
                className="h-9 px-4 text-xs font-semibold"
              >
                Cancel
              </ControlButton>
              <button
                onClick={handleRollback}
                disabled={rollingBack}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition"
              >
                {rollingBack ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Rolling Back...
                  </>
                ) : (
                  <>
                    <RotateCcw size={12} />
                    Confirm Rollback
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
