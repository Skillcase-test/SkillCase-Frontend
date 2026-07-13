import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Upload, Download, AlertCircle, CheckCircle2, FileSpreadsheet, RefreshCw, X } from "lucide-react";
import { ControlButton } from "./controls";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { ImportHistorySection } from "./ImportHistorySection";
import {
  candidateMatchesSearch,
  candidatePhoneLabel,
  findUniqueCandidateByPhone,
} from "../utils/candidatePhones";

function CandidateSearchDropdown({ onSelect, candidateOptions }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [show, setShow] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const activeSearchRef = useRef("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFocus = () => {
    if (!query.trim()) {
      setOptions(candidateOptions.slice(0, 5));
      setShow(true);
    } else {
      setShow(true);
    }
  };

  const handleChange = (val) => {
    setQuery(val);
    const trimmed = val.trim();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    activeSearchRef.current = trimmed;

    if (!trimmed) {
      setOptions(candidateOptions.slice(0, 5));
      setSearching(false);
      return;
    }

    if (trimmed.length < 2) {
      const matches = candidateOptions.filter((c) => candidateMatchesSearch(c, trimmed));
      setOptions(matches.slice(0, 5));
      setSearching(false);
    } else {
      setSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await paymentsAdminApi.getEnrollmentOptions({ search: trimmed });
          if (activeSearchRef.current === trimmed) {
            setOptions((res.data?.options || []).slice(0, 5));
          }
        } catch (err) {
          console.error("Lookup failed:", err);
        } finally {
          if (activeSearchRef.current === trimmed) {
            setSearching(false);
          }
        }
      }, 250);
    }
  };

  const handleSelect = (c) => {
    onSelect(c);
    setShow(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        placeholder="Search name or phone..."
        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
      />
      {show && (
        <div className="absolute right-0 bottom-full mb-1 z-50 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg max-h-40 overflow-y-auto">
          {searching ? (
            <div className="px-3 py-1.5 text-[10px] text-slate-400 flex items-center gap-1 justify-center">
              <RefreshCw size={10} className="animate-spin" />
              Searching...
            </div>
          ) : options.length > 0 ? (
            options.map((c) => (
              <button
                key={c.enrollment_id || c.value}
                type="button"
                onClick={() => handleSelect(c)}
                className="block w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-[11px] text-slate-700 transition"
              >
                <div className="font-semibold text-slate-800">{c.student_name || c.label}</div>
                <div className="text-slate-400 text-[10px]">{candidatePhoneLabel(c)}</div>
              </button>
            ))
          ) : (
            <div className="px-3 py-1.5 text-[10px] text-slate-400 text-center">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ImportPaymentsPage({ onBack, onImportSuccess, candidateOptions = [] }) {
  const [showHistory, setShowHistory] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [successCount, setSuccessCount] = useState(0);
  const [parsedData, setParsedData] = useState([]);
  const [unmatchedPhones, setUnmatchedPhones] = useState([]);
  const [mappings, setMappings] = useState({});
  const fileInputRef = useRef(null);

  const filename = "payments_import_template.csv";

  const PAYMENT_HEADERS = [
    "Phone",
    "Tran. Id",
    "Value Date",
    "Transaction Date (optional)",
    "Transaction Posted Date (optional)",
    "Cheque. No./Ref. No. (optional)",
    "Transaction Remarks (optional)",
    "Withdrawal Amt (INR) (optional)",
    "Deposit Amt (INR)",
    "Status (optional)"
  ];

  const handleDownloadTemplate = () => {
    const csvContent = PAYMENT_HEADERS.join(",") + "\n";
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
    setParsedData([]);
    setUnmatchedPhones([]);
    setMappings({});
  };

  const parseCSV = (text) => {
    const rows = [];
    let row = [""];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push('');
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        rows.push(row);
        row = [''];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      rows.push(row);
    }
    return rows;
  };

  const extract10DigitPhone = (rawPhone) => {
    const raw = String(rawPhone || "").trim();
    const clean = raw.replace(/\D/g, "");
    if (clean.length === 10) {
      return clean;
    }
    if (clean.length === 12 && clean.startsWith("91")) {
      return clean.slice(-10);
    }
    if (clean.length === 11 && clean.startsWith("0")) {
      return clean.slice(-10);
    }
    if (raw.startsWith("+") || clean.length > 10) {
      return clean;
    }
    return clean.slice(-10);
  };

  const parseMonthFromValueDate = (dateStr) => {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    
    const m1 = clean.match(/^(\d{1,2})[/\s-]([a-zA-Z]{3,9})[/\s-](\d{4})/);
    if (m1) {
      const monthName = m1[2].toLowerCase().slice(0, 3);
      const months = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
      };
      return months[monthName] || null;
    }

    const m2 = clean.match(/^(\d{1,2})[/\s-](\d{1,2})[/\s-](\d{4})/);
    if (m2) {
      const monthNum = parseInt(m2[2], 10);
      if (monthNum >= 1 && monthNum <= 12) return monthNum;
    }

    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) return parsed.getMonth() + 1;

    return null;
  };

  const runValidation = () => {
    if (!file) return;
    setValidating(true);
    setErrors([]);
    setWarnings([]);
    setParsedData([]);
    setUnmatchedPhones([]);
    setMappings({});

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result || "";
      const parsedRows = parseCSV(text);
      
      let fileErrors = [];
      let fileWarnings = [];
      let validRows = [];

      if (parsedRows.length <= 1) {
        fileErrors.push({ row: 1, field: "File Content", reason: "The uploaded CSV file contains no data rows." });
        setErrors(fileErrors);
        setValidated(true);
        setValidating(false);
        return;
      }

      const fileHeaders = parsedRows[0].map(h => 
        h.trim().toLowerCase().replace(/\s*\(optional\)/g, "")
      );

      const phoneIdx = fileHeaders.findIndex(h => h.includes("phone"));
      const transIdIdx = fileHeaders.findIndex(h => h.includes("tran. id") || h.includes("tran id") || h.includes("trans id") || h.includes("transaction id"));
      const valueDateIdx = fileHeaders.findIndex(h => h.includes("value date") || h === "date");
      const depositAmtIdx = fileHeaders.findIndex(h => h.includes("deposit amt") || h.includes("deposit amount") || h.includes("amount"));
      const transDateIdx = fileHeaders.findIndex(h => h.includes("transaction date"));
      const transPostedDateIdx = fileHeaders.findIndex(h => h.includes("transaction posted date"));
      const chequeRefIdx = fileHeaders.findIndex(h => h.includes("cheque. no./ref. no.") || h.includes("cheque") || h.includes("ref. no."));
      const transRemarksIdx = fileHeaders.findIndex(h => h.includes("transaction remarks") || h.includes("remarks"));
      const withdrawalAmtIdx = fileHeaders.findIndex(h => h.includes("withdrawal amt") || h.includes("withdrawal amount"));
      const statusIdx = fileHeaders.findIndex(h => h.includes("status"));

      if (phoneIdx === -1) fileErrors.push({ row: 1, field: "Phone", reason: 'Missing mandatory column: "Phone"' });
      if (transIdIdx === -1) fileErrors.push({ row: 1, field: "Tran. Id", reason: 'Missing mandatory column: "Tran. Id"' });
      if (valueDateIdx === -1) fileErrors.push({ row: 1, field: "Value Date", reason: 'Missing mandatory column: "Value Date"' });
      if (depositAmtIdx === -1) fileErrors.push({ row: 1, field: "Deposit Amt (INR)", reason: 'Missing mandatory column: "Deposit Amt (INR)"' });

      if (fileErrors.length > 0) {
        setErrors(fileErrors);
        setValidated(true);
        setValidating(false);
        return;
      }

      const seenInFile = new Set();
      for (let i = 1; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        if (row.every(cell => !cell.trim())) continue;

        const rowNum = i + 1;
        const rawPhone = (row[phoneIdx] || "").trim();
        const transId = (row[transIdIdx] || "").trim();
        const valueDate = (row[valueDateIdx] || "").trim();
        const depositAmt = (row[depositAmtIdx] || "").trim();

        let hasRowErrors = false;

        const cleanPhone = extract10DigitPhone(rawPhone);
        if (!cleanPhone) {
          fileErrors.push({ row: rowNum, field: "Phone", reason: "Candidate phone number is empty." });
          hasRowErrors = true;
        } else if (cleanPhone.length < 10) {
          fileErrors.push({ row: rowNum, field: "Phone", reason: `Phone "${rawPhone}" is too short. Must resolve to a 10-digit number.` });
          hasRowErrors = true;
        }

        if (!transId) {
          fileErrors.push({ row: rowNum, field: "Tran. Id", reason: "Transaction ID is missing." });
          hasRowErrors = true;
        } else {
          const lowerTransId = transId.toLowerCase();
          if (lowerTransId !== "refund" && lowerTransId !== "refunded") {
            if (seenInFile.has(lowerTransId)) {
              fileErrors.push({ row: rowNum, field: "Tran. Id", reason: `Duplicate Transaction ID "${transId}" inside this CSV file.` });
              hasRowErrors = true;
            } else {
              seenInFile.add(lowerTransId);
            }
          }
        }

        if (!valueDate) {
          fileErrors.push({ row: rowNum, field: "Value Date", reason: "Value Date is missing." });
          hasRowErrors = true;
        } else {
          const parsedMonth = parseMonthFromValueDate(valueDate);
          if (!parsedMonth) {
            fileErrors.push({ row: rowNum, field: "Value Date", reason: `Value Date "${valueDate}" has an invalid date or month spelling.` });
            hasRowErrors = true;
          }
        }

        if (!depositAmt) {
          fileErrors.push({ row: rowNum, field: "Deposit Amt (INR)", reason: "Deposit amount is missing." });
          hasRowErrors = true;
        } else {
          const cleanAmount = depositAmt.replace(/,/g, "").trim();
          const numAmount = Number(cleanAmount);
          if (isNaN(numAmount) || numAmount === 0) {
            fileErrors.push({ row: rowNum, field: "Deposit Amt (INR)", reason: `Deposit amount "${depositAmt}" must be a non-zero number.` });
            hasRowErrors = true;
          }
        }

        if (!hasRowErrors) {
          validRows.push({
            rowNum,
            phone: rawPhone,
            cleanPhone,
            transId,
            valueDate,
            depositAmt: Number(depositAmt.replace(/,/g, "").trim()),
            transDate: transDateIdx !== -1 ? (row[transDateIdx] || "").trim() : "",
            transPostedDate: transPostedDateIdx !== -1 ? (row[transPostedDateIdx] || "").trim() : "",
            chequeRef: chequeRefIdx !== -1 ? (row[chequeRefIdx] || "").trim() : "",
            transRemarks: transRemarksIdx !== -1 ? (row[transRemarksIdx] || "").trim() : "",
            withdrawalAmt: withdrawalAmtIdx !== -1 ? (row[withdrawalAmtIdx] || "").trim() : "",
            status: statusIdx !== -1 ? (row[statusIdx] || "").trim() : ""
          });
        }
      }

      if (fileErrors.length > 0) {
        setErrors(fileErrors);
        setValidated(true);
        setValidating(false);
        return;
      }

      // Check database duplicates
      try {
        const allTranIds = validRows.map(r => r.transId);
        const dupCheckRes = await paymentsAdminApi.checkDuplicateTransactions({ transaction_ids: allTranIds });
        const existingDbIds = new Set((dupCheckRes.data?.existing || []).map(id => String(id || "").toLowerCase()));

        if (existingDbIds.size > 0) {
          validRows.forEach(row => {
            if (existingDbIds.has(row.transId.toLowerCase())) {
              fileErrors.push({
                row: row.rowNum,
                field: "Tran. Id",
                reason: `Transaction ID "${row.transId}" already exists in the database.`
              });
            }
          });
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
        fileErrors.push({ row: "-", field: "Database Check", reason: "Failed to check transaction IDs in database." });
      }

      if (fileErrors.length > 0) {
        setErrors(fileErrors);
        setValidated(true);
        setValidating(false);
        return;
      }

      const uniquePhones = Array.from(new Set(validRows.map(r => r.cleanPhone)));
      
      try {
        const checkPromises = uniquePhones.map(async (phone) => {
          try {
            const res = await paymentsAdminApi.getEnrollmentOptions({ search: phone });
            const serverMatch = findUniqueCandidateByPhone(res.data?.options || [], phone);
            return { phone, candidate: serverMatch || null };
          } catch (_) {
            return { phone, candidate: null };
          }
        });

        const checkResults = await Promise.all(checkPromises);

        const autoMappings = {};
        const unmatchedList = [];

        checkResults.forEach(({ phone, candidate }) => {
          if (candidate) {
            autoMappings[phone] = {
              enrollment_id: candidate.enrollment_id || candidate.value,
              student_name: candidate.student_name || candidate.label,
              student_phone: candidate.student_phone || candidate.phone || ""
            };
          } else {
            unmatchedList.push(phone);
          }
        });

        setParsedData(validRows);
        setUnmatchedPhones(unmatchedList);
        setMappings(autoMappings);
        setSuccessCount(validRows.length);
      } catch (err) {
        console.error("Candidate matching failed:", err);
        fileErrors.push({ row: "-", field: "Database Match", reason: "Failed to connect to candidate database." });
        setErrors(fileErrors);
      } finally {
        setValidated(true);
        setValidating(false);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    setLoading(true);
    const importErrors = [];
    const txPayloads = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      const mapping = mappings[row.cleanPhone];
      const enrollmentId = mapping?.enrollment_id || mapping?.value;

      if (!enrollmentId) {
        importErrors.push({
          row: row.rowNum,
          field: "Mapping",
          reason: `Candidate mapping missing for phone "${row.phone}".`
        });
        continue;
      }

      const notesPayload = {
        tranId: row.transId,
        transactionDate: row.transDate || "",
        transactionPostedDate: row.transPostedDate || "",
        chequeNoRefNo: row.chequeRef || "",
        transactionRemarks: row.transRemarks || "",
        withdrawalAmt: row.withdrawalAmt || "",
        status: row.status || ""
      };

      txPayloads.push({
        enrollment_id: enrollmentId,
        amount_inr: row.depositAmt,
        paid_at: row.valueDate,
        razorpay_payment_id: row.transId,
        notes: JSON.stringify(notesPayload)
      });
    }

    if (importErrors.length > 0) {
      setLoading(false);
      setErrors(importErrors);
      return;
    }

    try {
      let fileContentBase64 = null;
      try {
        fileContentBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = err => reject(err);
        });
      } catch (fileErr) {
        console.error("Base64 conversion failed:", fileErr);
      }

      const importId = "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );

      await paymentsAdminApi.createBatchManualTransactions({
        transactions: txPayloads,
        import_id: importId,
        filename: file.name,
        file_content: fileContentBase64
      });
      setLoading(false);
      onImportSuccess(`${txPayloads.length} payments imported successfully.`);
    } catch (err) {
      setLoading(false);
      const errMsg = err?.response?.data?.msg || err.message;
      setErrors([
        {
          row: "-",
          field: "Import Failure",
          reason: `Batch import failed. Reason: ${errMsg}`
        }
      ]);
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
              Bulk Import Payments
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Upload a standard CSV spreadsheet to batch import transaction records.</p>
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
          <p className="text-sm font-semibold text-slate-800">1. Upload populated CSV sheet</p>
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
              <p className="text-sm font-medium text-slate-700">Drag and drop your file here, or <span className="text-indigo-600 font-semibold">browse</span></p>
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
            <p className="text-sm font-semibold text-slate-800">2. Sample Spreadsheet Template</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Get the required headers template so payment records align perfectly without import errors. Mandatory headers are Phone, Tran. Id, Value Date, and Deposit Amt (INR).
            </p>
          </div>
          <ControlButton variant="secondary" onClick={handleDownloadTemplate} className="h-10 px-4 flex items-center justify-center gap-1.5 text-xs text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50 w-full mt-auto">
            <Download size={14} />
            Download Sample CSV Template
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
                  <p className="text-sm font-bold text-rose-800">
                    {errors.some(e => e.field === "Import Failure" || e.reason.toLowerCase().includes("import"))
                      ? `Import Execution Failed (${errors.length} Errors)`
                      : `Dry-Run Validation Failed (${errors.length} Errors)`}
                  </p>
                  <p className="text-xs text-rose-600 mt-1">
                    {errors.some(e => e.field === "Import Failure" || e.reason.toLowerCase().includes("import"))
                      ? "Some transactions could not be created. Please review the failures below."
                      : "Please fix the spreadsheet columns or field entries below and re-upload."}
                  </p>
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
            /* No structural errors */
            <>
              {unmatchedPhones.length > 0 && unmatchedPhones.some(p => !mappings[p]) ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Candidate Mapping Required</p>
                      <p className="text-xs text-amber-600 mt-1">
                        We found some phone numbers in the CSV that do not match existing candidates in the database. Please map them below to proceed.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-250 bg-emerald-50/40 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Dry-Run Validation Succeeded</p>
                      <p className="text-xs text-emerald-600 mt-1">
                        All {successCount} payments parsed cleanly. Ready for import execution.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Mappings Section */}
              {unmatchedPhones.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-5 space-y-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      Map Unregistered Phone Numbers ({unmatchedPhones.length})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Link each number to an existing candidate profile:</p>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-sm">
                    {unmatchedPhones.map((phoneNum) => {
                      const mapping = mappings[phoneNum];
                      return (
                        <div key={phoneNum} className="flex items-center justify-between p-4 gap-6 text-xs hover:bg-slate-50/30 transition">
                          <div className="flex flex-col">
                            <span className="font-mono text-slate-800 text-sm font-bold">{phoneNum}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">Phone in CSV</span>
                          </div>
                          
                          {mapping ? (
                            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-slate-700 px-4 py-2 rounded-xl">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              <div className="text-left leading-normal">
                                <span className="font-bold text-slate-800 block text-xs">{mapping.student_name}</span>
                                <span className="block text-[10px] text-slate-500 font-medium">{mapping.student_phone}</span>
                              </div>
                              <button 
                                onClick={() => {
                                  setMappings(prev => {
                                    const next = { ...prev };
                                    delete next[phoneNum];
                                    return next;
                                  });
                                }}
                                className="ml-3 text-indigo-600 hover:text-indigo-800 font-bold text-xs"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <CandidateSearchDropdown
                              candidateOptions={candidateOptions}
                              onSelect={(candidate) => {
                                setMappings(prev => ({
                                  ...prev,
                                  [phoneNum]: {
                                    enrollment_id: candidate.enrollment_id || candidate.value,
                                    student_name: candidate.student_name || candidate.label,
                                    student_phone: candidate.student_phone || candidate.phone || ""
                                  }
                                }));
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Warnings Table */}
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Non-blocking Warnings ({warnings.length})</p>
                  <p className="text-xs text-amber-600 mt-1">These records will still be imported but should be reviewed.</p>
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
              disabled={!validated || errors.length > 0 || unmatchedPhones.some(p => !mappings[p]) || loading} 
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
      {showHistory && <ImportHistorySection type="payments" />}

    </div>
  );
}
