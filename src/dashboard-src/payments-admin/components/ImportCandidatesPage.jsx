import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Upload, Download, AlertCircle, CheckCircle2, FileSpreadsheet, RefreshCw } from "lucide-react";
import { ControlButton } from "./controls";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { ImportHistorySection } from "./ImportHistorySection";

export function ImportCandidatesPage({ onBack, onImportSuccess, batches = [] }) {
  const [showHistory, setShowHistory] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [successCount, setSuccessCount] = useState(0);
  const [dryRunToken, setDryRunToken] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const fileInputRef = useRef(null);

  const filename = "candidates_import_template.csv";

  const CANDIDATE_HEADERS = [
    "Name",
    "Phone",
    "Email",
    "Date of Birth",
    "Gender",
    "Nationality",
    "Current Location",
    "State",
    "Educational Qualification",
    "Terms Acknowledgement",
    "Enrollment Date",
    "Alternate Number (optional)",
    "Lead Owner (optional)",
    "Total Fee (INR) (optional)",
    "Monthly Fee (INR) (optional)",
    "Year of Passing (optional)",
    "Shift Pattern (optional)",
    "First Shift Timing (optional)",
    "Second Shift Timing (optional)",
    "Third Shift Timing (optional)",
    "Daily Shift Timing (optional)",
    "Expected Payment Start Date (optional)"
  ];

  // Auto-resolve batch named "Not Registered" on mount to set as default
  useEffect(() => {
    const notReg = batches.find(b => String(b.batch_name).toLowerCase().trim() === "not registered");
    if (notReg) {
      setSelectedBatchId(notReg.batch_id);
    } else if (batches.length > 0) {
      setSelectedBatchId("");
    }
  }, [batches]);

  const handleDownloadTemplate = () => {
    const csvContent = CANDIDATE_HEADERS.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) selectFile(droppedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) selectFile(selectedFile);
  };

  const selectFile = (selectedFile) => {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setErrors([
        {
          row: "-",
          field: "File Format",
          reason: "Unsupported file type. Please upload a CSV (.csv) file only."
        }
      ]);
      setFile(null);
      setValidated(true);
      return;
    }
    setFile(selectedFile);
    setErrors([]);
    setWarnings([]);
    setValidated(false);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setValidated(false);
    setErrors([]);
    setWarnings([]);
    setDryRunToken("");
  };

  const runValidation = async () => {
    if (!file) return;
    setValidating(true);
    setErrors([]);
    setWarnings([]);
    setDryRunToken("");

    const formData = new FormData();
    formData.append("candidates_file", file);

    try {
      const res = await paymentsAdminApi.importCandidatesDryRun(formData);
      const data = res.data || {};
      setDryRunToken(data.dry_run_token || "");
      setErrors(data.errors || []);
      setWarnings(data.warnings || []);
      setSuccessCount(data.summary?.total_rows || 0);
      setValidated(true);
    } catch (err) {
      console.error("Dry run validation failed:", err);
      const errMsg = err?.response?.data?.msg || err.message || "Failed to validate candidate file.";
      setErrors([
        {
          row: "-",
          field: "Validation",
          reason: errMsg
        }
      ]);
      setValidated(true);
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!dryRunToken) return;
    setLoading(true);
    try {
      const payload = {
        dry_run_token: dryRunToken,
        batch_id: selectedBatchId ? Number(selectedBatchId) : null
      };
      const res = await paymentsAdminApi.importCandidatesConfirm(payload);
      const summary = res.data?.summary || {};
      onImportSuccess(`${summary.created || 0} candidates created, ${summary.updated || 0} updated successfully.`);
    } catch (err) {
      console.error("Confirm candidate import failed:", err);
      const errMsg = err?.response?.data?.msg || err.message || "Failed to import candidates.";
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
        <button 
          onClick={onBack}
          disabled={loading || validating}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium disabled:opacity-50 w-fit"
        >
          <ArrowLeft size={14} />
          Back to Payments Dashboard
        </button>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="text-indigo-600 h-5 w-5" />
              Bulk Import Candidates
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Upload a candidate roster spreadsheet to create or update candidate profiles in bulk.</p>
          </div>
          <ControlButton
            variant="secondary"
            onClick={() => setShowHistory((prev) => !prev)}
            className="h-9 px-4 text-xs font-semibold"
          >
            {showHistory ? "Hide Import History" : "View Import History"}
          </ControlButton>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Upload File Card */}
        <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/20 space-y-4">
          <p className="text-sm font-semibold text-slate-800">1. Upload Candidate CSV</p>
          {!file ? (
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-10 text-center bg-white hover:bg-indigo-50/5 cursor-pointer transition flex flex-col items-center justify-center gap-2 h-44"
            >
              <div className="rounded-full bg-slate-50 p-3 text-slate-500">
                <Upload size={22} className="text-indigo-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">Drag and drop your CSV here, or <span className="text-indigo-600 font-semibold">browse</span></p>
              <p className="text-xs text-slate-400">Supports .csv files up to 5MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 p-4 bg-white flex items-center justify-between h-44">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 break-all">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {!validated && (
                  <ControlButton variant="primary" onClick={runValidation} disabled={validating} className="h-9 px-4 text-xs font-semibold">
                    {validating ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw size={12} className="animate-spin" />
                        Validating...
                      </span>
                    ) : "Validate Data"}
                  </ControlButton>
                )}
                <ControlButton variant="secondary" onClick={handleRemoveFile} className="h-9 px-4 text-xs font-semibold text-rose-600 border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700">
                  Remove File
                </ControlButton>
              </div>
            </div>
          )}
        </div>

        {/* Info & Download Card */}
        <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/20 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">2. Download CSV Template</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Get the candidate import schema CSV template. Populate all mandatory profile fields such as Name, Phone, Email, DOB, Gender, Nationality, Location, State, Qualification, and Terms Acknowledgement.
            </p>
          </div>
          <ControlButton variant="secondary" onClick={handleDownloadTemplate} className="h-10 px-4 flex items-center justify-center gap-1.5 text-xs text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50 w-full mt-auto">
            <Download size={14} />
            Download Candidates Template
          </ControlButton>
        </div>

      </div>

      {/* Validation Status & Tables */}
      {validated && (
        <div className="space-y-6 animate-fade">
          
          {errors.length > 0 ? (
            <div className="rounded-xl border border-rose-250 bg-rose-50/50 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-rose-800">Dry-Run Validation Failed ({errors.length} Errors)</p>
                  <p className="text-xs text-rose-600 mt-1">Please fix the spreadsheet columns or field entries below and re-upload.</p>
                </div>
              </div>

              {/* Errors Table */}
              <div className="overflow-hidden border border-rose-100 rounded-xl bg-white shadow-sm">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="bg-rose-50 text-rose-850 uppercase tracking-wider font-semibold border-b border-rose-100">
                      <th className="px-4 py-2.5 text-center w-16">Row</th>
                      <th className="px-4 py-2.5 w-32">Field</th>
                      <th className="px-4 py-2.5">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50">
                    {errors.map((e, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/10 text-slate-700">
                        <td className="px-4 py-2 font-mono text-center text-rose-700 bg-rose-50/5 font-bold">{e.row}</td>
                        <td className="px-4 py-2 font-semibold text-slate-800">{e.field}</td>
                        <td className="px-4 py-2 text-rose-700 font-medium">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Dry run succeeded */
            <div className="space-y-6">
              <div className="rounded-xl border border-emerald-250 bg-emerald-50/40 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Dry-Run Validation Succeeded</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      All {successCount} candidates validated successfully. Select a target batch to complete the import.
                    </p>
                  </div>
                </div>
              </div>

              {/* Batch Selector Card */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/20 space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">Select Batch for Uploaded Candidates</span>
                  <span className="block text-xs text-slate-500 mt-0.5">All candidates in this sheet will be assigned to this batch (default: "Not Registered"):</span>
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">No Batch (Maps to "Not Registered")</option>
                  {batches.map((b) => (
                    <option key={b.batch_id} value={b.batch_id}>
                      {b.batch_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Warnings Table */}
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Non-blocking Profile Mappings ({warnings.length})</p>
                  <p className="text-xs text-amber-600 mt-1">These candidates already exist in the database and will have their profiles updated.</p>
                </div>
              </div>
              <div className="mt-3 overflow-hidden border border-amber-100 rounded-xl bg-white shadow-sm">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="bg-amber-50 text-amber-800 uppercase tracking-wider font-semibold border-b border-amber-100">
                      <th className="px-4 py-2.5 text-center w-16">Row</th>
                      <th className="px-4 py-2.5 w-32">Field</th>
                      <th className="px-4 py-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {warnings.map((w, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/10 text-slate-700">
                        <td className="px-4 py-2 font-mono text-center text-amber-700 bg-amber-50/5 font-bold">{w.row}</td>
                        <td className="px-4 py-2 font-semibold text-slate-800">{w.field}</td>
                        <td className="px-4 py-2 text-slate-600">{w.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <ControlButton variant="secondary" onClick={onBack} disabled={loading} className="h-10 px-5">
              Cancel
            </ControlButton>
            <ControlButton 
              variant="primary" 
              onClick={handleConfirmImport} 
              disabled={!validated || errors.length > 0 || loading} 
              className="h-10 px-6 flex items-center gap-1.5 font-bold"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Importing...
                </>
              ) : "Confirm Import"}
            </ControlButton>
          </div>

        </div>
      )}
      {showHistory && <ImportHistorySection type="candidates" />}

    </div>
  );
}
