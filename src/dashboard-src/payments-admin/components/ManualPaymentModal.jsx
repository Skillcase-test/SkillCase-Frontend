import React, { useState, useEffect, useRef } from "react";
import { X, Save, Trash2, Calendar, DollarSign, Key, Phone, RefreshCw } from "lucide-react";
import { ControlButton, ControlInput } from "./controls";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";
import {
  candidateHasExactPhone,
  candidateMatchesSearch,
  candidatePhoneLabel,
  findUniqueCandidateByPhone,
} from "../utils/candidatePhones";

export function ManualPaymentModal({
  modal,
  setModal,
  onCreate,
  onUpdate,
  onDelete,
  candidateOptions = []
}) {
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [phone, setPhone] = useState("");
  const [tranId, setTranId] = useState("");
  const [valueDate, setValueDate] = useState("");
  const [depositAmt, setDepositAmt] = useState("");
  const [saving, setSaving] = useState(false);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapperRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const activeSearchRef = useRef("");

  const isEdit = modal?.mode === "edit";

  // Sync state on load/mode change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    activeSearchRef.current = "";
    setSearching(false);

    if (modal?.open) {
      if (isEdit && modal.data) {
        const d = modal.data;
        setSelectedEnrollmentId(d.enrollment_id || "");
        setPhone(d.student_phone || "");
        
        let notesObj = {};
        try {
          if (d.metadata_json?.notes) {
            notesObj = JSON.parse(d.metadata_json.notes);
          } else if (d.notes) {
            notesObj = JSON.parse(d.notes);
          }
        } catch {
          notesObj = {};
        }

        setTranId(notesObj.tranId || d.razorpay_payment_id || "");
        setValueDate(d.paid_at ? d.paid_at.slice(0, 10) : "");
        setDepositAmt((Number(d.amount_paise || 0) / 100).toString());
      } else {
        setSelectedEnrollmentId("");
        setPhone("");
        setTranId("");
        setValueDate("");
        setDepositAmt("");
        setFilteredCandidates([]);
        setShowDropdown(false);
      }
    }
  }, [modal]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!modal?.open) return undefined;

    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [modal?.open]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  if (!modal?.open) return null;

  // Extract last 10 digits
  const extract10DigitPhone = (rawPhone) => {
    if (!rawPhone) return "";
    const clean = String(rawPhone).replace(/\D/g, "");
    if (clean.length >= 10) {
      return clean.slice(-10);
    }
    return clean;
  };

  // Live real-time backend search as the user types
  const handlePhoneChange = async (val) => {
    setPhone(val);
    if (isEdit) return;

    const trimmed = val.trim();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    activeSearchRef.current = trimmed;

    if (trimmed.length === 0) {
      setFilteredCandidates(candidateOptions.slice(0, 5));
      setShowDropdown(true);
      setSearching(false);
    } else if (trimmed.length < 2) {
      // Small search string: match in locally preloaded options for speed
      const matches = candidateOptions.filter((c) => candidateMatchesSearch(c, trimmed));
      setFilteredCandidates(matches.slice(0, 5));
      setShowDropdown(true);
      setSearching(false);
    } else {
      setShowDropdown(true);
      setSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await paymentsAdminApi.getEnrollmentOptions({
            search: trimmed
          });
          if (activeSearchRef.current === trimmed) {
            const options = res.data?.options || [];
            setFilteredCandidates(options.slice(0, 5));
          }
        } catch (err) {
          console.error("Autocomplete search failed:", err);
        } finally {
          if (activeSearchRef.current === trimmed) {
            setSearching(false);
          }
        }
      }, 300);
    }
  };

  // Show preloaded quick list on focus based on current text
  const handleInputFocus = () => {
    if (isEdit) return;
    const trimmed = phone.trim();
    if (trimmed.length >= 2) {
      setShowDropdown(true);
    } else if (trimmed.length > 0) {
      const matches = candidateOptions.filter((c) => candidateMatchesSearch(c, trimmed));
      setFilteredCandidates(matches.slice(0, 5));
      setShowDropdown(true);
    } else {
      setFilteredCandidates(candidateOptions.slice(0, 5));
      setShowDropdown(true);
    }
  };

  const handleSelectCandidate = (c) => {
    setPhone(c.student_phone || c.phone || "");
    setSelectedEnrollmentId(c.enrollment_id || c.value);
    setShowDropdown(false);
  };

  const handleSave = async () => {
    if (!phone.trim()) {
      alert("Phone number is required.");
      return;
    }
    const cleanPhone = extract10DigitPhone(phone);
    if (cleanPhone.length < 10) {
      alert("Please enter a valid phone number with at least 10 digits.");
      return;
    }
    if (!tranId.trim()) {
      alert("Transaction ID is required.");
      return;
    }
    if (!valueDate) {
      alert("Value Date is required.");
      return;
    }
    if (!depositAmt.trim() || isNaN(Number(depositAmt)) || Number(depositAmt) === 0) {
      alert("Please enter a valid deposit amount.");
      return;
    }

    setSaving(true);

    try {
      let resolvedEnrollmentId = selectedEnrollmentId;

      if (isEdit && modal.data?.enrollment_id) {
        resolvedEnrollmentId = modal.data.enrollment_id;
      } else {
        // Find existing candidate matching the entered phone (last 10 digits match)
        const res = await paymentsAdminApi.getEnrollmentOptions({ search: cleanPhone });
        const serverOptions = res.data?.options || [];
        const matchedServer = findUniqueCandidateByPhone(serverOptions, cleanPhone);

        if (matchedServer) {
          resolvedEnrollmentId = matchedServer.enrollment_id || matchedServer.value;
        } else {
          const exactMatches = serverOptions.filter((candidate) =>
            candidateHasExactPhone(candidate, cleanPhone),
          );
          alert(exactMatches.length > 1
            ? "Multiple candidates use this phone number. Please select the correct candidate from the dropdown."
            : "Candidate with this phone number does not exist. Please add the candidate first or select them from the dropdown autocomplete list.");
          setSaving(false);
          return;
        }
      }

      const notesPayload = {
        tranId: tranId.trim()
      };

      const payload = {
        enrollment_id: resolvedEnrollmentId,
        amount_inr: Number(depositAmt),
        paid_at: valueDate,
        razorpay_payment_id: tranId.trim(),
        notes: JSON.stringify(notesPayload)
      };

      if (isEdit && modal.data?.payment_id) {
        await onUpdate(modal.data.payment_id, payload);
      } else {
        await onCreate(payload);
      }
    } catch (err) {
      console.error("Save manual payment failed:", err);
      alert("Failed to save payment: " + (err?.response?.data?.msg || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {isEdit ? "Edit Manual Payment" : "Add Manual Payment"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Record candidate transactional payments manually.</p>
          </div>
          <button 
            onClick={() => setModal({ open: false, mode: "create", data: null })} 
            disabled={saving}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          <div className="space-y-3">
            
            {/* Phone Input with Autocomplete dropdown wrapper */}
            <div ref={wrapperRef} className="relative flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Phone Number *
              </label>
              <ControlInput 
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onFocus={handleInputFocus}
                placeholder="Enter phone number or search candidate..."
                leftIcon={<Phone size={14} />}
                disabled={saving || isEdit}
                className="w-full"
              />

              {/* Autocomplete Dropdown List */}
              {showDropdown && (phone.trim() || filteredCandidates.length > 0) && (
                <div className="absolute top-[68px] z-50 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg max-h-48 overflow-y-auto animate-fade">
                  {searching ? (
                    <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-1.5 justify-center">
                      <RefreshCw size={12} className="animate-spin" />
                      Searching...
                    </div>
                  ) : filteredCandidates.length > 0 ? (
                    filteredCandidates.map((c) => (
                      <button
                        key={c.enrollment_id || c.value}
                        type="button"
                        onClick={() => handleSelectCandidate(c)}
                        className="block w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-50 text-slate-700 transition"
                      >
                        <div className="font-semibold text-slate-800">
                          {c.student_name || c.label}
                        </div>
                        <div className="text-slate-400 mt-0.5">
                          {candidatePhoneLabel(c)} {c.batch_name ? ` | ${c.batch_name}` : ""}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400 text-center">
                      No candidates found
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Transaction ID *
              <ControlInput 
                value={tranId}
                onChange={(e) => setTranId(e.target.value)}
                placeholder="Enter transaction/payment ID"
                leftIcon={<Key size={14} />}
                disabled={saving}
                className="w-full"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Value Date *
              <ControlInput 
                type="date"
                value={valueDate}
                onChange={(e) => setValueDate(e.target.value)}
                leftIcon={<Calendar size={14} />}
                disabled={saving}
                className="w-full"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Deposit Amt (INR) *
              <ControlInput 
                type="number"
                value={depositAmt}
                onChange={(e) => setDepositAmt(e.target.value)}
                placeholder="0.00"
                leftIcon={<DollarSign size={14} />}
                disabled={saving}
                className="w-full"
              />
            </label>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex items-center justify-end gap-2">
          {isEdit && (
            <ControlButton 
              variant="danger" 
              onClick={() => onDelete(modal.data.payment_id)} 
              disabled={saving}
              className="mr-auto"
            >
              <Trash2 size={14} className="mr-1" />
              Delete
            </ControlButton>
          )}
          <ControlButton 
            variant="secondary" 
            onClick={() => setModal({ open: false, mode: "create", data: null })}
            disabled={saving}
          >
            Cancel
          </ControlButton>
          <ControlButton 
            variant="primary" 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-1.5 px-5"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Payment
              </>
            )}
          </ControlButton>
        </div>

      </div>
    </div>
  );
}
