import React, { useState, useEffect, useRef } from "react";
import {
  X,
  RefreshCw,
  Phone,
  IndianRupee,
  Link,
  Copy,
  Check,
  User,
  Mail,
} from "lucide-react";
import { ControlButton, ControlInput } from "./controls";
import { paymentsAdminApi } from "../../../api/paymentsAdminApi";

export function CreatePaymentLinkModal({
  modal,
  setModal,
  candidateOptions = [],
}) {
  const [isCustomCandidate, setIsCustomCandidate] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [phoneSearch, setPhoneSearch] = useState("");

  // Custom candidate inputs
  const [customName, setCustomName] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  const [amountInr, setAmountInr] = useState("");
  const [description, setDescription] = useState("");
  const [gateway, setGateway] = useState("razorpay");
  const [linkType, setLinkType] = useState("standard");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);

  const wrapperRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const activeSearchRef = useRef("");

  // Sync state on load/close
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    activeSearchRef.current = "";
    setSearching(false);

    setIsCustomCandidate(false);
    setSelectedCandidate(null);
    setPhoneSearch("");
    setCustomName("");
    setCustomPhone("");
    setCustomEmail("");
    setAmountInr("");
    setDescription("");
    setGateway("razorpay");
    setLinkType("standard");
    setErrorMsg("");
    setGeneratedLink("");
    setCopied(false);
    setFilteredCandidates([]);
    setShowDropdown(false);
  }, [modal]);

  // Click outside closes dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  if (!modal?.open) return null;

  const handlePhoneChange = async (val) => {
    setPhoneSearch(val);
    setSelectedCandidate(null);

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
      const cleanVal = trimmed.replace(/\D/g, "").toLowerCase();
      const matches = candidateOptions.filter((c) => {
        const candPhone = String(
          c.student_phone || c.phone || c.label || "",
        ).replace(/\D/g, "");
        const candName = String(c.student_name || c.label || "").toLowerCase();
        return (
          (cleanVal ? candPhone.includes(cleanVal) : false) ||
          candName.includes(trimmed.toLowerCase())
        );
      });
      setFilteredCandidates(matches.slice(0, 5));
      setShowDropdown(true);
      setSearching(false);
    } else {
      setShowDropdown(true);
      setSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await paymentsAdminApi.getEnrollmentOptions({
            search: trimmed,
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

  const handleSelectCandidate = (cand) => {
    setSelectedCandidate(cand);
    setPhoneSearch(cand.student_name || cand.label || "");
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    if (!selectedCandidate && filteredCandidates.length === 0) {
      setFilteredCandidates(candidateOptions.slice(0, 5));
    }
    setShowDropdown(true);
  };

  const handleGenerateLink = async (e) => {
    e.preventDefault();

    if (isCustomCandidate) {
      if (!customName || !customName.trim()) {
        setErrorMsg("Please enter candidate name.");
        return;
      }
      if (!customPhone || !customPhone.trim()) {
        setErrorMsg("Please enter candidate phone number.");
        return;
      }
    } else {
      if (!selectedCandidate) {
        setErrorMsg("Please select a candidate from the autocomplete list.");
        return;
      }
    }

    const amt = Number(amountInr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Please enter a positive numeric amount.");
      return;
    }
    if (Math.round(amt * 100) < 100) {
      setErrorMsg("Amount must be at least ₹1.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        gateway,
        amount_inr: amt,
        description: description.trim() || undefined,
        link_type: linkType,
      };

      if (isCustomCandidate) {
        payload.customer_name = customName.trim();
        payload.customer_phone = customPhone.trim();
        payload.customer_email = customEmail.trim() || undefined;
      } else {
        payload.enrollment_id =
          selectedCandidate.enrollment_id || selectedCandidate.value;
      }

      const res = await paymentsAdminApi.createPaymentLink(payload);

      if (res.data?.success && res.data?.short_url) {
        setGeneratedLink(res.data.short_url);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Generate payment link failed:", err);
      setErrorMsg(
        err.response?.data?.msg ||
          err.message ||
          "Failed to generate payment link.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 animate-fade">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Generate Payment Link
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create a secure checkout link for candidate payments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ open: false })}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Form or Success Body */}
        {!generatedLink ? (
          <form
            onSubmit={handleGenerateLink}
            className="p-5 space-y-4 overflow-y-auto flex-1"
          >
            <div className="space-y-3">
              {/* Option to create link for custom candidate */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 mb-2">
                <input
                  type="checkbox"
                  id="custom-candidate-checkbox"
                  checked={isCustomCandidate}
                  onChange={(e) => {
                    setIsCustomCandidate(e.target.checked);
                    setErrorMsg("");
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
                <label
                  htmlFor="custom-candidate-checkbox"
                  className="text-xs font-bold text-slate-600 select-none cursor-pointer"
                >
                  Generate without selecting candidate
                </label>
              </div>

              {!isCustomCandidate ? (
                /* Autocomplete Candidate search wrapper */
                <div
                  ref={wrapperRef}
                  className="relative flex flex-col gap-1 animate-fade"
                >
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Select Candidate *
                  </label>
                  <ControlInput
                    value={phoneSearch}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onFocus={handleInputFocus}
                    placeholder="Type name or phone to search..."
                    leftIcon={<Phone size={14} />}
                    disabled={submitting}
                    className="w-full font-medium"
                  />

                  {/* Dropdown Suggestions */}
                  {showDropdown &&
                    (phoneSearch.trim() || filteredCandidates.length > 0) && (
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
                                {c.student_phone || c.phone || "No Phone"}{" "}
                                {c.batch_name ? `• ${c.batch_name}` : ""}
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
              ) : (
                /* Custom candidate manual inputs */
                <div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-3 bg-slate-50/20 animate-fade">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Full Name *
                    </label>
                    <ControlInput
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. John Doe"
                      leftIcon={<User size={14} />}
                      disabled={submitting}
                      className="w-full font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Phone Number *
                    </label>
                    <ControlInput
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      placeholder="e.g. +91 9999999999"
                      leftIcon={<Phone size={14} />}
                      disabled={submitting}
                      className="w-full font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Email Address
                    </label>
                    <ControlInput
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      leftIcon={<Mail size={14} />}
                      disabled={submitting}
                      className="w-full font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Gateway Selection */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Select Payment Gateway *
                </label>
                <select
                  value={gateway}
                  onChange={(e) => setGateway(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="zoho">Zoho Pay</option>
                </select>
              </div>

              {/* Amount Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Billing Amount (INR) *
                </label>
                <ControlInput
                  type="text"
                  inputMode="decimal"
                  value={amountInr}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    if (/^\d*(?:\.\d{0,2})?$/.test(nextValue)) {
                      setAmountInr(nextValue);
                    }
                  }}
                  placeholder="0.00"
                  leftIcon={<IndianRupee size={14} />}
                  disabled={submitting}
                  className="w-full font-bold text-slate-800"
                />
              </div>

              {/* Description Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Description / Purpose
                </label>
                <ControlInput
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Admission Booking Fee"
                  leftIcon={<Link size={14} />}
                  disabled={submitting}
                  className="w-full"
                />
              </div>

              {/* Link Type Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Payment Method
                </label>
                <div className="flex gap-3">
                  <label
                    htmlFor="link-type-standard"
                    className={`flex-1 flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                      linkType === "standard"
                        ? "border-slate-800 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50/60"
                    }`}
                  >
                    <input
                      type="radio"
                      id="link-type-standard"
                      name="link_type"
                      value="standard"
                      checked={linkType === "standard"}
                      onChange={() => setLinkType("standard")}
                      disabled={submitting}
                      className="h-3.5 w-3.5 accent-slate-800"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Standard</div>
                      <div className="text-xs text-slate-400">All methods</div>
                    </div>
                  </label>

                  <label
                    htmlFor="link-type-upi"
                    className={`flex-1 flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                      linkType === "upi"
                        ? "border-slate-800 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50/60"
                    }`}
                  >
                    <input
                      type="radio"
                      id="link-type-upi"
                      name="link_type"
                      value="upi"
                      checked={linkType === "upi"}
                      onChange={() => setLinkType("upi")}
                      disabled={submitting}
                      className="h-3.5 w-3.5 accent-slate-800"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">UPI Only</div>
                      <div className="text-xs text-slate-400">UPI payments</div>
                    </div>
                  </label>
                </div>
                {gateway === "zoho" && linkType === "standard" ? (
                  <p className="text-xs text-slate-500 font-medium">
                    Zoho Pay Standard uses all payment methods enabled on the account.
                  </p>
                ) : null}
                {gateway === "zoho" && linkType === "upi" ? (
                  <p className="text-xs text-slate-500 font-medium">
                    Zoho Pay UPI Only restricts checkout to UPI payments.
                  </p>
                ) : null}
                {gateway === "razorpay" && linkType === "upi" && (
                  <p className="text-xs text-amber-600 font-medium">
                    UPI-only links open in UPI apps (GPay, PhonePe), require live Razorpay keys, and cannot be paid from desktop.
                  </p>
                )}
              </div>

              {/* Confirmation section to prevent wrong amounts */}
              {((!isCustomCandidate && selectedCandidate) ||
                (isCustomCandidate && customName && customPhone)) &&
                amountInr &&
                Number(amountInr) > 0 && (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-600 space-y-1 animate-fade">
                    <p>
                      Candidate:{" "}
                      <strong className="text-slate-800">
                        {isCustomCandidate
                          ? customName
                          : selectedCandidate.student_name ||
                            selectedCandidate.label}
                      </strong>
                    </p>
                    {isCustomCandidate && (
                      <p>
                        Phone:{" "}
                        <strong className="text-slate-800">
                          {customPhone}
                        </strong>
                      </p>
                    )}
                    <p>
                      Amount to request:{" "}
                      <strong className="text-slate-900 text-sm">
                        ₹
                        {Number(amountInr).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </p>
                  </div>
                )}
            </div>

            {/* Submit buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => setModal({ open: false })}
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <ControlButton
                type="submit"
                disabled={
                  submitting ||
                  (!isCustomCandidate && !selectedCandidate) ||
                  (isCustomCandidate && (!customName || !customPhone)) ||
                  !amountInr ||
                  !gateway
                }
              >
                {submitting
                  ? "Generating..."
                  : gateway
                    ? `Generate ${gateway === "zoho" ? "Zoho" : "Razorpay"} Link`
                    : "Generate Link"}
              </ControlButton>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-5 flex-1">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center space-y-1 text-emerald-800 animate-fade">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check size={20} />
              </div>
              <h4 className="font-bold text-sm">
                Link Generated Successfully!
              </h4>
              <p className="text-xs text-emerald-700">
                Payment link for ₹
                {Number(amountInr).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}{" "}
                is ready.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Copy Link Url
              </label>
              <div className="flex gap-2 items-center">
                <ControlInput
                  value={generatedLink}
                  readOnly
                  className="flex-1 bg-slate-50 select-all font-mono text-xs font-semibold text-indigo-600 cursor-text"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className={`flex h-10 px-3 items-center justify-center rounded-xl border font-semibold text-xs transition duration-200 ${
                    copied
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {copied ? (
                    <Check size={14} className="mr-1" />
                  ) : (
                    <Copy size={14} className="mr-1" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 mt-2">
              <ControlButton
                type="button"
                onClick={() => setModal({ open: false })}
              >
                Close
              </ControlButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
