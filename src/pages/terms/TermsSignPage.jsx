import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { termsApi } from "../../api/termsApi";
import { checkAgreement } from "../../api/jobScreeningApi";
import "./TermsSignPage.css";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function useWindowWidth() {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1200 : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}

function hashString(input) {
  const value = String(input || "");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createTypedSignatureImageDataUrl(signatureText, fontFamily) {
  const text = String(signatureText || "").trim();
  if (!text) return "";
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#101828";
  let fontSize = 150;
  const maxTextWidth = canvas.width - 120;

  while (fontSize > 48) {
    ctx.font = `${fontSize}px ${fontFamily}`;
    const measured = ctx.measureText(text).width;
    if (measured <= maxTextWidth) break;
    fontSize -= 6;
  }

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 60, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

function getFieldBoxStyle(field, isMobile) {
  const minWidth = isMobile ? 0.02 : 0.01;
  const minHeight = isMobile ? 0.015 : 0.01;
  return {
    left: `${clamp(Number(field.x || 0), 0, 1) * 100}%`,
    top: `${clamp(Number(field.y || 0), 0, 1) * 100}%`,
    width: `${clamp(Number(field.width || 0.2), minWidth, 1) * 100}%`,
    height: `${clamp(Number(field.height || 0.04), minHeight, 1) * 100}%`,
  };
}

function getPrefilledValue(field) {
  const config = field?.config_json || {};
  if (!Object.prototype.hasOwnProperty.call(config, "default_value")) {
    return field?.field_type === "checkbox" ? false : "";
  }
  if (field?.field_type === "checkbox") {
    return Boolean(config.default_value);
  }
  return String(config.default_value || "");
}

function isFieldLocked(field) {
  return Boolean(field?.config_json?.locked);
}

function isFieldVisibleToCandidate(field) {
  if (!field || field.field_type === "signature") return false;
  if (isFieldLocked(field)) return false;
  return true;
}

function getFieldPlaceholder(field) {
  const explicit = String(field?.placeholder || "").trim();
  if (explicit) return explicit;
  const label = String(field?.label || "").trim();
  if (label) return label;
  return String(field?.field_key || "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function getDisplayValue(field, fieldValues) {
  const key = String(field?.field_key || "");
  const inputValue = key ? fieldValues[key] : "";
  if (field?.field_type === "checkbox") {
    if (typeof inputValue === "boolean") return inputValue;
    return Boolean(getPrefilledValue(field));
  }
  const normalized = String(inputValue || "").trim();
  if (normalized) return normalized;
  return String(getPrefilledValue(field) || "");
}

function isSignatureField(field) {
  return field?.field_type === "signature";
}

function isUserRequiredSignatureField(field) {
  if (!isSignatureField(field) || !field?.required) return false;
  const config = field?.config_json || {};
  const locked = Boolean(config.locked);
  const defaultText = String(config.default_value || "").trim();
  const defaultImage = String(
    config.default_signature_image_data_url || "",
  ).trim();
  return !(locked && (defaultText || defaultImage));
}

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  function toLocalPoint(event) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = toLocalPoint(event);
    drawingRef.current = true;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    event.preventDefault();
  }

  function move(event) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = toLocalPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    onChange(canvas.toDataURL("image/png"));
    event.preventDefault();
  }

  function end(event) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
    event.preventDefault();
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={900}
        height={200}
        className="h-40 w-full rounded-md border border-slate-300 bg-white"
        style={{ touchAction: "none" }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <button
        type="button"
        onClick={clear}
        className="mt-2 rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
      >
        Clear Signature
      </button>
    </div>
  );
}

