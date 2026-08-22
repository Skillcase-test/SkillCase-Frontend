import { useEffect, useState, useRef } from "react";
import {
  CheckCircle2,
  Loader2,
  User,
  Building2,
  Phone,
  Mail,
  GraduationCap,
  Megaphone,
  ChevronDown,
  Info,
  UserPlus,
} from "lucide-react";

const inputClass =
  "w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#002856]/5 focus:border-[#002856] transition-all";
const labelClass =
  "block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider";
const iconClass = "absolute left-3.5 top-2.5 w-4 h-4 text-slate-400";

const LANGUAGE_LEVEL_OPTIONS = [
  { value: "", label: "-- Select Level --" },
  { value: "Yet to start", label: "Yet to start" },
  { value: "A1", label: "A1" },
  { value: "A2", label: "A2" },
  { value: "B1", label: "B1" },
  { value: "B2", label: "B2" },
];

const AD_SET_OPTIONS = [
  { value: "", label: "-- Select Ad Set --" },
  { value: "Inbound", label: "Inbound" },
  { value: "Influencer", label: "Influencer" },
  { value: "Referral", label: "Referral" },
  { value: "App Install", label: "App Install" },
];

const COMPANY_OPTIONS = [
  { value: "", label: "-- Select Profession / Company --" },
  { value: "Nurse", label: "Nurse" },
  { value: "Physiotherapist", label: "Physiotherapist" },
];

