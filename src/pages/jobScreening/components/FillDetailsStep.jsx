import React, { useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { submitCandidateDetails } from "../../../api/jobScreeningApi";

const FillDetailsStep = ({ progress, onComplete, onBack }) => {
  const [fullname, setFullname] = useState(progress?.candidate_name || "");
  const [email, setEmail] = useState(progress?.candidate_email || "");
  const phone = progress?.candidate_phone || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!fullname.trim()) {
      setError("Full name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email address is required");
      return;
    }
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const { data } = await submitCandidateDetails({
        fullname: fullname.trim(),
        email: email.trim(),
      });
      if (data?.success) {
        onComplete(data.data);
      } else {
        setError("Failed to save details");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to submit details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white text-slate-900 flex flex-col justify-start items-start font-sans">
      {/* Header Navigation */}
      <div className="w-full flex flex-col justify-start items-start gap-2.5">
        <div className="self-stretch inline-flex justify-between items-center">
          <button
            onClick={onBack}
            className="px-0.5 flex justify-center items-center gap-2 text-slate-800 hover:text-black font-semibold text-sm cursor-pointer bg-transparent border-none p-0 outline-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="text-center justify-start text-neutral-500 text-sm font-semibold leading-6">
            Job Progress
          </div>
        </div>
      </div>

      {/* Title block */}
      <div className="self-stretch pt-6 pb-8 flex flex-col justify-start items-start gap-2.5 text-left">
        <h2 className="self-stretch justify-start text-[#002856] text-2xl font-bold tracking-tight">
          Welcome to Skillcase Interviews
        </h2>
        <p className="self-stretch justify-start text-[#002856]/70 text-sm font-medium leading-relaxed">
          Please review your details and confirm your contact information to
          continue.
        </p>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
        <div className="w-full px-4 py-5 bg-white rounded-xl border border-zinc-200 flex flex-col justify-start items-stretch gap-6 overflow-hidden shadow-sm">
          {/* Full Name Input */}
          <div className="flex flex-col justify-start items-stretch gap-1.5 text-left">
            <label className="inline-flex justify-start items-center gap-0.5">
              <span className="text-slate-700 text-sm font-semibold">
                Full name
              </span>
              <span className="text-red-500 text-sm font-semibold">*</span>
            </label>
            <input
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3.5 py-2.5 bg-white rounded-lg border border-slate-300 shadow-sm focus:outline-none focus:border-[#002856] text-slate-800 text-base font-normal transition-all"
              required
            />
          </div>

          {/* Phone Number (Locked) */}
          <div className="flex flex-col justify-start items-stretch gap-1.5 text-left">
            <label className="inline-flex justify-start items-center gap-0.5">
              <span className="text-slate-700 text-sm font-semibold">
                Phone Number
              </span>
              <span className="text-red-500 text-sm font-semibold">*</span>
            </label>
            <div className="flex w-full bg-slate-50 border border-slate-200 rounded-lg shadow-sm cursor-not-allowed select-none">
              <div className="px-3.5 py-2.5 border-r border-slate-200 text-slate-400 text-base font-normal flex items-center gap-1 select-none">
                <span>IN</span>
                <span className="text-[10px] text-slate-400">▼</span>
              </div>
              <input
                type="text"
                value={phone}
                disabled
                className="flex-1 px-3.5 py-2.5 bg-transparent border-none outline-none text-slate-400 text-base font-normal cursor-not-allowed"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 font-medium leading-normal">
              Phone number is verified during sign-in and cannot be changed.
            </span>
          </div>

          {/* Email Input */}
          <div className="flex flex-col justify-start items-stretch gap-1.5 text-left">
            <label className="inline-flex justify-start items-center gap-0.5">
              <span className="text-slate-700 text-sm font-semibold">
                Email
              </span>
              <span className="text-red-500 text-sm font-semibold">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-3.5 py-2.5 bg-white rounded-lg border border-slate-300 shadow-sm focus:outline-none focus:border-[#002856] text-slate-800 text-base font-normal transition-all"
              required
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-500 text-xs font-semibold text-left">
            {error}
          </p>
        )}

        {/* Submit Action */}
        <div className="w-full pt-4 flex flex-col justify-start items-stretch gap-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#002856] hover:bg-[#001e40] text-white rounded-lg shadow-sm font-semibold text-base transition-all active:scale-[0.99] flex justify-center items-center gap-2 cursor-pointer border-none"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin w-4 h-4 text-white" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FillDetailsStep;