function SignatureModal({
  isOpen,
  onClose,
  onSubmit,
  signatureMode,
  setSignatureMode,
  typedSignature,
  setTypedSignature,
  signatureImage,
  setSignatureImage,
  typedFont,
  handleUploadSignature,
  submitting,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && signatureMode === "typed" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, signatureMode]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/50 p-4"
      onWheel={(event) => event.preventDefault()}
      onTouchMove={(event) => event.preventDefault()}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6"
        onWheel={(event) => event.preventDefault()}
        onTouchMove={(event) => event.preventDefault()}
      >
        <h2 className="mb-6 text-xl font-bold text-slate-900">Sign Document</h2>

        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            {["typed", "drawn", "uploaded"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSignatureMode(mode)}
                className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                  signatureMode === mode
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {mode === "typed"
                  ? "Type"
                  : mode === "drawn"
                    ? "Draw"
                    : "Upload"}
              </button>
            ))}
          </div>

          {signatureMode === "typed" ? (
            <div className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                placeholder="Type your full name"
              />
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Signature Preview
                </p>
                <div
                  className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-3xl text-slate-900 min-h-[80px]"
                  style={{ fontFamily: typedFont }}
                >
                  {typedSignature || ""}
                </div>
              </div>
            </div>
          ) : null}

          {signatureMode === "drawn" ? (
            <SignaturePad onChange={setSignatureImage} />
          ) : null}

          {signatureMode === "uploaded" ? (
            <div className="space-y-3">
              <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleUploadSignature}
                  className="hidden"
                />
                <p className="text-sm text-slate-600">
                  Click to upload signature image
                </p>
              </label>
              {signatureImage ? (
                <img
                  src={signatureImage}
                  alt="Signature"
                  className="h-24 w-full rounded-md border border-slate-200 object-contain"
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="flex-1 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2 rounded-full"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Submitting...
              </>
            ) : "Sign & Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TermsSignPage() {
  const { token } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isJobScreeningFlow = query.get("source") === "job_screening";

  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const [invite, setInvite] = useState(null);
  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [docPages, setDocPages] = useState(0);

  const [signatureMode, setSignatureMode] = useState("typed");
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureImage, setSignatureImage] = useState("");
  const [mobileStep, setMobileStep] = useState("document");
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const [enrollmentDetails, setEnrollmentDetails] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const activeStreamRef = useRef(null);

  useEffect(() => {
    if (wizardStep > 0 && wizardStep < 6) {
      window.scrollTo(0, 0);
    }
  }, [wizardStep]);

  const [wizardData, setWizardData] = useState({
    student_name: "",
    student_phone: "",
    student_email: "",
    alternate_number: "",
    dob: "",
    gender: "",
    nationality: "",
    current_location_city: "",
    state: "",
    educational_qualification: "",
    year_of_passing: "",
    shift_pattern: "Daily Shift Pattern",
    first_shift_timing: "",
    second_shift_timing: "",
    third_shift_timing: "",
    daily_shift_timing: "",
    passport_gdrive_link: "",
    degree_certificate_gdrive_link: "",
    updated_resume_gdrive_link: "",
    selfie_key: "",
  });
  const [uploadingFiles, setUploadingFiles] = useState({
    passport: false,
    degree: false,
    resume: false,
    selfie: false,
  });
  const [uploadError, setUploadError] = useState("");
  const [selfieLocalUrl, setSelfieLocalUrl] = useState("");

  const viewerRef = useRef(null);
  const inputRefMap = useRef(new Map());
  const hasAutoFocusedRef = useRef(false);
  const signaturePanelRef = useRef(null);
  const signatureSubmitButtonRef = useRef(null);
  const desktopSignatureInputRef = useRef(null);
  const [viewerWidth, setViewerWidth] = useState(900);

  const renderWidth = useMemo(
    () =>
      isMobile
        ? clamp(
            Math.floor(Math.min(viewerWidth - 20, windowWidth - 28)),
            180,
            390,
          )
        : clamp(Math.floor(viewerWidth - 24), 420, 1120),
    [isMobile, viewerWidth, windowWidth],
  );

  const groupedFields = useMemo(() => {
    const map = new Map();
    fields.forEach((field) => {
      const page = Number(field.page_number || 1);
      if (!map.has(page)) map.set(page, []);
      map.get(page).push(field);
    });
    return map;
  }, [fields]);

  const fillableRequiredFields = useMemo(
    () =>
      fields
        .filter(
          (field) =>
            isFieldVisibleToCandidate(field) &&
            field.required &&
            field.field_type !== "label",
        )
        .sort((a, b) => {
          const pageDiff =
            Number(a.page_number || 1) - Number(b.page_number || 1);
          if (pageDiff !== 0) return pageDiff;
          return Number(a.field_order || 0) - Number(b.field_order || 0);
        }),
    [fields],
  );

  const firstFillableFieldId = useMemo(() => {
    const firstField = fields
      .filter(
        (field) =>
          isFieldVisibleToCandidate(field) &&
          field.field_type !== "label" &&
          field.field_type !== "signature",
      )
      .sort((a, b) => {
        const pageDiff =
          Number(a.page_number || 1) - Number(b.page_number || 1);
        if (pageDiff !== 0) return pageDiff;
        return Number(a.field_order || 0) - Number(b.field_order || 0);
      })[0];

    return String(firstField?.field_id || "");
  }, [fields]);

  const fillableFields = useMemo(
    () =>
      fields
        .filter(
          (field) =>
            isFieldVisibleToCandidate(field) &&
            field.field_type !== "label",
        )
        .sort((a, b) => {
          const pageDiff =
            Number(a.page_number || 1) - Number(b.page_number || 1);
          if (pageDiff !== 0) return pageDiff;
          return Number(a.field_order || 0) - Number(b.field_order || 0);
        }),
    [fields],
  );

  const requiresCandidateSignature = useMemo(
    () =>
      fields.some((field) => {
        if (field.field_type !== "signature" || !field.required) return false;
        const locked = Boolean(field?.config_json?.locked);
        const defaultText = String(
          field?.config_json?.default_value || "",
        ).trim();
        const defaultImage = String(
          field?.config_json?.default_signature_image_data_url || "",
        ).trim();
        return !(locked && (defaultText || defaultImage));
      }),
    [fields],
  );

  const candidateSignatureFieldKeys = useMemo(
    () =>
      fields
        .filter((field) => isUserRequiredSignatureField(field))
        .map((field) => String(field.field_key || "").trim())
        .filter(Boolean),
    [fields],
  );

  const typedFont = useMemo(() => {
    const variants = [
      '"Brush Script MT", "Segoe Script", cursive',
      '"Lucida Handwriting", "Segoe Script", cursive',
      '"Palatino Linotype", "Times New Roman", serif',
    ];
    const nameSeed =
      typedSignature ||
      invite?.recipient_name ||
      fieldValues.full_name ||
      fieldValues.name ||
      "";
    return variants[hashString(nameSeed) % variants.length];
  }, [
    typedSignature,
    invite?.recipient_name,
    fieldValues.full_name,
    fieldValues.name,
  ]);

  const handleSignatureModeChange = (nextMode) => {
    setSignatureMode(nextMode);
    if (nextMode === "typed") {
      setSignatureImage("");
    }
  };

  const showToast = (message) => {
    setToastMessage(String(message || ""));
  };

  useEffect(() => {
    const node = viewerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(() => {
      setViewerWidth(node.clientWidth || 900);
    });
    observer.observe(node);
    setViewerWidth(node.clientWidth || 900);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!alreadySigned) return undefined;
    if (isJobScreeningFlow) return undefined;
    const timer = window.setTimeout(() => {
      window.location.href = "https://skillcase.in";
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [alreadySigned, isJobScreeningFlow]);

  useEffect(() => {
    if (!showSignatureModal) return undefined;
    if (typeof document === "undefined") return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousHtmlTouchAction = document.documentElement.style.touchAction;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.touchAction = previousHtmlTouchAction;
    };
  }, [showSignatureModal]);

  useEffect(() => {
    if (!isMobile) {
      setKeyboardOffset(0);
      return undefined;
    }
    if (typeof window === "undefined") return undefined;

    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const updateKeyboardOffset = () => {
      const occluded = Math.max(
        0,
        Math.round(window.innerHeight - (viewport.height + viewport.offsetTop)),
      );
      // Ignore tiny viewport changes (browser UI bars), react only to keyboard-size shifts.
      setKeyboardOffset(occluded > 80 ? occluded : 0);
    };

    updateKeyboardOffset();
    viewport.addEventListener("resize", updateKeyboardOffset);
    viewport.addEventListener("scroll", updateKeyboardOffset);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardOffset);
      viewport.removeEventListener("scroll", updateKeyboardOffset);
      setKeyboardOffset(0);
    };
  }, [isMobile]);

  const nextButtonStyle = isMobile
    ? { "--terms-kb-offset": `${keyboardOffset}px` }
    : undefined;

  useEffect(() => {
    if (!token) return;
    hasAutoFocusedRef.current = false;
    let mounted = true;

    async function fetchInvite() {
      setLoading(true);
      setError("");
      try {
        const response = await termsApi.resolveInvite(token);
        if (!mounted) return;
        const envelope = response.data?.envelope || null;
        const templateData = response.data?.template || null;
        const mappedFields = response.data?.fields || [];

        setJustSubmitted(false);
        setInvite(envelope);
        setTemplate(templateData);
        setFields(mappedFields);
        setDocPages(Number(templateData?.page_count || 0));

        const isSigned = envelope?.status === "signed";

        if (isSigned) {
          try {
            const detailsRes = await termsApi.getCandidateDetails(token);
            const candidateDetails = detailsRes.data?.details || {};
            const detailsFilled = candidateDetails?.candidate_details_filled === "yes";
            if (!detailsFilled) {
              if (candidateDetails.selfie_url) {
                setSelfieLocalUrl(candidateDetails.selfie_url);
              }
              setWizardData((prev) => {
                const next = { ...prev };
                next.student_name = detailsRes.data?.student_name || candidateDetails.student_name || "";
                next.student_phone = detailsRes.data?.student_phone || candidateDetails.student_phone || "";
                next.student_email = detailsRes.data?.student_email || candidateDetails.student_email || "";
                for (const key of Object.keys(next)) {
                  if (key === "student_name" || key === "student_phone" || key === "student_email") continue;
                  const val = candidateDetails[key];
                  if (val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "-") {
                    next[key] = String(val).trim();
                  }
                }
                return next;
              });
              setWizardStep(1);
            } else {
              setAlreadySigned(true);
            }
          } catch {
            // Not linked to any enrollment — treat as already signed
            setAlreadySigned(true);
          }
        } else {
          setAlreadySigned(false);
        }

        const defaults = {};
        mappedFields.forEach((field) => {
          if (field.field_type === "date" && field.config_json?.use_today) {
            defaults[field.field_key] = new Date().toISOString().split("T")[0];
          } else {
            defaults[field.field_key] = getPrefilledValue(field);
          }
        });
        setFieldValues(defaults);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.msg || "Failed to load signing link.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchInvite();
    return () => {
      mounted = false;
    };
  }, [token]);

  // Auto-focus has been intentionally removed so that the user can review the document first.
  // They must explicitly click 'Start Document' in the bottom nav to focus the first field.

  // Write to fieldValues by field_key. Because duplicate-key fields share the
  // same entry in fieldValues, every field rendered with that key will
  // automatically display the updated value — this is the auto-fill mechanism.
  function setValue(fieldKey, nextValue) {
    setFieldValues((prev) => ({ ...prev, [fieldKey]: nextValue }));
  }

  function handleUploadSignature(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setSignatureImage(result);
    };
    reader.readAsDataURL(file);
  }

  function getMissingRequiredFieldIds() {
    return fillableRequiredFields
      .map((field) => {
        const key = String(field.field_key || "");
        const value = fieldValues[key];
        if (field.field_type === "checkbox") {
          return value === true ? null : String(field.field_id);
        }
        return String(value || "").trim() ? null : String(field.field_id);
      })
      .filter(Boolean);
  }

  function focusFieldById(fieldId) {
    const target = inputRefMap.current.get(String(fieldId || ""));
    if (!target || typeof target.focus !== "function") return false;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus({ preventScroll: true });
    if (
      target.tagName === "INPUT" &&
      String(target.type || "").toLowerCase() === "date"
    ) {
      if (typeof target.showPicker === "function") {
        try {
          target.showPicker();
        } catch {
          target.click();
        }
      } else {
        target.click();
      }
    }
    setActiveFieldId(String(fieldId));
    return true;
  }

  function focusFieldByIdWithRetry(fieldId, maxAttempts = 8) {
    const id = String(fieldId || "");
    if (!id) return false;
    let attemptsLeft = Math.max(1, Number(maxAttempts || 1));

    const attempt = () => {
      const focused = focusFieldById(id);
      if (focused) {
        hasAutoFocusedRef.current = true;
        return;
      }
      attemptsLeft -= 1;
      if (attemptsLeft <= 0) return;
      window.setTimeout(attempt, 140);
    };

    attempt();
    return true;
  }

  function goToFirstMissingRequiredField() {
    const missing = getMissingRequiredFieldIds();
    if (!missing.length) return false;
    return focusFieldById(missing[0]);
  }

  function jumpToFirstMissingRequiredField() {
    const missing = getMissingRequiredFieldIds();
    if (!missing.length) return true;
    const targetId = missing[0];
    const focusedNow = focusFieldById(targetId);
    if (!focusedNow) {
      focusFieldByIdWithRetry(targetId, 8);
    }
    return focusedNow;
  }

  function goToNextMissingRequiredField() {
    const missing = getMissingRequiredFieldIds();
    if (!missing.length) {
      if (isMobile) {
        setShowSignatureModal(true);
      } else {
        signaturePanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setTimeout(() => {
          desktopSignatureInputRef.current?.focus();
        }, 500);
      }
      return;
    }
    const currentIndex = missing.findIndex((id) => id === activeFieldId);
    const nextId =
      currentIndex >= 0 ? missing[currentIndex + 1] || missing[0] : missing[0];
    const focusedNow = focusFieldById(nextId);
    if (!focusedNow) {
      focusFieldByIdWithRetry(nextId, 8);
    }
  }

  function handleBottomNavNextOrSign() {
    if (getMissingRequiredFieldIds().length === 0) {
      if (isMobile) {
        setShowSignatureModal(true);
      } else {
        signaturePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          desktopSignatureInputRef.current?.focus();
        }, 500);
      }
    } else {
      goToNextField();
    }
  }

  function goToNextField() {
    if (!fillableFields.length) return;
    const currentIndex = fillableFields.findIndex((f) => String(f.field_id) === activeFieldId);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= fillableFields.length) {
      const missing = getMissingRequiredFieldIds();
      if (missing.length > 0) {
        showToast("Please fill all required fields before signing.");
        jumpToFirstMissingRequiredField();
      } else {
        if (isMobile) {
          setShowSignatureModal(true);
        } else {
          signaturePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            desktopSignatureInputRef.current?.focus();
          }, 500);
        }
      }
      return;
    }
    const nextId = fillableFields[nextIndex].field_id;
    const focusedNow = focusFieldById(nextId);
    if (!focusedNow) {
      focusFieldByIdWithRetry(nextId, 8);
    }
  }

  function goToPreviousField() {
    if (!fillableFields.length) return;
    const currentIndex = fillableFields.findIndex((f) => String(f.field_id) === activeFieldId);
    if (currentIndex <= 0) return;
    const prevId = fillableFields[currentIndex - 1].field_id;
    const focusedNow = focusFieldById(prevId);
    if (!focusedNow) {
      focusFieldByIdWithRetry(prevId, 8);
    }
  }

  function handleStart() {
    setHasStarted(true);
  }

  function validateRequiredFields() {
    return getMissingRequiredFieldIds();
  }

  function renderOverlayFieldControl(field) {
    if (!isFieldVisibleToCandidate(field)) return null;
    const id = String(field.field_id || "");
    const key = String(field.field_key || "");
    const locked = isFieldLocked(field);
    const isActive = activeFieldId === id;
    const value = getDisplayValue(field, fieldValues);
    const placeholder = getFieldPlaceholder(field);
    const showBubble =
      activeFieldId === id &&
      field.field_type !== "checkbox" &&
      String(value || "").trim().length > 0;
    const signatureImageUrl =
      field?.config_json?.default_signature_image_data_url || "";

    if (field.field_type === "label") {
      return (
        <div className="terms-overlay-control terms-overlay-label">
          {field.label || ""}
        </div>
      );
    }

    if (locked) {
      if (field.field_type === "checkbox") {
        return (
          <div className="terms-overlay-control terms-overlay-readonly terms-overlay-checkbox-readonly">
            {value === true ? "✓" : ""}
          </div>
        );
      }
      if (field.field_type === "signature") {
        if (signatureImageUrl) {
          return (
            <div className="terms-overlay-control terms-overlay-signature-static">
              <img
                src={signatureImageUrl}
                alt="Stamp"
                className="terms-overlay-signature-image"
              />
            </div>
          );
        }
        return (
          <div className="terms-overlay-control terms-overlay-readonly terms-overlay-signature-static">
            {String(value || "Signed")}
          </div>
        );
      }
      return (
        <div className="terms-overlay-control terms-overlay-readonly">
          {String(value || "")}
        </div>
      );
    }

    if (field.field_type === "textarea") {
      return (
        <div className="terms-overlay-input-wrap">
          {showBubble ? (
            <div className="terms-overlay-placeholder-bubble">
              {placeholder}
            </div>
          ) : null}
          <textarea
            ref={(node) => {
              // Key by field_id so each field gets its own ref slot even when
              // two fields share the same field_key (duplicate auto-fill).
              if (node) inputRefMap.current.set(id, node);
              else inputRefMap.current.delete(id);
            }}
            value={fieldValues[key] || ""}
            onChange={(e) => setValue(key, e.target.value)}
            onFocus={() => setActiveFieldId(id)}
            placeholder={placeholder}
            className="terms-overlay-control terms-overlay-input terms-overlay-textarea"
          />
        </div>
      );
    }

    if (field.field_type === "checkbox") {
      return (
        <label className="terms-overlay-control terms-overlay-checkbox-wrap">
          <input
            ref={(node) => {
              if (node) inputRefMap.current.set(id, node);
              else inputRefMap.current.delete(id);
            }}
            type="checkbox"
            checked={Boolean(fieldValues[key])}
            onChange={(e) => setValue(key, e.target.checked)}
            onFocus={() => setActiveFieldId(id)}
          />
        </label>
      );
    }

    if (field.field_type === "date") {
      return (
        <div className="terms-overlay-input-wrap">
          {showBubble ? (
            <div className="terms-overlay-placeholder-bubble">
              {placeholder}
            </div>
          ) : null}
          <input
            ref={(node) => {
              if (node) inputRefMap.current.set(id, node);
              else inputRefMap.current.delete(id);
            }}
            type="date"
            value={fieldValues[key] || ""}
            onChange={(e) => setValue(key, e.target.value)}
            onFocus={() => setActiveFieldId(id)}
            className="terms-overlay-control terms-overlay-input"
          />
        </div>
      );
    }

    if (field.field_type === "signature") {
      return (
        <div className={`terms-overlay-control terms-overlay-signature ${isActive ? 'active' : ''}`}>
          Sign
        </div>
      );
    }

    return (
      <div className="terms-overlay-input-wrap">
        {showBubble ? (
          <div className="terms-overlay-placeholder-bubble">{placeholder}</div>
        ) : null}
        <input
          ref={(node) => {
            if (node) inputRefMap.current.set(id, node);
            else inputRefMap.current.delete(id);
          }}
          value={fieldValues[key] || ""}
          onChange={(e) => setValue(key, e.target.value)}
          onFocus={() => setActiveFieldId(id)}
          placeholder={placeholder}
          className="terms-overlay-control terms-overlay-input"
        />
      </div>
    );
  }

  function handleOpenSignatureModal() {
    const missing = validateRequiredFields();
    if (missing.length) {
      showToast("Please fill all required fields before signing.");
      jumpToFirstMissingRequiredField();
      setError(`Please fill all required fields: ${missing.join(", ")}`);
      return;
    }
    setShowSignatureModal(true);
  }

  async function handleSubmit() {
    if (!token || !invite || !template) return;
    setError("");
    setSuccess("");
    const missing = validateRequiredFields();
    if (missing.length) {
      showToast("Please fill all required fields before signing.");
      jumpToFirstMissingRequiredField();
      setError(`Please fill all required fields: ${missing.join(", ")}`);
      return;
    }
    if (
      requiresCandidateSignature &&
      signatureMode === "typed" &&
      !typedSignature.trim()
    ) {
      setError("Please enter your typed signature.");
      return;
    }
    if (
      requiresCandidateSignature &&
      (signatureMode === "drawn" || signatureMode === "uploaded") &&
      !signatureImage
    ) {
      setError("Please provide your signature image.");
      return;
    }

    const payloadValues = { ...fieldValues };
    let signatureImageDataUrl = "";
    if (requiresCandidateSignature && signatureMode === "typed") {
      const typedValue = typedSignature.trim();
      payloadValues.signature = typedValue;
      if (candidateSignatureFieldKeys.length) {
        candidateSignatureFieldKeys.forEach((key) => {
          payloadValues[key] = typedValue;
        });
      }
      signatureImageDataUrl = createTypedSignatureImageDataUrl(
        typedValue,
        typedFont,
      );
      if (!signatureImageDataUrl) {
        setError("Failed to render typed signature image. Please try again.");
        return;
      }
    } else if (requiresCandidateSignature) {
      signatureImageDataUrl = signatureImage;
    }

    setSubmitting(true);
    try {
      const response = await termsApi.submitInvite(token, {
        field_values: payloadValues,
        signature_mode: signatureMode,
        signature_image_data_url: signatureImageDataUrl,
      });
      const signedUrl = response.data?.signed_pdf_url || "";
      setShowSignatureModal(false);

      if (isJobScreeningFlow) {
        try {
          await checkAgreement();
        } catch (checkErr) {
          console.error("Failed to auto-verify job screening agreement status", checkErr);
        }
        setSuccess(
          "Signature completed successfully. Thank you. You will be redirected to Skillcase.",
        );
        setJustSubmitted(true);
        setAlreadySigned(true);
        if (signedUrl) {
          window.open(signedUrl, "_blank", "noopener,noreferrer");
        }
        return;
      }

      try {
        const detailsRes = await termsApi.getCandidateDetails(token);
        const candidateDetails = detailsRes.data?.details || {};
        const detailsFilled = candidateDetails?.candidate_details_filled === "yes";
        if (!detailsFilled) {
          if (candidateDetails.selfie_url) {
            setSelfieLocalUrl(candidateDetails.selfie_url);
          }
          setWizardData((prev) => {
            const next = { ...prev };
            next.student_name = detailsRes.data?.student_name || candidateDetails.student_name || "";
            next.student_phone = detailsRes.data?.student_phone || candidateDetails.student_phone || "";
            next.student_email = detailsRes.data?.student_email || candidateDetails.student_email || "";
            for (const key of Object.keys(next)) {
              if (key === "student_name" || key === "student_phone" || key === "student_email") continue;
              const val = candidateDetails[key];
              if (val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "-") {
                next[key] = String(val).trim();
              }
            }
            return next;
          });
          setWizardStep(1);
        } else {
          setSuccess(
            "Signature completed successfully. Thank you. You will be redirected to Skillcase.",
          );
          setJustSubmitted(true);
          setAlreadySigned(true);
          if (signedUrl) {
            window.open(signedUrl, "_blank", "noopener,noreferrer");
          }
        }
      } catch {
        // Not linked to any enrollment — normal success flow
        setSuccess(
          "Signature completed successfully. Thank you. You will be redirected to Skillcase.",
        );
        setJustSubmitted(true);
        setAlreadySigned(true);
        if (signedUrl) {
          window.open(signedUrl, "_blank", "noopener,noreferrer");
        }
      }

    } catch (requestError) {
      setError(
        requestError?.response?.data?.msg ||
          "Failed to submit signed document.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (activeFieldId) {
      const el = inputRefMap.current.get(activeFieldId);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeFieldId]);

  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFiles((prev) => ({ ...prev, [docType]: true }));
    setUploadError("");

    try {
      const response = await termsApi.createCandidateDocumentUploadUrl(token, {
        document_type: docType,
        file_name: file.name,
        content_type: file.type,
      });

      const { uploadUrl, key } = response.data;

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error(`S3 upload failed with status ${uploadRes.status}`);
      }

      setWizardData((prev) => ({
        ...prev,
        [`${docType}_gdrive_link`]: key,
      }));
    } catch (err) {
      console.error("Document upload failed:", err);
      setUploadError(`Failed to upload ${docType}. Please try again.`);
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [docType]: false }));
    }
  };

  const handleSaveDetails = async () => {
    setSubmitting(true);
    setError("");
    try {
      await termsApi.saveCandidateDetails(token, wizardData);
      setWizardStep(6);
    } catch (err) {
      console.error("Failed to save candidate details:", err);
      setError(err?.response?.data?.msg || "Failed to submit candidate details.");
    } finally {
      setSubmitting(false);
    }
  };

  const startCamera = async () => {
    try {
      setUploadError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      activeStreamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error(err);
      setUploadError("Could not access camera. Please check permissions.");
      setCameraActive(false);
    }
  };

  const uploadSelfieBlob = async (blob) => {
    setUploadingFiles((prev) => ({ ...prev, selfie: true }));
    setUploadError("");
    try {
      const response = await termsApi.createCandidateDocumentUploadUrl(token, {
        document_type: "selfie",
        file_name: "selfie.jpg",
        content_type: "image/jpeg",
      });
      const { uploadUrl, key } = response.data;
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "image/jpeg" },
      });
      if (!uploadRes.ok) throw new Error("S3 upload failed");
      setWizardData((prev) => ({
        ...prev,
        selfie_key: key,
      }));
      if (blob) {
        setSelfieLocalUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error("Selfie upload failed:", err);
      setUploadError("Failed to upload selfie. Please try again.");
    } finally {
      setUploadingFiles((prev) => ({ ...prev, selfie: false }));
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        uploadSelfieBlob(blob);
      }
      stopCamera();
    }, "image/jpeg");
  };

  const stopCamera = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleSelfieFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFiles((prev) => ({ ...prev, selfie: true }));
    setUploadError("");
    try {
      const response = await termsApi.createCandidateDocumentUploadUrl(token, {
        document_type: "selfie",
        file_name: file.name,
        content_type: file.type || "image/jpeg",
      });
      const { uploadUrl, key } = response.data;
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });
      if (!uploadRes.ok) throw new Error("S3 upload failed");
      setWizardData((prev) => ({
        ...prev,
        selfie_key: key,
      }));
      if (file) {
        setSelfieLocalUrl(URL.createObjectURL(file));
      }
    } catch (err) {
      console.error("Selfie upload failed:", err);
      setUploadError("Failed to upload selfie. Please try again.");
    } finally {
      setUploadingFiles((prev) => ({ ...prev, selfie: false }));
    }
  };

  useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const isStep1Valid = () => {
    return (
      wizardData.student_name?.trim() &&
      wizardData.student_phone?.trim() &&
      wizardData.student_email?.trim() &&
      wizardData.dob?.trim() &&
      wizardData.gender?.trim() &&
      wizardData.nationality?.trim()
    );
  };

  const isStep2Valid = () => {
    return (
      wizardData.current_location_city?.trim() &&
      wizardData.state?.trim() &&
      wizardData.educational_qualification?.trim() &&
      wizardData.year_of_passing?.trim()
    );
  };

  const isStep3Valid = () => {
    const pattern = wizardData.shift_pattern || "Daily Shift Pattern";
    if (pattern === "Daily Shift Pattern") {
      return Boolean(wizardData.daily_shift_timing?.trim());
    }
    if (pattern === "Rotating Shifts") {
      return Boolean(wizardData.first_shift_timing?.trim() && wizardData.second_shift_timing?.trim());
    }
    return false;
  };

  const isStep4Valid = () => true;
  const isStep5Valid = () => true;

  if (wizardStep > 0 && wizardStep < 6) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
        <div className="max-w-2xl w-full mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden flex-grow flex flex-col justify-between">
          <div className="bg-slate-900 px-6 py-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Candidate Onboarding</h2>
                <p className="text-xs text-slate-300 mt-0.5">Please complete your details to finalize your profile</p>
              </div>
              <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30 whitespace-nowrap flex-shrink-0">
                Step {wizardStep} of 5
              </span>
            </div>
            
            <div className="relative mt-6">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700 -translate-y-1/2"></div>
              <div 
                className="absolute top-1/2 left-0 h-0.5 bg-emerald-50 -translate-y-1/2 transition-all duration-300"
                style={{ width: `${((wizardStep - 1) / 4) * 100}%` }}
              ></div>
              
              <div className="relative flex justify-between">
                {[1, 2, 3, 4, 5].map((stepNum) => (
                  <div key={stepNum} className="flex flex-col items-center">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 ${
                        wizardStep >= stepNum
                          ? "bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/20"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}
                    >
                      {wizardStep > stepNum ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 flex-grow">
            {error && (
              <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
            
            {wizardStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 border-slate-100">Personal & Contact Details</h3>
                
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Full Name <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    value={wizardData.student_name}
                    onChange={(e) => setWizardData({...wizardData, student_name: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Phone Number <span className="text-rose-500">*</span></label>
                    <input 
                      type="tel" 
                      value={wizardData.student_phone}
                      onChange={(e) => setWizardData({...wizardData, student_phone: e.target.value.replace(/\D/g, "").slice(0, 10)})}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Alternate Phone Number (Optional)</label>
                    <input 
                      type="tel" 
                      value={wizardData.alternate_number}
                      onChange={(e) => setWizardData({...wizardData, alternate_number: e.target.value.replace(/\D/g, "").slice(0, 10)})}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      placeholder="Emergency or home phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Email Address <span className="text-rose-500">*</span></label>
                  <input 
                    type="email" 
                    value={wizardData.student_email}
                    onChange={(e) => setWizardData({...wizardData, student_email: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    placeholder="name@example.com"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Date of Birth <span className="text-rose-500">*</span></label>
                    <input 
                      type="date" 
                      value={wizardData.dob}
                      onChange={(e) => setWizardData({...wizardData, dob: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Gender <span className="text-rose-500">*</span></label>
                    <select 
                      value={wizardData.gender}
                      onChange={(e) => setWizardData({...wizardData, gender: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Nationality <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    value={wizardData.nationality}
                    onChange={(e) => setWizardData({...wizardData, nationality: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    placeholder="e.g. Indian"
                  />
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 border-slate-100">Location & Education</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Current Location (City) <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      value={wizardData.current_location_city}
                      onChange={(e) => setWizardData({...wizardData, current_location_city: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      placeholder="e.g. Bangalore"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">State <span className="text-rose-500">*</span></label>
                    <select 
                      value={wizardData.state}
                      onChange={(e) => setWizardData({...wizardData, state: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Educational Qualification <span className="text-rose-500">*</span></label>
                  <select 
                    value={wizardData.educational_qualification}
                    onChange={(e) => setWizardData({...wizardData, educational_qualification: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="">Select Qualification</option>
                    <option value="BSc Nursing">BSc Nursing</option>
                    <option value="MSc Nursing">MSc Nursing</option>
                    <option value="Post BSc Nursing">Post BSc Nursing</option>
                    <option value="GNM Nursing">GNM Nursing</option>
                    <option value="Phd Nursing">Phd Nursing</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Year of Passing <span className="text-rose-500">*</span></label>
                  <select 
                    value={wizardData.year_of_passing}
                    onChange={(e) => setWizardData({...wizardData, year_of_passing: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: 2035 - 1990 + 1 }, (_, i) => 1990 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 border-slate-100">Shift Timings & Preferences</h3>
                
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Shift Pattern <span className="text-rose-500">*</span></label>
                  <select 
                    value={wizardData.shift_pattern || "Daily Shift Pattern"}
                    onChange={(e) => setWizardData({...wizardData, shift_pattern: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="Daily Shift Pattern">Daily Shift Pattern (Fixed Hours)</option>
                    <option value="Rotating Shifts">Rotating Shifts (Multiple Timings)</option>
                  </select>
                </div>

                {(wizardData.shift_pattern || "Daily Shift Pattern") === "Daily Shift Pattern" ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Daily Shift Timing <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" 
                      value={wizardData.daily_shift_timing}
                      onChange={(e) => setWizardData({...wizardData, daily_shift_timing: e.target.value})}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      placeholder="e.g. 09:00 AM - 06:00 PM"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">First Shift Timing <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        value={wizardData.first_shift_timing}
                        onChange={(e) => setWizardData({...wizardData, first_shift_timing: e.target.value})}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                        placeholder="e.g. 06:00 AM - 02:00 PM"
                      />
                    </div>

                    {(wizardData.shift_pattern || "Daily Shift Pattern") === "Rotating Shifts" && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Second Shift Timing <span className="text-rose-500">*</span></label>
                          <input 
                            type="text" 
                            value={wizardData.second_shift_timing}
                            onChange={(e) => setWizardData({...wizardData, second_shift_timing: e.target.value})}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                            placeholder="e.g. 02:00 PM - 10:00 PM"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Third Shift Timing (Optional)</label>
                          <input 
                            type="text" 
                            value={wizardData.third_shift_timing}
                            onChange={(e) => setWizardData({...wizardData, third_shift_timing: e.target.value})}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                            placeholder="e.g. 10:00 PM - 06:00 AM"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 border-slate-100">Upload Documents</h3>
                
                {uploadError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {uploadError}
                  </div>
                )}

                {[
                  { type: "passport", label: "Passport (Page 1 & 2) (Optional)", linkKey: "passport_gdrive_link" },
                  { type: "degree", label: "Degree / Highest Qualification Certificate (Optional)", linkKey: "degree_certificate_gdrive_link" },
                  { type: "resume", label: "Updated CV / Resume (Optional)", linkKey: "updated_resume_gdrive_link" },
                ].map((doc) => {
                  const isUploaded = Boolean(wizardData[doc.linkKey]);
                  const isUploading = uploadingFiles[doc.type];

                  return (
                    <div key={doc.type} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <span className="block text-sm font-semibold text-slate-900">{doc.label}</span>
                          <span className="block text-xs text-slate-500 mt-0.5">PDF or Image up to 5MB</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {isUploaded && (
                            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                              </svg>
                              Uploaded
                            </div>
                          )}
                          
                          <label className={`relative flex items-center justify-center px-4 py-2 rounded-full border text-xs font-bold shadow-sm transition-colors cursor-pointer ${
                            isUploading
                              ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed"
                              : isUploaded
                                ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                : "bg-slate-900 border-slate-800 text-white hover:bg-slate-800"
                          }`}>
                            <input 
                              type="file" 
                              accept="image/*,application/pdf"
                              onChange={(e) => handleFileUpload(e, doc.type)}
                              disabled={isUploading}
                              className="hidden"
                            />
                            {isUploading ? (
                              <div className="flex items-center gap-1.5">
                                <svg className="animate-spin h-3.5 w-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Uploading...
                              </div>
                            ) : isUploaded ? (
                              "Change File"
                            ) : (
                              "Select File"
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {wizardStep === 5 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 border-slate-100">Add a Profile Picture</h3>
                  <p className="text-xs text-slate-500 mt-2">Take a clear photo or choose one from your gallery. Your photo helps us create a complete profile for future recruitment opportunities.</p>
                </div>

                {uploadError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {uploadError}
                  </div>
                )}

                <div className="flex flex-col items-center justify-center border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                  {cameraActive ? (
                    <div className="w-full max-w-sm flex flex-col items-center gap-4">
                      <div className="relative w-full aspect-square max-w-[240px] rounded-2xl overflow-hidden bg-black shadow-lg border-4 border-slate-900">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/15"
                        >
                          Take Photo
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-5 py-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-sm flex flex-col items-center gap-5">
                      <div className="relative w-full aspect-square max-w-[180px] rounded-full overflow-hidden bg-slate-100 shadow-inner border border-slate-200 flex items-center justify-center">
                        {selfieLocalUrl ? (
                          <img
                            src={selfieLocalUrl}
                            alt="Selfie Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                        )}
                        {uploadingFiles.selfie && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <svg className="animate-spin h-8 w-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 w-full">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="w-full py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          Take Photo
                        </button>

                        <div className="relative my-1">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                          <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">or upload file</span></div>
                        </div>

                        <label className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/60 text-slate-700 font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSelfieFileUpload}
                            disabled={uploadingFiles.selfie}
                            className="hidden"
                          />
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                          </svg>
                          Choose from Gallery
                        </label>

                        {selfieLocalUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelfieLocalUrl("");
                              setWizardData((prev) => ({ ...prev, selfie_key: "" }));
                            }}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline mt-1 text-center"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border-t border-slate-200/80 px-6 py-4 flex items-center justify-between gap-4">
            <button 
              type="button"
              onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
              className={`px-5 py-2.5 rounded-full text-sm font-bold border transition-colors ${
                wizardStep === 1
                  ? "border-transparent bg-transparent text-slate-300 cursor-not-allowed"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              disabled={wizardStep === 1}
            >
              Back
            </button>
            
            <button 
              type="button"
              onClick={() => {
                if (wizardStep < 5) {
                  setWizardStep(prev => prev + 1);
                } else {
                  handleSaveDetails();
                }
              }}
              disabled={
                submitting ||
                (wizardStep === 1 && !isStep1Valid()) ||
                (wizardStep === 2 && !isStep2Valid()) ||
                (wizardStep === 3 && !isStep3Valid()) ||
                (wizardStep === 4 && !isStep4Valid()) ||
                (wizardStep === 5 && !isStep5Valid())
              }
              className="px-6 py-2.5 rounded-full text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-opacity flex items-center gap-1.5 shadow-md shadow-emerald-600/10"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Submitting...
                </>
              ) : wizardStep === 5 ? (
                "Submit Details"
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (wizardStep === 6) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans antialiased text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center animate-scaleUp">
          <div className="w-16 h-16 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900">Submission Successful!</h2>
          <p className="mt-3 text-slate-600 text-sm leading-relaxed">
            Thank you! Your profile and documents have been successfully updated. We have completed all onboarding steps.
          </p>
          
          <button
            type="button"
            onClick={() => { window.location.href = "https://skillcase.in"; }}
            className="mt-8 w-full py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-md shadow-slate-900/10"
          >
            Go to Skillcase
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <p className="text-slate-600">Loading document...</p>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  if (justSubmitted) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
          <h2 className="text-xl font-bold text-emerald-900">
            Signature submitted successfully
          </h2>
          <p className="mt-2 text-sm text-emerald-800">
            Thank you. Your document has been signed and submitted.
          </p>
          {isJobScreeningFlow ? (
            <button
              onClick={() => navigate("/job-screening")}
              className="mt-6 px-8 py-3 bg-[#083262] text-white hover:bg-[#062446] rounded-full font-bold text-sm transition-all shadow-md active:scale-[0.99]"
            >
              Return to Job Screening
            </button>
          ) : (
            <p className="mt-3 text-xs text-emerald-700">
              Redirecting you to Skillcase...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
          <h2 className="text-xl font-bold text-emerald-900">
            Document already signed
          </h2>
          <p className="mt-2 text-sm text-emerald-800">
            This document has already been signed and submitted by you.
          </p>
          {isJobScreeningFlow ? (
            <button
              onClick={() => navigate("/job-screening")}
              className="mt-6 px-8 py-3 bg-[#083262] text-white hover:bg-[#062446] rounded-full font-bold text-sm transition-all shadow-md active:scale-[0.99]"
            >
              Return to Job Screening
            </button>
          ) : (
            <p className="mt-3 text-xs text-emerald-700">
              Redirecting you to Skillcase...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Mobile: Two-step flow
  if (isMobile) {
    return (
      <div className="min-h-screen bg-white p-4">
        {mobileStep === "document" ? (
          !hasStarted ? (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 text-center">
                  <h2 className="text-xl font-bold text-slate-900">{template?.title || "Document Signature"}</h2>
                  <p className="text-sm text-slate-500 mt-1">Please review and sign the document</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-500">Document</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">{template?.title}</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-500">Sender</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">Skillcase</span>
                  </div>
                  <div className="flex justify-between pb-3 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-500">Receiver</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">{invite?.recipient_name || invite?.recipient_email}</span>
                  </div>
                  <div className="flex justify-between pb-3">
                    <span className="text-sm font-medium text-slate-500">Date</span>
                    <span className="text-sm font-semibold text-slate-900 text-right">{new Date(invite?.sent_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <div
            ref={viewerRef}
            className="rounded-lg border border-slate-200 bg-white p-3 pb-[50vh]"
          >
            <Document
              file={template?.source_pdf_url || ""}
              loading={
                <div className="flex items-center justify-center p-6 text-sm text-slate-500">
                  <svg className="animate-spin h-5 w-5 mr-2 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Rendering PDF...
                </div>
              }
              onLoadSuccess={({ numPages }) => setDocPages(numPages)}
              onLoadError={(err) => {
                console.error("PDF load error:", err);
                setError(err.message || "Failed to load PDF document.");
              }}
              error={
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-700">
                  <p className="font-semibold text-base mb-1">Failed to load document</p>
                  <p className="text-xs text-rose-600">The link might have expired or there was a network connection error. Please refresh or contact support.</p>
                </div>
              }
            >
              {Array.from({ length: docPages || 1 }).map((_, idx) => {
                const pageNumber = idx + 1;
                const pageFields = (groupedFields.get(pageNumber) || []).filter(
                  (field) => isFieldVisibleToCandidate(field),
                );
                return (
                  <div key={pageNumber} className="mb-4">
                    <h2 className="mb-2 px-1 text-xs font-semibold text-slate-700">
                      Page {pageNumber}
                    </h2>
                    <div className="flex justify-center">
                      <div
                        className="terms-pdf-frame relative inline-block overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                        style={{ width: renderWidth }}
                      >
                          <Page
                          pageNumber={pageNumber}
                          width={renderWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          error={
                            <div className="text-xs text-rose-500 p-4 border border-rose-100 rounded-md">
                              Failed to render page {pageNumber}.
                            </div>
                          }
                        />
                        <div className="terms-overlay-layer">
                          {pageFields.map((field) => (
                            <div
                              key={field.field_id}
                              className={`terms-overlay-field ${activeFieldId === String(field.field_id) ? "active" : ""}`}
                              style={getFieldBoxStyle(field, true)}
                            >
                              {renderOverlayFieldControl(field)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Document>

          </div>
          )
        ) : null}

        <SignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSubmit={handleSubmit}
          signatureMode={signatureMode}
          setSignatureMode={handleSignatureModeChange}
          typedSignature={typedSignature}
          setTypedSignature={setTypedSignature}
          signatureImage={signatureImage}
          setSignatureImage={setSignatureImage}
          typedFont={typedFont}
          handleUploadSignature={handleUploadSignature}
          submitting={submitting}
        />

        {toastMessage ? (
          <div className="terms-toast">{toastMessage}</div>
        ) : null}

        <div className="terms-bottom-nav" style={nextButtonStyle}>
          {!hasStarted ? (
            <button onClick={handleStart} className="terms-bottom-nav-btn terms-bottom-nav-btn-primary w-full max-w-md mx-auto">
              Proceed to Document
            </button>
          ) : !activeFieldId ? (
            <button onClick={() => goToNextField()} className="terms-bottom-nav-btn terms-bottom-nav-btn-primary w-full max-w-md mx-auto">
              Start Document
            </button>
          ) : (
            <>
              <button
                onClick={goToPreviousField}
                className="terms-bottom-nav-btn terms-bottom-nav-btn-outline"
                disabled={fillableFields.findIndex((f) => String(f.field_id) === activeFieldId) <= 0}
              >
                Previous
              </button>
              <button
                onClick={handleBottomNavNextOrSign}
                className="terms-bottom-nav-btn terms-bottom-nav-btn-primary"
              >
                {getMissingRequiredFieldIds().length === 0 ? "Sign Document" : "Next"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Desktop: One-step flow
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">{template?.title}</h1>
        <p className="mt-2 text-slate-600">{template?.description}</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {!hasStarted ? (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 text-center">
              <h2 className="text-xl font-bold text-slate-900">{template?.title || "Document Signature"}</h2>
              <p className="text-sm text-slate-500 mt-1">Please review and sign the document</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between pb-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-500">Document</span>
                <span className="text-sm font-semibold text-slate-900 text-right">{template?.title}</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-500">Sender</span>
                <span className="text-sm font-semibold text-slate-900 text-right">Skillcase</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-500">Receiver</span>
                <span className="text-sm font-semibold text-slate-900 text-right">{invite?.recipient_name || invite?.recipient_email}</span>
              </div>
              <div className="flex justify-between pb-3">
                <span className="text-sm font-medium text-slate-500">Date</span>
                <span className="text-sm font-semibold text-slate-900 text-right">{new Date(invite?.sent_at || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] pb-[50vh]">
        {/* PDF Viewer + Fields */}
        <div
          ref={viewerRef}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <Document
            file={template?.source_pdf_url || ""}
            loading={
              <div className="flex items-center justify-center p-6 text-sm text-slate-500">
                <svg className="animate-spin h-5 w-5 mr-2 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Rendering PDF...
              </div>
            }
            onLoadSuccess={({ numPages }) => setDocPages(numPages)}
            onLoadError={(err) => {
              console.error("PDF load error:", err);
              setError(err.message || "Failed to load PDF document.");
            }}
            error={
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-700">
                <p className="font-semibold text-base mb-1">Failed to load document</p>
                <p className="text-xs text-rose-600">The link might have expired or there was a network connection error. Please refresh or contact support.</p>
              </div>
            }
          >
            {Array.from({ length: docPages || 1 }).map((_, idx) => {
              const pageNumber = idx + 1;
              const pageFields = (groupedFields.get(pageNumber) || []).filter(
                (field) => isFieldVisibleToCandidate(field),
              );
              return (
                <div key={pageNumber} className="mb-6">
                  <h2 className="mb-2 text-sm font-semibold text-slate-700">
                    Page {pageNumber}
                  </h2>
                  <div className="flex justify-center">
                    <div
                      className="terms-pdf-frame relative inline-block rounded-lg border border-slate-200 bg-slate-50"
                      style={{ width: renderWidth }}
                    >
                      <Page
                        pageNumber={pageNumber}
                        width={renderWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        error={
                          <div className="text-xs text-rose-500 p-4 border border-rose-100 rounded-md">
                            Failed to render page {pageNumber}.
                          </div>
                        }
                      />
                      <div className="terms-overlay-layer">
                        {pageFields.map((field) => (
                          <div
                            key={field.field_id}
                            className="terms-overlay-field"
                            style={getFieldBoxStyle(field, false)}
                          >
                            {renderOverlayFieldControl(field)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Document>
        </div>

        {/* Signature Panel */}
        <div
          ref={signaturePanelRef}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <h3 className="mb-4 font-semibold text-slate-900">Your Signature</h3>
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              {["typed", "drawn", "uploaded"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSignatureModeChange(mode)}
                  className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                    signatureMode === mode
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {mode === "typed"
                    ? "Type"
                    : mode === "drawn"
                      ? "Draw"
                      : "Upload"}
                </button>
              ))}
            </div>

            {signatureMode === "typed" ? (
              <div className="space-y-3">
                <input
                  ref={desktopSignatureInputRef}
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                  placeholder="Type your name"
                />
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Signature Preview
                  </p>
                  <div
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-2xl text-slate-900 min-h-[60px]"
                    style={{ fontFamily: typedFont }}
                  >
                    {typedSignature || ""}
                  </div>
                </div>
              </div>
            ) : null}

            {signatureMode === "drawn" ? (
              <SignaturePad onChange={setSignatureImage} />
            ) : null}

            {signatureMode === "uploaded" ? (
              <div className="space-y-2">
                <label className="block rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-sm text-slate-600 cursor-pointer hover:bg-slate-100">
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleUploadSignature}
                    className="hidden"
                  />
                  Click to upload signature
                </label>
                {signatureImage ? (
                  <img
                    src={signatureImage}
                    alt="Signature"
                    className="h-20 w-full rounded-md border border-slate-200 object-contain"
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          <button
            ref={signatureSubmitButtonRef}
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Submitting...
              </>
            ) : "Sign & Submit"}
          </button>
        </div>
      </div>
      )}

      {toastMessage ? <div className="terms-toast">{toastMessage}</div> : null}

        <div className="terms-bottom-nav" style={nextButtonStyle}>
          {!hasStarted ? (
            <button onClick={handleStart} className="terms-bottom-nav-btn terms-bottom-nav-btn-primary w-full max-w-md mx-auto">
              Proceed to Document
            </button>
          ) : !activeFieldId ? (
            <button onClick={() => goToNextField()} className="terms-bottom-nav-btn terms-bottom-nav-btn-primary w-full max-w-md mx-auto">
              Start Document
            </button>
          ) : (
            <>
              <button
                onClick={goToPreviousField}
                className="terms-bottom-nav-btn terms-bottom-nav-btn-outline"
                disabled={fillableFields.findIndex((f) => String(f.field_id) === activeFieldId) <= 0}
              >
                Previous
              </button>
              <button
                onClick={handleBottomNavNextOrSign}
                className="terms-bottom-nav-btn terms-bottom-nav-btn-primary"
              >
                {getMissingRequiredFieldIds().length === 0 ? "Sign Document" : "Next"}
              </button>
            </>
          )}
        </div>
    </div>
  );
}