// Custom dropdown (button + chevron + option list) — same pattern used across
// the app (e.g. the language selector on the video player). The selected value
// is synced to a hidden form input so the submission payload stays identical
// to a native <select>.
function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
  icon,
  invalid,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const Icon = icon;

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, {
      passive: true,
    });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // The empty-value placeholder option must not count as a "selection", so
  // the trigger shows the gray placeholder text until a real value is picked.
  const selected = options.find(
    (opt) => opt.value === value && opt.value !== "",
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs text-left flex items-center justify-between gap-2 cursor-pointer transition-all ${
          isOpen
            ? "bg-white border-[#002856] ring-4 ring-[#002856]/5"
            : invalid
              ? "bg-white border-rose-400 ring-4 ring-rose-500/10"
              : "border-slate-200/60 hover:border-slate-300"
        }`}
      >
        <Icon className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <span
          className={`truncate ${
            selected ? "text-slate-700" : "text-slate-400"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white border border-zinc-200 shadow-xl overflow-hidden py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                opt.value === value
                  ? "bg-[#edfaff] text-[#002856]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InternalLeadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [languageLevel, setLanguageLevel] = useState("");
  const [adSet, setAdSet] = useState("");
  const [formErrors, setFormErrors] = useState({
    companyName: false,
    languageLevel: false,
    adSet: false,
  });

  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Custom dropdowns have no native <select> to enforce `required`, so
    // mirror the original validation here — an empty selection blocks submit.
    const nextErrors = {
      companyName: !companyName,
      languageLevel: !languageLevel,
      adSet: !adSet,
    };
    if (nextErrors.companyName || nextErrors.languageLevel || nextErrors.adSet) {
      setFormErrors(nextErrors);
      return;
    }
    setFormErrors({ companyName: false, languageLevel: false, adSet: false });
    setIsSubmitting(true);

    try {
      // Get form data (hidden inputs carry the custom dropdown values)
      const formData = new FormData(formRef.current);

      // Submit to Pabbly (triggers WhatsApp drip campaign)
      await fetch(
        "https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjcwNTZjMDYzMTA0MzU1MjZlNTUzMzUxMzUi_pc",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.get("Last Name"),
            phone: formData.get("Mobile"),
            company: formData.get("Accounts.Account Name"),
            email: formData.get("Email"),
            languageLevel: formData.get("CONTACTCF4"),
            adSet: formData.get("CONTACTCF8"),
            source: "Internal",
          }),
        },
      );
    } catch (error) {
      console.error("Pabbly webhook error:", error);
      // Continue even if Pabbly fails
    }

    // Submit to Bigin
    formRef.current.submit();
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 2000);
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">Internal Lead Form</h1>
          <p className="text-xs text-slate-400">
            Create a lead that syncs to Bigin and triggers the WhatsApp drip campaign
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start md:self-auto px-3 py-1.5 rounded-full bg-[#eef2f6] border border-[#ccd9e8] text-[#002856] text-[10px] font-bold">
          <UserPlus className="w-3.5 h-3.5" />
          Source: Internal
        </div>
      </div>

      {submitSuccess ? (
        /* Success state */
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-[#eaf7f0] border border-[#c3ebc6] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-[#1e7e34]" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1.5">Lead Created!</h3>
          <p className="text-xs text-slate-400 mb-6 max-w-xs mx-auto">
            The lead has been saved to Bigin and the WhatsApp drip campaign has been
            triggered.
          </p>
          <button
            onClick={() => {
              formRef.current?.reset();
              setCompanyName("");
              setLanguageLevel("");
              setAdSet("");
              setFormErrors({ companyName: false, languageLevel: false, adSet: false });
              setSubmitSuccess(false);
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#002856] text-white font-bold text-xs rounded-xl hover:bg-[#001e40] transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Create Another Lead
          </button>
        </div>
      ) : (
        <>
          <form
            ref={formRef}
            action="https://bigin.zoho.in/crm/WebForm"
            method="POST"
            target="bigin_hidden_iframe"
            onSubmit={handleSubmit}
            className="space-y-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
          >
            {/* Hidden Bigin Fields */}
            <input
              type="hidden"
              name="xnQsjsdp"
              value="c3a87a6d8f0d62a55d610ead5258ee12a45be82fd471b94004baf965ad30784c"
            />
            <input type="hidden" name="zc_gad" value="" />
            <input
              type="hidden"
              name="xmIwtLD"
              value="e81c7e5d60860a251e375719ab25cfb954c6b2bde9d03f735ea48bb4284bf4a295d70b28e788d2b19a6de6dc4da33f43"
            />
            <input type="hidden" name="actionType" value="Q29udGFjdHM=" />
            <input type="hidden" name="returnURL" value="null" />
            <input type="hidden" name="CONTACTCF1" value="Candidate" />

            {/* Hidden inputs carry the custom dropdown values for Bigin + Pabbly */}
            <input
              type="hidden"
              name="Accounts.Account Name"
              value={companyName}
            />
            <input type="hidden" name="CONTACTCF4" value={languageLevel} />
            <input type="hidden" name="CONTACTCF8" value={adSet} />

            {/* Last Name */}
            <div>
              <label className={labelClass}>
                Last Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className={iconClass} />
                <input
                  type="text"
                  name="Last Name"
                  required
                  maxLength="80"
                  className={inputClass}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className={labelClass}>
                Company Name <span className="text-rose-500">*</span>
              </label>
              <CustomDropdown
                options={COMPANY_OPTIONS}
                value={companyName}
                onChange={(val) => {
                  setCompanyName(val);
                  if (val) {
                    setFormErrors((prev) => ({ ...prev, companyName: false }));
                  }
                }}
                placeholder="-- Select Profession / Company --"
                icon={Building2}
                invalid={formErrors.companyName}
              />
              {formErrors.companyName && (
                <p className="mt-1.5 text-[10px] font-semibold text-rose-500">
                  Please select a company/profession
                </p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className={labelClass}>
                Mobile <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className={iconClass} />
                <input
                  type="text"
                  name="Mobile"
                  required
                  maxLength="30"
                  className={inputClass}
                  placeholder="Enter mobile number"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email</label>
              <div className="relative">
                <Mail className={iconClass} />
                <input
                  type="email"
                  name="Email"
                  maxLength="100"
                  className={inputClass}
                  placeholder="Enter email (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Language Level - NEW */}
              <div>
                <label className={labelClass}>
                  Language Level <span className="text-rose-500">*</span>
                </label>
                <CustomDropdown
                  options={LANGUAGE_LEVEL_OPTIONS}
                  value={languageLevel}
                  onChange={(val) => {
                    setLanguageLevel(val);
                    if (val) {
                      setFormErrors((prev) => ({ ...prev, languageLevel: false }));
                    }
                  }}
                  placeholder="-- Select Level --"
                  icon={GraduationCap}
                  invalid={formErrors.languageLevel}
                />
                {formErrors.languageLevel && (
                  <p className="mt-1.5 text-[10px] font-semibold text-rose-500">
                    Please select a language level
                  </p>
                )}
              </div>

              {/* Ad Set */}
              <div>
                <label className={labelClass}>
                  Ad Set <span className="text-rose-500">*</span>
                </label>
                <CustomDropdown
                  options={AD_SET_OPTIONS}
                  value={adSet}
                  onChange={(val) => {
                    setAdSet(val);
                    if (val) {
                      setFormErrors((prev) => ({ ...prev, adSet: false }));
                    }
                  }}
                  placeholder="-- Select Ad Set --"
                  icon={Megaphone}
                  invalid={formErrors.adSet}
                />
                {formErrors.adSet && (
                  <p className="mt-1.5 text-[10px] font-semibold text-rose-500">
                    Please select an ad set
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[#002856] text-white font-bold text-sm rounded-xl hover:bg-[#001e40] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Submit Lead
                </>
              )}
            </button>

            {/* Info strip */}
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#eef2f6] border border-[#ccd9e8] rounded-xl">
              <Info className="w-4 h-4 text-[#002856] shrink-0 mt-px" />
              <p className="text-[10px] font-semibold text-[#002856] leading-relaxed">
                This form creates a lead in Bigin as <span className="font-bold">Candidate</span> and
                triggers the WhatsApp drip campaign automatically.
              </p>
            </div>
          </form>
          <iframe
            name="bigin_hidden_iframe"
            style={{ display: "none" }}
            title="Hidden Form Target"
          />
        </>
      )}
    </div>
  );
}
