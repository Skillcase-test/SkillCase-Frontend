import React, { useState, useEffect } from "react";
import { Download, RotateCcw, FileText, FileSpreadsheet, Clock, User, AlertCircle, RefreshCw, X } from "lucide-react";
import { PaginationBar } from "./PaginationBar";
import { formatIstDateTime } from "../utils/formatters";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";

export function ImportHistorySection({ type, onRollbackSuccess }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [adminRole, setAdminRole] = useState("");
  const [paymentActions, setPaymentActions] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState("");

  const canRollback = adminRole === "super_admin" || (paymentActions && paymentActions.includes("manage"));

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await paymentsAdminApi.getImportHistory({
        page: currentPage,
        limit: 10,
        type,
      });
      setRows(res.data.rows || []);
      setPagination(res.data.pagination || { page: currentPage, limit: 10, total: (res.data.rows || []).length, total_pages: 1 });
    } catch (err) {
      console.error("Failed to load import history:", err);
      setError("Failed to load import history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadAccess() {
      try {
        const res = await paymentsAdminApi.getMyAccess();
        setAdminRole(res.data?.role || "");
        setPaymentActions(res.data?.permissions?.["payments"] || []);
      } catch (err) {
        console.error("Failed to fetch admin access for history section:", err);
      }
    }
    loadAccess();
  }, []);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, type]);

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
      loadHistory();
      if (typeof onRollbackSuccess === "function") {
        onRollbackSuccess();
      }
    } catch (err) {
      console.error("Rollback failed:", err);
      setRollbackError(err?.response?.data?.msg || err.message || "Failed to trigger rollback.");
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pt-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-indigo-600 h-4 w-4" />
            Upload & Import History
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Previous {type === "candidates" ? "candidate" : "payment"} spreadsheet uploads. Revert incorrect uploads using rollback.
          </p>
        </div>
        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition"
        >
          Refresh Log
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700 text-left">
          {error}
        </div>
      )}

      {/* Main Table Card */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
        <table className="min-w-full text-xs text-left">
          <thead>
            <tr className="border-b bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Filename</th>
              <th className="px-4 py-3 text-center">Row Count</th>
              <th className="px-4 py-3">Imported By</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-1.5">
                    <RefreshCw size={14} className="animate-spin text-indigo-600" />
                    <span>Loading history...</span>
                  </div>
                </td>
              </tr>
            ) : rows && rows.length > 0 ? (
              rows.map((r, i) => (
                <tr key={r.import_id} className={`hover:bg-slate-50/20 text-slate-700 transition ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {formatIstDateTime(r.created_at)}
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
                        type="button"
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
                          type="button"
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
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-left">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl animate-fade p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <h4 className="text-base font-bold">Confirm Rollback</h4>
              </div>
              <button 
                type="button"
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
              <button
                type="button"
                onClick={() => setRollbackTarget(null)}
                disabled={rollingBack}
                className="h-9 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
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
