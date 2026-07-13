import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import { ControlButton, ControlInput } from "./controls";
import { formatInrFromPaise } from "../utils/formatters";

const candidateLabel = (candidate) => {
  const name = candidate?.student_name || "Unnamed candidate";
  const phone = candidate?.student_phone || "No phone";
  return `${name} (${phone})`;
};

export function RelinkPaymentModal({
  modal,
  setModal,
  onConfirm,
  candidateOptions = [],
}) {
  const [query, setQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [options, setOptions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const wrapperRef = useRef(null);
  const searchTimerRef = useRef(null);
  const activeSearchRef = useRef("");

  useEffect(() => {
    setQuery("");
    setSelectedCandidate(null);
    setOptions([]);
    setShowDropdown(false);
    setSearching(false);
    setLoading(false);
    setError("");
  }, [modal?.open, modal?.payment?.payment_id]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  if (!modal?.open || !modal.payment) return null;

  const payment = modal.payment;
  const currentPhone = payment.student_phone || "-";
  const currentName = payment.student_name || "-";
  const amountStr = formatInrFromPaise(
    payment.signed_amount_paise ?? payment.amount_paise,
  );
  const paymentIdStr =
    payment.razorpay_payment_id || payment.payment_id || "-";

  const findLocalCandidates = (value) => {
    const normalized = value.toLowerCase();
    const digits = value.replace(/\D/g, "");
    return candidateOptions
      .filter((candidate) => {
        const name = String(candidate.student_name || "").toLowerCase();
        const phone = String(candidate.student_phone || "").replace(/\D/g, "");
        return name.includes(normalized) || (digits && phone.includes(digits));
      })
      .slice(0, 8);
  };

  const handleSearch = (value) => {
    setQuery(value);
    setSelectedCandidate(null);
    setError("");
    setShowDropdown(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const trimmed = value.trim();
    activeSearchRef.current = trimmed;
    if (!trimmed) {
      setOptions(candidateOptions.slice(0, 8));
      setSearching(false);
      return;
    }

    setOptions(findLocalCandidates(trimmed));
    if (trimmed.length < 2) {
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await paymentsAdminApi.getEnrollmentOptions({
          search: trimmed,
        });
        if (activeSearchRef.current === trimmed) {
          setOptions((response.data?.options || []).slice(0, 8));
        }
      } catch {
        if (activeSearchRef.current === trimmed) {
          setError("Candidate search failed. Please try again.");
        }
      } finally {
        if (activeSearchRef.current === trimmed) setSearching(false);
      }
    }, 250);
  };

  const handleClose = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setModal({ open: false, payment: null });
  };

  const handleConfirm = async () => {
    if (!selectedCandidate?.enrollment_id) {
      setError("Please select an existing candidate from the list.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onConfirm(payment.payment_id, {
        enrollmentId: selectedCandidate.enrollment_id,
        phone: selectedCandidate.student_phone || "",
      });
      handleClose();
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to relink payment transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">
          Relink Payment Transaction
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Reassociate payment with an existing candidate.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
          <div className="flex justify-between gap-4">
            <span className="font-semibold">Transaction ID:</span>
            <span className="truncate font-mono">{paymentIdStr}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-semibold">Amount:</span>
            <span>{amountStr}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-semibold">Currently Linked To:</span>
            <span className="text-right">{currentName} ({currentPhone})</span>
          </div>
        </div>

        <div ref={wrapperRef} className="relative mt-4">
          <label className="block text-xs font-semibold text-slate-700">
            Target Candidate
          </label>
          <ControlInput
            type="text"
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            onFocus={() => {
              if (!query) setOptions(candidateOptions.slice(0, 8));
              setShowDropdown(true);
            }}
            placeholder="Search candidate name or phone"
            className="mt-1 w-full"
            leftIcon={<Search size={16} />}
            disabled={loading}
            autoComplete="off"
          />
          {showDropdown ? (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              {searching ? (
                <div className="px-3 py-2 text-xs text-slate-500">Searching...</div>
              ) : options.length ? (
                options.map((candidate) => (
                  <button
                    key={candidate.enrollment_id}
                    type="button"
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setQuery(candidateLabel(candidate));
                      setShowDropdown(false);
                      setError("");
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="block text-sm font-semibold text-slate-800">
                      {candidate.student_name || "Unnamed candidate"}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {candidate.student_phone || "No phone"}
                      {candidate.student_email ? ` | ${candidate.student_email}` : ""}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-slate-500">
                  No matching candidates found.
                </div>
              )}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <ControlButton variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </ControlButton>
          <ControlButton
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || !selectedCandidate}
          >
            {loading ? "Relinking..." : "Confirm Relink"}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
